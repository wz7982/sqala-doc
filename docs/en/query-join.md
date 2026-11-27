# Joining Tables

In the previous part, we introduced how to build single-table queries with sqala. Table joins are an indispensable feature of relational databases, and sqala provides comprehensive and in-depth support for join queries.

## Multi-Table Queries

Like a database, sqala also supports passing multiple tables in `from`:

```scala
val query =
    from(Channel, Post, Comment)
        .filter((cl, p, ct) => cl.id === p.channelId && p.id === ct.postId)
        .take(10)
```

However, it treats the multiple tables as a tuple of tables rather than a dynamic parameter list. This allows subsequent operations such as `filter` to retain type safety, and the tuple is processed recursively to generate a `CROSS JOIN` table:

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

sqala automatically flattens the fields of all tables involved in the query into the `SELECT` clause, avoiding generating `SELECT *`.

The data type returned by this query is automatically inferred as `List[(Channel, Post, Comment)]`. Neither a multi-table `from` nor any of the join operations described later produces nested tuple return types such as the `((Channel, Post), Comment)` found in other Scala query libraries. This is an important behavior that greatly simplifies subsequent operations. It is achieved through the recursive inference of the Scala 3 tuple library, which flattens table tuples of arbitrary depth — a capability Scala 2 does not have.

## Table Joins

sqala supports the following join types:

|Method           |SQL                |
|:------------:|:------------------:|
|`join`        |`INNER JOIN`        |
|`leftJoin`    |`LEFT OUTER JOIN`   |
|`rightJoin`   |`RIGHT OUTER JOIN`  |
|`fullJoin`    |`FULL OUTER JOIN`   |
|`crossJoin`   |`CROSS JOIN`        |

All the methods above except `crossJoin` are used together with the `on` method inside `from`.

**Note that sqala's table join methods do not use the `from.join.on` form adopted by most query libraries. Instead, `join` is handled as a parameter of `from`. This conforms to SQL standard semantics and provides a more uniform calling form in complex cases such as subquery tables and function tables.**

The two-table join form is:

```scala
val query =
    from:
        Channel.join(Post).on((c, p) => c.id === p.channelId)
```

The generated SQL is:

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

The three-table join form is:

```scala
val query =
    from:
        Channel
        .join(Post).on((c, p) => c.id === p.channelId)
        .join(Comment).on((_, p, c) => p.id === c.postId)
```

The generated SQL is:

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

The parameters of the `on` method increase as the number of joined tables grows, but they remain flat and never produce a nested structure.

## Type Inference for Table Joins

For the nullable side of an outer join, such as the right-hand table of a `LEFT JOIN`, the database automatically fills in null values. The query result may therefore contain nulls that do not exist in the original data, even if your table has no nullable fields at all.

Therefore, if the outer join case, for example:

```scala
val query =
    from:
        Channel
        .leftJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
```

were still mechanically inferred as `List[(Channel, Post, Comment)]`, deserializing the results from the database would no longer be safe. In such cases, sqala intelligently infers the return type as:

```scala
val query =
    from:
        Channel
        .leftJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)

// Return type is List[(Channel, Option[Post], Option[Comment])]
val result = db.fetch(query)
```

If we change the first join form to `rightJoin`, the return type is automatically inferred as:

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)

// Return type is List[(Option[Channel], Post, Option[Comment])]
val result = db.fetch(query)
```

If we reference a field on the nullable side, for example:

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
    .map((_, _, c) => c.id)
```

Even though the `id` field of `Comment` in the entity class is `Int`, a non-nullable field, sqala still intelligently infers the return type as:

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
    .map((_, _, c) => c.id)

// Return type is List[Option[Int]]
val result = db.fetch(query)
```

However, if the field itself is already a nullable `Option` field, sqala does nothing superfluous; it never produces types such as `Option[Option[T]]`:

```scala
val query =
    from:
        Channel
        .rightJoin(Post).on((c, p) => c.id === p.channelId)
        .leftJoin(Comment).on((_, p, c) => p.id === c.postId)
    .map((_, _, c) => c.parentId)

// Return type is still List[Option[Int]]
val result = db.fetch(query)
```

This inference strategy simplifies return types as much as possible while maintaining type safety. You can focus on business logic and leave type safety to sqala.

## Flexible Join Order

Like SQL, sqala supports flexibly adjusting the join order, instead of only allowing A to join B and then C:

```scala
val query =
    from:
        Channel.join(
            Post.leftJoin(Comment).on((p, c) => p.id === c.postId)
        ).on((c, p, _) => c.id === p.channelId)
```

The generated SQL is:

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

The return type is inferred as `List[(Channel, Post, Option[Comment])]`.

Flexible join order is possible because sqala stores joined tables in a tree structure rather than a linear list.

## Lateral Tables

`LATERAL` is a powerful SQL feature that allows a table in `FROM` to reference fields of a preceding table and produce a new related result set for each row. For example, to handle the requirement "get the top 2 posts by like count in each channel and aggregate them into a single list", we can use `LATERAL`, and sqala provides an out-of-the-box tool for such requirements:

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

In traditional ORMs, such a requirement either generates `N + 1` SQL statements, causing high I/O overhead from loop queries, or is not supported at all, forcing you back to hand-written SQL. With sqala, you can easily handle such complex requirements.

This example uses sqala's subquery feature together with `joinLateral`. For more information about subqueries, see the [Subqueries](./query-sub) section.

sqala supports creating `LATERAL` tables with `joinLateral`, `leftJoinLateral`, and `crossJoinLateral` (due to database limitations, right outer joins and full outer joins cannot use the `LATERAL` feature).

The measured support of the latest versions of major databases is as follows:

| Database | LATERAL Support |
|------------|--------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
