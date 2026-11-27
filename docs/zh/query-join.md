# 关联表

在上一部分中，我们介绍了如何使用sqala构建单表查询。表关联是关系型数据库不可或缺的功能，sqala对关联查询也提供了全面且深入的支持。

## 多表查询

与数据库一样，sqala也支持在`from`中传入多个表：

```scala
val query =
    from(Channel, Post, Comment)
        .filter((cl, p, ct) => cl.id === p.channelId && p.id === ct.postId)
        .take(10)
```

但多个表会被视为一个表元组，而不是动态参数列表，因此在`filter`等后续操作中仍能保持类型安全；元组会被递归处理，最终生成`CROSS JOIN`表：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2",
    "t2"."id" AS "c3",
    "t2"."title" AS "c4",
    "t2"."author_id" AS "c5",
    "t2"."channel_id" AS "c6",
    "t2"."create_time" AS "c7",
    "t2"."view_count" AS "c8",
    "t2"."like_count" AS "c9",
    "t2"."state" AS "c10",
    "t3"."id" AS "c11",
    "t3"."post_id" AS "c12",
    "t3"."author_id" AS "c13",
    "t3"."content" AS "c14",
    "t3"."create_time" AS "c15",
    "t3"."parent_id" AS "c16",
    "t3"."like_count" AS "c17",
    "t3"."state" AS "c18"
FROM
    "channel" AS "t1"
    CROSS JOIN (
        "post" AS "t2"
        CROSS JOIN "comment" AS "t3"
    )
WHERE
    "t1"."id" = "t2"."channel_id" AND "t2"."id" = "t3"."post_id"
LIMIT 10
```

sqala会自动将参与查询的所有表的字段平铺在`SELECT`中，避免生成`SELECT *`。

该查询的返回类型会自动推导为`List[(Channel, Post, Comment)]`。无论是`from`多表，还是后文介绍的所有关联操作，都不会产生其他Scala查询库中`((Channel, Post), Comment)`式的嵌套元组返回类型。这是一个很重要的行为，可以极大简化后续操作；其实现依赖于Scala 3元组库的递归推导能力——可平铺任意深度的表元组，这是Scala 2不具备的能力。

## 表连接

sqala支持如下的连接类型：

|方法           |SQL                |
|:------------:|:------------------:|
|`join`        |`INNER JOIN`        |
|`leftJoin`    |`LEFT OUTER JOIN`   |
|`rightJoin`   |`RIGHT OUTER JOIN`  |
|`fullJoin`    |`FULL OUTER JOIN`   |
|`crossJoin`   |`CROSS JOIN`        |

除`crossJoin`外，以上方法均需配合`on`方法，在`from`中使用。

**需要注意的是，sqala的表连接方法并非大多数查询库采用的`from.join.on`形式，而是将`join`作为`from`的参数处理。这符合SQL标准语义，也能在子查询表、函数表等复杂情况下提供更统一的调用形式。**

两表连接形式为：

```scala
val query =
    from:
        Channel.join(Post).on((c, p) => c.id === p.channelId)
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2",
    "t2"."id" AS "c3",
    "t2"."title" AS "c4",
    "t2"."author_id" AS "c5",
    "t2"."channel_id" AS "c6",
    "t2"."create_time" AS "c7",
    "t2"."view_count" AS "c8",
    "t2"."like_count" AS "c9",
    "t2"."state" AS "c10"
FROM
    "channel" AS "t1"
    INNER JOIN "post" AS "t2" ON "t1"."id" = "t2"."channel_id"
```

三表连接形式为：

```scala
val query =
    from:
        Channel
        .join(Post).on((c, p) => c.id === p.channelId)
        .join(Comment).on((_, p, c) => p.id === c.postId)
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2",
    "t2"."id" AS "c3",
    "t2"."title" AS "c4",
    "t2"."author_id" AS "c5",
    "t2"."channel_id" AS "c6",
    "t2"."create_time" AS "c7",
    "t2"."view_count" AS "c8",
    "t2"."like_count" AS "c9",
    "t2"."state" AS "c10",
    "t3"."id" AS "c11",
    "t3"."post_id" AS "c12",
    "t3"."author_id" AS "c13",
    "t3"."content" AS "c14",
    "t3"."create_time" AS "c15",
    "t3"."parent_id" AS "c16",
    "t3"."like_count" AS "c17",
    "t3"."state" AS "c18"
FROM
    "channel" AS "t1"
    INNER JOIN "post" AS "t2" ON "t1"."id" = "t2"."channel_id"
    INNER JOIN "comment" AS "t3" ON "t2"."id" = "t3"."post_id"
```

`on`方法的参数会随连接表数量的增加而增加，但始终保持平铺，不会产生嵌套结构。

## 表连接的类型推导

对于外连接的可空侧（如`LEFT JOIN`的右侧表），数据库会自动补空值，因此查询结果可能出现原本数据中并不存在的空值，即使表中没有任何可空字段。

因此，若外连接的场景，比如：

```scala
val query =
    from:
        Channel
        .leftJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
```

仍机械地推导为`List[(Channel, Post, Comment)]`类型，则从数据库反序列化时将不再安全。这种情况下，sqala会将返回类型智能推导为：

```scala
val query =
    from:
        Channel
        .leftJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)

// 返回类型为List[(Channel, Option[Post], Option[Comment])]
val result = db.fetch(query)
```

如果把第一个连接形式改为`rightJoin`，返回类型则自动推导为：

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)

// 返回类型为List[(Option[Channel], Post, Option[Comment])]
val result = db.fetch(query)
```

如果我们引用可空侧的字段，比如：

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
    .map((_, _, c) => c.id)
```

即使实体类中`Comment`的`id`字段原本是非空的`Int`类型，sqala也会将返回类型智能推导为：

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
    .map((_, _, c) => c.id)

// 返回类型为List[Option[Int]]
val result = db.fetch(query)
```

但如果字段本身就是`Option`可空类型，sqala也不会多此一举，产生诸如`Option[Option[T]]`的类型：

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
    .map((_, _, c) => c.parentId)

// 返回类型仍然为List[Option[Int]]
val result = db.fetch(query)
```

sqala的推导策略在尽力简化返回类型的同时保持类型安全。您可以专注于业务逻辑，把类型安全交给sqala。

## 灵活的连接顺序

与SQL一样，sqala支持灵活调整连接顺序，而不局限于A先连接B、再连接C这样的操作：

```scala
val query =
    from:
        Channel.join(
            Post.leftJoin(Comment).on((p, c) => p.id === c.postId)
        ).on((c, p, _) => c.id === p.channelId)
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2",
    "t2"."id" AS "c3",
    "t2"."title" AS "c4",
    "t2"."author_id" AS "c5",
    "t2"."channel_id" AS "c6",
    "t2"."create_time" AS "c7",
    "t2"."view_count" AS "c8",
    "t2"."like_count" AS "c9",
    "t2"."state" AS "c10",
    "t3"."id" AS "c11",
    "t3"."post_id" AS "c12",
    "t3"."author_id" AS "c13",
    "t3"."content" AS "c14",
    "t3"."create_time" AS "c15",
    "t3"."parent_id" AS "c16",
    "t3"."like_count" AS "c17",
    "t3"."state" AS "c18"
FROM
    "channel" AS "t1"
    INNER JOIN (
        "post" AS "t2"
        LEFT OUTER JOIN "comment" AS "t3" ON "t2"."id" = "t3"."post_id"
    ) ON "t1"."id" = "t2"."channel_id"
```

返回类型推导为`List[(Channel, Post, Option[Comment])]`。

灵活的连接顺序得益于sqala底层使用树结构而非线性列表来存储连接表。

## 横向表

`LATERAL`是SQL中一个强大的功能：它可以在`FROM`的表中引用前一个表的字段，为每行数据产生一个新的关联结果集。例如处理这样一个需求——“分别取出每个频道里点赞数最高的前2个帖子，并汇总到一个列表中”——就可以使用`LATERAL`功能，sqala也为此类需求提供了开箱即用的工具：

```scala
val query =
    from:
        Channel.joinLateral(c =>
            from(Post)
                .filter(p => c.id === p.channelId)
                .map(p => (id = p.id, channelId = p.channelId, title = p.title))
                .sortBy(p => p.likeCount.desc)
                .take(2)
        ).on((c, p) => c.id === p.channelId)
```

这类需求在传统ORM中，要么生成`N + 1`条SQL语句，循环查询带来高IO开销，要么完全无法表达，只能退回手写SQL。而使用sqala可以轻松处理这类复杂需求。

此示例配合`joinLateral`使用了sqala的子查询功能，更多子查询的介绍请参考[子查询](./query-sub)。

sqala支持使用`joinLateral`、`leftJoinLateral`和`crossJoinLateral`创建`LATERAL`表（由于数据库限制，右外连接和全外连接不能使用`LATERAL`功能）。

各主流数据库最新版本的实测支持情况如下：

| 数据库类型 | LATERAL 支持 |
|------------|--------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
