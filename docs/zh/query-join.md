# 关联表

在上一部分中，我们介绍了如何使用sqala构建单表查询，而表关联是关系型数据库不可或缺的功能，sqala也对关联查询进行了全面且深入的支持。

## 多表查询

sqala也像数据库一样，支持在`from`中传入多个表：

```scala
val q = query:
    from(Channel, Post, Comment)
        .filter((cl, p, ct) => cl.id == p.channelId && p.id == ct.postId)
        .take(10)
```

但会将多个表视为一个表元组，而不是动态参数列表，因此在`filter`等后续操作中我们可以保留安全的类型，并递归处理元组，生成`CROSS JOIN`表：

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
LIMIT ?
```

sqala会自动将参与查询的所有表的字段在`SELECT`中平铺，避免生成`SELECT *`。

这个查询返回的数据类型会自动推导成`List[(Channel, Post, Comment)]`，不管是`from`多表还是后文中介绍的所有关联操作，均不会产生诸如其他Scala查询库的`((Channel, Post), Comment)`嵌套元组返回类型，这是一个很重要的行为，可以极大简化后续操作，而这是使用Scala3的元组库的递归推导能力实现的平铺任意深度的表元组，是Scala2不具备的能力。

## 表连接

sqala支持如下的连接类型：

|方法名        |SQL                |
|:------------:|:------------------:|
|`join`        |`INNER JOIN`        |
|`leftJoin`    |`LEFT OUTER JOIN`   |
|`rightJoin`   |`RIGHT OUTER JOIN`  |
|`fullJoin`    |`FULL OUTER JOIN`   |
|`crossJoin`   |`CROSS JOIN`        |

以上方法除了`crossJoin`外均配合`on`方法，在`from`中使用。

两表连接：

```scala
val q = query:
    from:
        Channel.join(Post).on((c, p) => c.id == p.channelId)
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

三表连接：

```scala
val q = query:
    from:
        Channel
        .join(Post).on((c, p) => c.id == p.channelId)
        .join(Comment).on((_, p, c) => p.id == c.postId)
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

`on`方法中的参数会随着连接表数量增多而增多，但仍然会保持平铺，而不会产生嵌套结构。

## 表连接的类型推导

我们知道，数据库对于外连接的可空侧，比如`LEFT JOIN`的右侧表，会自动补空值，查询结果可能会产生在原本数据中不存在的空值，即使你的表中没有任何可空字段。

因此如果将外连接的情况，比如：

```scala
val q = query:
    from:
        Channel
        .leftJoin(Post).on((c, p) => c.id == p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id == c.postId)
```

还机械地推导为`List[(Channel, Post, Comment)]`类型，在连接数据库反序列化的时候将不再安全，sqala在这种情况下会智能地将返回类型推导为：

```scala
val q = query:
    from:
        Channel
        .leftJoin(Post).on((c, p) => c.id == p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id == c.postId)

// 返回类型为List[(Channel, Option[Post], Option[Comment])]
val result = db.fetch(q)
```

如果把第一个连接形式改为`rightJoin`，返回类型则自动推导为：

```scala
val q = query:
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id == p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id == c.postId)

// 返回类型为List[(Option[Channel], Post, Option[Comment])]
val result = db.fetch(q)
```

如果我们引用可空侧的字段，比如：

```scala
val q = query:
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id == p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id == c.postId)
    .map((_, _, c) => c.id)
```

即使原本实体类中`Comment`的`id`字段为`Int`，是一个非空字段，但sqala仍会聪明地将返回类型推导为：

```scala
val q = query:
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id == p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id == c.postId)
    .map((_, _, c) => c.id)

// 返回类型为List[Option[Int]]
val result = db.fetch(q)
```

但是如果原本字段本身就是`Option`可空字段，sqala也不会多此一举，产生诸如`Option[Option[T]]`的类型：

```scala
val q = query:
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id == p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id == c.postId)
    .map((_, _, c) => c.parentId)

// 返回类型仍然为List[Option[Int]]
val result = db.fetch(q)
```

sqala这样的推导策略在尽力简化返回类型的同时，保持类型安全性。您可以专注于业务逻辑，把类型安全交给sqala管理。

## 灵活的连接顺序

sqala跟SQL一样，支持灵活调整连接顺序，而不是只支持A先连接B再连接C这样的操作：

```scala
val q = query:
    from:
        Channel.join(
            Post.leftJoin(Comment).on((p, c) => p.id == c.postId)
        ).on((c, p, _) => c.id == p.channelId)
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

支持灵活的连接顺序归功于sqala底层使用树结构存储连接表，而不是线性列表结构。

## 横向表

`LATERAL`是SQL中一个强大的功能，其可以在`FROM`的表中引用前一个表的字段，为每行数据产生一个新的关联结果集，比如我们需要处理这样一个需求：“分别统计每个频道里点赞数前2的帖子，并汇总到一个列表中”，就可以使用`LATERAL`功能，sqala也为此类需求带来了开箱即用的工具：

```scala
val q = query:
    from:
        Channel.joinLateral(c => 
            from(Post)
                .filter(p => c.id == p.channelId)
                .sortBy(p => p.likeCount.desc)
                .map(p => (id = p.id, channelId = p.channelId, title = p.title))
                .take(2)
        ).on((c, p) => c.id == p.channelId)
```

这样的需求在传统ORM中，要么会生成`N + 1`的SQL语句，循环查询带来高IO开销，要么完全不支持这样的表达，退回到手写SQL。而使用sqala您可以轻松处理这样的复杂需求。

此例子中配合`joinLateral`使用了sqala的子查询功能，对于更多子查询的介绍请参考[子查询](./query-sub)部分。

sqala支持使用`joinLateral`和`leftJoinLateral`以及`crossJoinLateral`创建`LATERAL`表（由于数据库限制，不允许右外连接和全外连接使用`LATERAL`功能）。