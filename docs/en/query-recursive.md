# Recursive Queries

The comment table in the metadata section actually stores tree-shaped data, with the `id` field associated with the `parentId` field. If we need to query all comments along with the comments they reference, a traditional ORM would either load all data into memory or issue queries in a loop, both of which increase IO overhead. sqala instead supports a type-safe and very convenient recursive query syntax.

## Building Recursive Queries

Following the example of the Oracle database, sqala uses the `connectBy` method to create recursive queries, but converts them into the standard SQL `CTE` feature.

The `connectBy` and `startWith` methods declare the recursive association condition and the initial condition:

```scala
val postId = 1

val query =
    from(Comment)
        .filter(c => c.postId === postId)
        .connectBy((c, prior) => c.parentId === prior.id)
        .startWith(c => c.parentId.isEmpty)
        .map((c, level) => (id = c.id, parentId = c.parentId, content = c.content, level = level))
```

The first parameter of the function passed to `connectBy` is the table reference of the current level, and the second parameter is the table reference of the recursive level.

The lambda of `map` takes one more parameter than an ordinary query: `level`, which represents the current recursion level and starts counting from 1. `level` does not need to be computed manually; it increments automatically with the CTE.

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

The `maxDepth` method declares the maximum level of a recursive query; recursion stops beyond that level:

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

If you need to customize the fields carried in the recursive CTE (for example, to pass a root node's field through the recursion), you can use `preMap`. Its first parameter is the projection of the initial row, and its second parameter is the projection of the recursive row. The lambda parameters of the recursive projection are, in order, the current row, the previous-level row, and the current level:

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

Recursive queries also support `sortBy`, whose lambda takes one more parameter than an ordinary query: `level`. The first parameter is a row of the recursive CTE and the second is the current level, so you can sort by level and other fields at the same time:

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

`drop` and `take` paginate the final result of a recursive query and can be used whether or not `sortBy` was called first. They act on the final query after the CTE and do not affect the recursive process:

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

The measured support for recursive CTEs in the latest versions of mainstream databases is as follows:

| Database | CTE Support |
|------------|----------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
| SQLServer | ✅ |
| SQLite | ✅ |
