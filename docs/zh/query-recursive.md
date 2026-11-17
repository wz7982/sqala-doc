# 递归查询

在元数据部分的评论表中，实际上存的是一个树状数据，`id`字段和`parentId`字段关联，如果我们需要查询出所有评论和它引用的评论，在传统ORM中，要么把所有数据查入到内存中，要么循环发出查询，都会增大IO开销，而sqala则支持类型安全且十分方便的递归查询语法。

## 构建递归查询

sqala效仿Oracle数据库，使用`connectBy`方法创建递归查询，但会将其转换为标准SQL的`CTE`功能。

`connectBy`和`startWith`方法用于声明递归关联条件和初始条件：

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .map((c, level) => (id = c.id, parentId = c.parentId, content = c.content, level = level))
```

`connectBy`中传递的函数的第一个参数是当前层的表引用，第二个参数是递归层的表引用。

`map`的Lambda参数比普通查询多一个`level`参数，表示当前递归层级，从1开始计数；`level`不需要手动计算，会随CTE自动递增。

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

`maxDepth`方法用于声明递归查询的最大层级，超出层级则停止递归：

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

如果需要自定义递归CTE中携带的字段（例如在递归过程中透传根节点的字段），可以使用`preMap`，它的第一个参数是初始行的投影，第二个参数是递归行的投影，递归投影的Lambda参数依次是当前行、上一层行和当前层级：

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

## 兼容性

递归CTE各主流数据库最新版本实测支持程度如下：

| 数据库类型 | CTE 支持 |
|------------|----------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
| SQLServer | ✅ |
| SQLite | ✅ |
