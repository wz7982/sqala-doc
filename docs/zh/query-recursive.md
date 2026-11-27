# 递归查询

元数据部分的评论表实际存储的是树状数据，通过`id`字段和`parentId`字段建立关联。如果需要查询所有评论及其被引用的评论，传统ORM要么把全部数据载入内存，要么循环发出查询，二者都会增大IO开销。sqala则提供了类型安全且十分便捷的递归查询语法。

## 构建递归查询

sqala效仿Oracle数据库，使用`connectBy`方法创建递归查询，并会将其转换为标准SQL的`CTE`。

`connectBy`和`startWith`方法分别用于声明递归关联条件和初始条件：

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .map((c, level) => (id = c.id, parentId = c.parentId, content = c.content, level = level))
```

`connectBy`所传函数的第一个参数为当前层的表引用，第二个参数为递归层的表引用。

`map`的Lambda参数比普通查询多一个`level`，表示当前递归层级，从1开始计数；`level`无需手动计算，会随CTE自动递增。

生成的SQL为：

```sql
WITH RECURSIVE
"cte1"("c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9") AS (
    (
        SELECT
            "t1"."id" AS "c1",
            "t1"."post_id" AS "c2",
            "t1"."author_id" AS "c3",
            "t1"."content" AS "c4",
            "t1"."create_time" AS "c5",
            "t1"."parent_id" AS "c6",
            "t1"."like_count" AS "c7",
            "t1"."state" AS "c8",
            1 AS "c9"
        FROM
            "comment" AS "t1"
        WHERE
            "t1"."post_id" = 1 AND "t1"."parent_id" IS NULL
    )
    UNION ALL
    (
        SELECT
            "t1"."id" AS "c1",
            "t1"."post_id" AS "c2",
            "t1"."author_id" AS "c3",
            "t1"."content" AS "c4",
            "t1"."create_time" AS "c5",
            "t1"."parent_id" AS "c6",
            "t1"."like_count" AS "c7",
            "t1"."state" AS "c8",
            "t2"."c9" + 1 AS "c9"
        FROM
            "comment" AS "t1"
            INNER JOIN "cte1" AS "t2" ON "t1"."parent_id" = "t2"."c1"
        WHERE
            "t1"."post_id" = 1
    )
)
SELECT
    "t3"."c1" AS "c1",
    "t3"."c6" AS "c2",
    "t3"."c4" AS "c3",
    "t3"."c9" AS "c4"
FROM
    "cte1" AS "t3"
```

`maxDepth`方法用于声明递归查询的最大层级，超出该层级即停止递归：

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .maxDepth(5)
        .map((c, level) => (id = c.id, parentId = c.parentId, content = c.content, level = level))
```

如需自定义递归CTE中携带的字段（例如在递归过程中透传根节点的字段），可以使用`preMap`：其第一个参数是初始行的投影，第二个参数是递归行的投影；递归投影的Lambda参数依次为当前行、上一层行和当前层级：

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .preMap(
            c => (id = c.id, content = c.content, rootId = c.id)
        )(
            (c, prior, level) => (id = c.id, content = c.content, rootId = prior.rootId)
        )
        .map((c, level) => (id = c.id, content = c.content, rootId = c.rootId, level = level))
```

## 排序和分页

递归查询同样支持`sortBy`，其Lambda参数比普通查询多一个`level`：第一个参数是递归CTE的行，第二个参数是当前层级，因此可以同时按层级与其他字段排序：

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .map((c, level) => (id = c.id, content = c.content, level = level))
        .sortBy((c, level) => (level.asc, c.id.desc))
```

生成的SQL会在CTE之后的最终查询中追加`ORDER BY`：

```sql
SELECT
    "t3"."c1" AS "c1",
    "t3"."c4" AS "c2",
    "t3"."c5" AS "c3"
FROM
    "cte1" AS "t3"
ORDER BY
    "t3"."c5" ASC,
    "t3"."c1" DESC
```

`drop`和`take`用于对递归查询的最终结果分页，无论是否先调用`sortBy`均可使用。它们作用于CTE之后的最终查询，不会影响递归过程：

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .map((c, level) => (id = c.id, content = c.content, level = level))
        .sortBy((c, level) => (level.asc, c.id.desc))
        .drop(10)
        .take(5)
```

生成的SQL为：

```sql
SELECT
    "t3"."c1" AS "c1",
    "t3"."c4" AS "c2",
    "t3"."c5" AS "c3"
FROM
    "cte1" AS "t3"
ORDER BY
    "t3"."c5" ASC,
    "t3"."c1" DESC
LIMIT 5 OFFSET 10
```

## 兼容性

递归CTE在各大主流数据库最新版本中的实测支持情况如下：

| 数据库类型 | CTE 支持 |
|------------|----------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
