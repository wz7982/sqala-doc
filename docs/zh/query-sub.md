# 子查询

子查询同样是SQL的常用操作。通常来说，子查询有四种情况：

1. 返回多行多列的表子查询，在`FROM`子句中作为表使用；
2. 返回一行多列的行子查询，在`WHERE`等处作为[表达式](./expr.md)使用；
3. 返回多行多列的子查询，但配合`EXISTS`、`ALL`、`ANY`等量词或`IN`等运算符，在[表达式](./expr.md)中使用；
4. 返回一行一列的标量子查询，在`SELECT`等处作为一个值使用。

sqala对以上四种子查询均进行了支持。

## 表子查询

一个投影到**命名元组**的查询，在sqala里可以作为子查询使用：

```scala
val query =
    from:
        from(User).map(u => (col1 = u.id, col2 = u.name))
```

表子查询之所以必须投影到命名元组，是因为sqala会自动从命名元组中抽取信息，为子查询生成字段，供后续子句使用：

```scala
val query =
    from:
        from(User).map(u => (col1 = u.id, col2 = u.name))
    .filter: query =>
        // col1字段是sqala自动生成的，且类型安全
        query.col1 > 5
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
    "t2"."c1" > 5
```

sqala也会自动管理子查询的表别名和列别名，您无需为此费心。

## 行子查询

行子查询作为表达式使用，要求在`map`中投影到[聚合函数](./expr-agg.md)，或调用`take(1)`（甚至`take(0)`，两者都会将行数推导收窄为单行）来确保查询最多返回一行。

例如，我们需要统计“点赞数比同频道帖子的平均点赞数更高的帖子”，则可以：

```scala
val query =
    from(Post).filter: p =>
        p.likeCount >
            from(Post)
                .filter(pp => pp.channelId === p.channelId)
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

sqala支持多个字段参与比较，因此也可以方便地统计“点赞数和浏览量都比同频道帖子的平均点赞数和浏览数更高的帖子”：

```scala
val query =
    from(Post).filter: p =>
        (p.likeCount, p.viewCount) >
            from(Post)
                .filter(pp => pp.channelId === p.channelId)
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

### 语义检查

作为表达式使用的子查询最多只能返回一行，否则会返回编译错误：

```scala
val query =
    // 编译错误：More than one row returned by a subquery used as an expression.
    from(Post).map(p => from(Post).map(pp => pp.likeCount))
```

子查询也不能被外层或兄弟作用域引用，必须定义在更深的作用域中：

```scala
val sub = from(Comment).map(c => c.id).take(1)

val query =
    // 编译错误：A subquery cannot be referenced from an outer or sibling scope; it must be defined in a deeper scope.
    from(Post).map(p => sub)
```

## 带量词的子查询

### EXISTS子查询

`EXISTS`子查询用于检测存在性，并不关心其中的实际数据，例如我们统计“同名的用户”：

```scala
val query =
    from(User).filter: u =>
        exists(from(User).filter(uu => uu.name === u.name && uu.id <> u.id))
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
            "t2"."name" = "t1"."name" AND "t2"."id" <> "t1"."id"
    )
```

### IN子查询

`IN`子查询用于查找外侧表字段值出现在子查询结果中的条目，例如我们统计“有评论的帖子”：

```scala
val query =
    from(Post).filter: p =>
        p.id.in(
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

SQL中`ANY`或`SOME`子查询的语义是：只要子查询中**存在任意一条**数据与外侧值匹配，即表示匹配成功。上面的`IN`子查询也可以写成：

```scala
val query =
    from(Post).filter: p =>
        p.id === any(
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

SQL中`ALL`子查询的语义是：只有子查询中的**所有**数据都与外侧值匹配，才表示匹配成功。`<> ALL`与`NOT IN`子查询等价：

```scala
val query =
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

### 兼容性

带量词的子查询在各主流数据库最新版本中的实测支持情况如下：

| 方法 | PostgreSQL | MySQL | Oracle |
| ------ | ------------ | ------- | -------- |
| `exists` | ✅ | ✅ | ✅ |
| `in` | ✅ | ✅ | ✅ |
| `any` | ✅ | ✅ | ✅ |
| `all` | ✅ | ✅ | ✅ |

## 标量子查询

返回一行一列的子查询可以在`map`中使用，例如我们查询“一个用户的ID和他发的任意一个帖子标题”：

```scala
val query =
    from(User).map: u =>
        (
            u.id,
            from(Post).filter(p => p.authorId === u.id).map(p => anyValue(p.title))
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
            "t2"."author_id" = "t1"."id"
    ) AS "c2"
FROM
    "user" AS "t1"
```
