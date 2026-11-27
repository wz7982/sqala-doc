# Recursive Queries

The comment table in the metadata section actually stores tree-shaped data, linked through the `id` and `parentId` fields. To query all comments together with the comments they reference, a traditional ORM would either load all the data into memory or issue queries in a loop, both of which increase IO overhead. sqala, on the other hand, provides a type-safe and highly convenient recursive query syntax.

## Building Recursive Queries

Following the example of the Oracle database, sqala uses the `connectBy` method to create recursive queries, then converts them into standard SQL `CTE`s.

The `connectBy` and `startWith` methods declare the recursive join condition and the initial condition, respectively:

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .map((c, level) => (id = c.id, parentId = c.parentId, content = c.content, level = level))
```

The first parameter of the function passed to `connectBy` is the table reference for the current level; the second parameter is the table reference for the recursive level.

The lambda of `map` takes one extra parameter compared with an ordinary query: `level`, which represents the current recursion level and starts counting from 1. You do not need to compute `level` manually; it increments automatically with the CTE.

The generated SQL is:

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

The `maxDepth` method sets the maximum level of a recursive query; recursion stops once that level is exceeded:

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

To customize the fields carried by the recursive CTE (for example, to pass a root node's field through the recursion), use `preMap`. Its first parameter is the projection of the initial row, and its second is the projection of the recursive row; the lambda parameters of the recursive projection are, in order, the current row, the previous-level row, and the current level:

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

## Sorting and Pagination

Recursive queries also support `sortBy`, whose lambda takes one extra parameter compared with an ordinary query: `level`. The first parameter is a row of the recursive CTE and the second is the current level, so you can sort by level and other fields simultaneously:

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

The generated SQL appends `ORDER BY` to the final query after the CTE:

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

`drop` and `take` paginate the final result of a recursive query, with or without a preceding `sortBy`. They apply to the final query after the CTE and do not affect the recursion itself:

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

The generated SQL is:

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

## Compatibility

Tested support for recursive CTEs in the latest versions of mainstream databases is as follows:

| Database | CTE Support |
|------------|----------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
