# Subqueries

Subqueries are also a common SQL operation. Generally, there are four kinds of subqueries:

1. A table subquery returning multiple rows and multiple columns, used as a table in the `FROM` clause;
2. A row subquery returning one row and multiple columns, used as an [expression](./expr.md) in `WHERE` and other places;
3. A subquery returning multiple rows and multiple columns, but used in an [expression](./expr.md) together with quantifiers such as `EXISTS`, `ALL`, and `ANY` or operators such as `IN`;
4. A scalar subquery returning one row and one column, used as a value in `SELECT` and other places.

sqala supports all four kinds of subqueries.

## Table Subqueries

A query that projects to a **named tuple** can be used as a subquery in sqala:

```scala
val query =
    from:
        from(User).map(u => (col1 = u.id, col2 = u.name))
```

A table subquery must project to a named tuple because sqala automatically extracts information from it and generates fields for the subquery, which you can then use in subsequent clauses:

```scala
val query =
    from:
        from(User).map(u => (col1 = u.id, col2 = u.name))
    .filter: query =>
        // The col1 field is generated automatically by sqala and is type-safe
        query.col1 > 5
```

The generated SQL is:

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

sqala also manages the table aliases and column aliases of subqueries automatically, so you don't need to worry about them.

## Row Subqueries

A row subquery is used as an expression: it must project to an [aggregate function](./expr-agg.md) in `map`, or call `take(1)` (or even `take(0)`; both narrow the inferred row count to a single row) to ensure that the query returns at most one row.

For example, to find "posts with more likes than the average like count of posts in the same channel", we can write:

```scala
val query =
    from(Post).filter: p =>
        p.likeCount >
            from(Post)
                .filter(pp => pp.channelId === p.channelId)
                .map(pp => avg(pp.likeCount))
```

The generated SQL is:

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

sqala supports comparisons involving multiple fields, so we can also conveniently find "posts whose like count and view count are both higher than the average like count and view count of posts in the same channel":

```scala
val query =
    from(Post).filter: p =>
        (p.likeCount, p.viewCount) >
            from(Post)
                .filter(pp => pp.channelId === p.channelId)
                .map(pp => (avg(pp.likeCount), avg(pp.viewCount)))
```

The generated SQL is:

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

### Semantic Checks

A subquery used as an expression can return at most one row; otherwise it produces a compile error:

```scala
val query =
    // Compile error: More than one row returned by a subquery used as an expression.
    from(Post).map(p => from(Post).map(pp => pp.likeCount))
```

A subquery also cannot be referenced from an outer or sibling scope; it must be defined in a deeper scope:

```scala
val sub = from(Comment).map(c => c.id).take(1)

val query =
    // Compile error: A subquery cannot be referenced from an outer or sibling scope; it must be defined in a deeper scope.
    from(Post).map(p => sub)
```

## Subqueries with Quantifiers

### EXISTS Subqueries

An `EXISTS` subquery tests existence and does not care about the actual data inside it. For example, to find "users with the same name":

```scala
val query =
    from(User).filter: u =>
        exists(from(User).filter(uu => uu.name === u.name && uu.id <> u.id))
    .map(u => u.name)
```

The generated SQL is:

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

### IN Subqueries

An `IN` subquery finds entries whose corresponding field value appears in the subquery's result. For example, to find "posts that have comments":

```scala
val query =
    from(Post).filter: p =>
        p.id.in(
            from(Comment).map(c => c.postId)
        )
```

The generated SQL is:

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

### ANY Subqueries

In SQL, the semantics of an `ANY` or `SOME` subquery is that the match succeeds as long as **any row** in the subquery matches the outer value. The `IN` subquery above can also be written as:

```scala
val query =
    from(Post).filter: p =>
        p.id === any(
            from(Comment).map(c => c.postId)
        )
```

The generated SQL is:

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

### ALL Subqueries

In SQL, the semantics of an `ALL` subquery is that the match succeeds only when **all rows** in the subquery match the outer value. `<> ALL` is equivalent to a `NOT IN` subquery:

```scala
val query =
    from(Post).filter: p =>
        p.id <> all(
            from(Comment).map(c => c.postId)
        )
```

The generated SQL is:

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

### Compatibility

The measured support for subqueries with quantifiers in the latest versions of mainstream databases is as follows:

| Method | PostgreSQL | MySQL | Oracle |
| ------ | ------------ | ------- | -------- |
| `exists` | ✅ | ✅ | ✅ |
| `in` | ✅ | ✅ | ✅ |
| `any` | ✅ | ✅ | ✅ |
| `all` | ✅ | ✅ | ✅ |

## Scalar Subqueries

A subquery returning one row and one column can be used in `map`. For example, to query "a user's ID and the title of any one of their posts":

```scala
val query =
    from(User).map: u =>
        (
            u.id,
            from(Post).filter(p => p.authorId === u.id).map(p => anyValue(p.title))
        )
```

The generated SQL is:

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
