# 递归查询

在元数据部分的评论表中，实际上存的是一个树状数据，`id`字段和`parentId`字段关联，如果我们需要查询出所有评论和它引用的评论，在传统ORM中，要么把所有数据查入到内存中，要么循环发出查询，都会增大IO开销，而sqala则支持类型安全且十分方便的递归查询语法。

## 构建递归查询

sqala效仿Oracle数据库，使用`connectBy`方法创建递归查询，但会将其转换为标准SQL的`CTE`功能。

`connectBy`和`startWith`方法用于声明递归关联条件和初始条件：

```scala
val postId = 1

val q = query:
    from(Comment)
        .filter(c => c.postId == postId)
        .connectBy((c, prior) => c.parentId == prior.id)
        .startWith(c => c.parentId.isNull)
        .map(c => (id = c.id, parentId = c.parentId, content = c.content))
```

`connectBy`中传递的函数的第一个参数是当前层的表引用，第二个参数是递归层的表引用。

生成的SQL为：

```sql
WITH RECURSIVE
"__cte__"("id", "post_id", "author_id", "content", "create_time", "parent_id", "like_count", "state", "__pseudo__level__") AS (
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
            1 AS "__pseudo__level__"
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
            "__cte__"."__pseudo__level__" + 1 AS "__pseudo__level__"
        FROM
            "comment" AS "t1"
            INNER JOIN "__cte__" ON "t1"."parent_id" = "__cte__"."id"
        WHERE
            "t1"."post_id" = 1
    )
)
SELECT
    "__cte__"."id" AS "c1",
    "__cte__"."parent_id" AS "c2",
    "__cte__"."content" AS "c3"
FROM
    "__cte__"
```

`level`方法用于获取递归产生的相对层级，从1开始计数：

```scala
val postId = 1

val q = query:
    from(Comment)
        .filter(c => c.postId == postId)
        .connectBy((c, prior) => c.parentId == prior.id)
        .startWith(c => c.parentId.isNull)
        .map(c => (id = c.id, parentId = c.parentId, content = c.content, level = level()))
```

`sortBy`/`orderBy`和`sortSiblingsBy`/`orderSiblingsBy`分别用于处理总排序，和单独处理每一层数据的排序：

```scala
val postId = 1

val q = query:
    from(Comment)
        .filter(c => c.postId == postId)
        .connectBy((c, prior) => c.parentId == prior.id)
        .startWith(c => c.parentId.isNull)
        .sortSiblingsBy(c => c.content)
        .map(c => (id = c.id, parentId = c.parentId, content = c.content, level = level()))
```

`maxDepth`方法用于声明递归查询的最大层级，超出层级则停止递归：

```scala
val postId = 1

val q = query:
    from(Comment)
        .filter(c => c.postId == postId)
        .connectBy((c, prior) => c.parentId == prior.id)
        .startWith(c => c.parentId.isNull)
        .sortSiblingsBy(c => c.content)
        .maxDepth(5)
        .map(c => (id = c.id, parentId = c.parentId, content = c.content, level = level()))
```

## 更通用的递归查询

上面的例子中，使用`connectBy`方法处理简单的递归查询需求，可读性极强，但也有一些限制：比如我们无法为查询起始条件设置一些初始值；无法在最终查询中查出父级引用的字段信息；无法为多表查询创建递归查询等。

为此，sqala提供了一个更通用但相对来说比较晦涩的递归查询方法，如果你的递归查询需求使用`connectBy`就能解决，那可以尽量不使用此部分介绍的递归查询。

`withRecursive`方法用于创建一个递归查询，其需要一个初始查询作为参数，然后需要两个函数，一个是声明查询的递归部分（sqala将会使用`UNION ALL`将初始查询和其连接），一个是声明最终的查询：

```scala
val q = query:
    withRecursive(
        from(Comment)
            .filter(c => c.parentId.isNull)
            .map: c => 
                (
                    id = c.id, 
                    content = c.content, 
                    parentId = Option.empty[Int], 
                    parentContent = Option.empty[String],
                    level = 1
                )
    )(t =>
        from(Comment join t on ((c, prior) => c.parentId == prior.id))
            .map: (c, prior) =>
                (
                    id = c.id, 
                    content = c.content, 
                    parentId = prior.id, 
                    parentContent = prior.content,
                    level = prior.level + 1
                )
    )(t =>
        from(t).map: cte =>
            (
                id = cte.id, 
                content = cte.content, 
                parentId = cte.parentId, 
                parentContent = cte.parentContent,
                level = cte.level
            )
    )
```

生成的SQL为：

```sql
WITH RECURSIVE
"__cte__"("c1", "c2", "c3", "c4", "c5") AS (
    (
        SELECT
            "t1"."id" AS "c1",
            "t1"."content" AS "c2",
            CAST(NULL AS INTEGER) AS "c3",
            CAST(NULL AS VARCHAR) AS "c4",
            1 AS "c5"
        FROM
            "comment" AS "t1"
        WHERE
            "t1"."parent_id" IS NULL
    )
    UNION ALL
    (
        SELECT
            "t3"."id" AS "c1",
            "t3"."content" AS "c2",
            "t2"."c1" AS "c3",
            "t2"."c2" AS "c4",
            "t2"."c5" + 1 AS "c5"
        FROM
            "comment" AS "t3"
            INNER JOIN "__cte__" AS "t2" ON "t3"."parent_id" = "t2"."c1"
    )
)
SELECT
    "__cte__"."c1" AS "c1",
    "__cte__"."c2" AS "c2",
    "__cte__"."c3" AS "c3",
    "__cte__"."c4" AS "c4",
    "__cte__"."c5" AS "c5"
FROM
    "__cte__" AS "__cte__"
```