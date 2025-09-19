# 子查询

子查询也是SQL的常用操作，通常来说，子查询有四种情况：

1. 返回多行多列的表子查询，在`FROM`子句中作为表使用；
2. 返回一行多列的行子查询，在`WHERE`等处作为[表达式](./expr.md)使用；
3. 返回多行多列的子查询，但配合`EXISTS`、`ALL`、`ANY`等量词或`IN`等运算符，在[表达式](./expr.md)中使用；
4. 返回一行一列的标量子查询，在`SELECT`等处作为一个值使用。

sqala对以上四种子查询均进行了支持。

## 表子查询

一个投影到**命名元组**的查询，在sqala里可以作为子查询使用：

```scala
val q = query:
    from:
        from(User).map(u => (col1 = u.id, col2 = u.name))
```

表子查询必须投影到元组是因为，sqala会自动从命名元组中抽取信息，并为子查询生成字段，我们可以在后续子句中使用：

```scala
val q = query:
    from:
        from(User).map(u => (col1 = u.id, col2 = u.name))
    .filter: q =>
        // col1字段是sqala自动生成的，且类型安全
        q.col1 > 5
```

生成的SQL为：

```sql
SELECT
    "t2"."c1" AS "c1",
    "t2"."c2" AS "c2"
FROM
    (
        SELECT
            "t1"."id" AS "c1",
            "t1"."name" AS "c2"
        FROM
            "user" AS "t1"
    ) AS "t2"
WHERE
    "t2"."c1" > ?
```

sqala也会自动管理子查询的表别名和列别名，您无需为此浪费心神。

## 行子查询

行子查询作为表达式使用，要求在`map`中投影到[聚合函数](./expr-agg.md)，或调用`take(1)`来确保查询最多返回一行。

比如我们需要统计“点赞数比同频道帖子的平均点赞数更高的帖子”，则可以：

```scala
val q = query:
    from(Post).filter: p =>
        p.likeCount > 
            from(Post)
                .filter(pp => pp.channelId == p.channelId)
                .map(pp => avg(pp.likeCount))
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."title" AS "c2",
    "t1"."author_id" AS "c3",
    "t1"."channel_id" AS "c4",
    "t1"."create_time" AS "c5",
    "t1"."view_count" AS "c6",
    "t1"."like_count" AS "c7",
    "t1"."state" AS "c8"
FROM
    "post" AS "t1"
WHERE
    "t1"."like_count" > (
        SELECT
            AVG("t2"."like_count") AS "c1"
        FROM
            "post" AS "t2"
        WHERE
            "t2"."channel_id" = "t1"."channel_id"
    )
```

sqala支持多字段参与比较，因此，我们也可以方便地统计“点赞数和浏览量都比同频道帖子的平均点赞数和浏览数更高的帖子”，可以：

```scala
val q = query:
    from(Post).filter: p =>
        (p.likeCount, p.viewCount) > 
            from(Post)
                .filter(pp => pp.channelId == p.channelId)
                .map(pp => (avg(pp.likeCount), avg(pp.viewCount)))
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."title" AS "c2",
    "t1"."author_id" AS "c3",
    "t1"."channel_id" AS "c4",
    "t1"."create_time" AS "c5",
    "t1"."view_count" AS "c6",
    "t1"."like_count" AS "c7",
    "t1"."state" AS "c8"
FROM
    "post" AS "t1"
WHERE
    ("t1"."like_count", "t1"."view_count") > (
        SELECT
            AVG("t2"."like_count") AS "c1",
            AVG("t2"."view_count") AS "c2"
        FROM
            "post" AS "t2"
        WHERE
            "t2"."channel_id" = "t1"."channel_id"
    )
```

## 带量词的子查询

### EXISTS子查询

`EXISTS`子查询用于检测存在性，但不关心`EXISTS`中的实际数据，比如我们统计“同名的用户”：

```scala
val q = query:
    from(User).filter: u =>
        exists(from(User).filter(uu => uu.name == u.name))
    .map(u => u.name)
```

生成的SQL为：

```sql
SELECT
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
WHERE
    EXISTS(
        SELECT
            "t2"."id" AS "c1",
            "t2"."name" AS "c2"
        FROM
            "user" AS "t2"
        WHERE
            "t2"."name" = "t1"."name"
    )
```

### IN子查询

`IN`子查询用于查找子查询中数据包含外侧表对应字段数据的条目，比如我们统计“有评论的帖子”：

```scala
val q = query:
    from(Post).filter: p =>
        p.id = any(
            from(Comment).map(c => c.postId)
        )
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."title" AS "c2",
    "t1"."author_id" AS "c3",
    "t1"."channel_id" AS "c4",
    "t1"."create_time" AS "c5",
    "t1"."view_count" AS "c6",
    "t1"."like_count" AS "c7",
    "t1"."state" AS "c8"
FROM
    "post" AS "t1"
WHERE
    "t1"."id" IN (
        SELECT
            "t2"."post_id" AS "c1"
        FROM
            "comment" AS "t2"
    )
```

### ANY子查询

SQL中`ANY`或`SOME`子查询的语义为，只要子查询中的**存在任意一条**数据与外侧类匹配，则表示匹配成功，上面的`IN`子查询也可以写成：

```scala
val q = query:
    from(Post).filter: p =>
        p.id == any(
            from(Comment).map(c => c.postId)
        )
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."title" AS "c2",
    "t1"."author_id" AS "c3",
    "t1"."channel_id" AS "c4",
    "t1"."create_time" AS "c5",
    "t1"."view_count" AS "c6",
    "t1"."like_count" AS "c7",
    "t1"."state" AS "c8"
FROM
    "post" AS "t1"
WHERE
    "t1"."id" = ANY(
        SELECT
            "t2"."post_id" AS "c1"
        FROM
            "comment" AS "t2"
    )
```

### ALL子查询

SQL中`ALL`或`SOME`子查询的语义为，只要子查询中的**所有**数据都与外侧类匹配，才表示匹配成功，`<> ALL`与`NOT IN`子查询等价：

```scala
val q = query:
    from(Post).filter: p =>
        p.id <> all(
            from(Comment).map(c => c.postId)
        )
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."title" AS "c2",
    "t1"."author_id" AS "c3",
    "t1"."channel_id" AS "c4",
    "t1"."create_time" AS "c5",
    "t1"."view_count" AS "c6",
    "t1"."like_count" AS "c7",
    "t1"."state" AS "c8"
FROM
    "post" AS "t1"
WHERE
    "t1"."id" <> ALL(
        SELECT
            "t2"."post_id" AS "c1"
        FROM
            "comment" AS "t2"
    )
```

## 标量子查询

返回一行一列的子查询可以在`map`/`select`中使用，比如我们查询“一个用户的ID和他发的任意一个帖子标题”：

```scala
val q = query:
    from(User).map: u => 
        (
            u.id, 
            from(Post).filter(p => p.authorId == p.id).map(p => anyValue(p.title))
        )
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    (
        SELECT
            ANY_VALUE("t2"."title") AS "c1"
        FROM
            "post" AS "t2"
        WHERE
            "t2"."author_id" = "t2"."id"
    ) AS "c2"
FROM
    "user" AS "t1"
```