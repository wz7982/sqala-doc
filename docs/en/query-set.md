# Set Operations

Set operations are also common in SQL, and sqala provides built-in support for them.

## Union

In SQL, `UNION` and `UNION ALL` represent union operations. The former removes duplicates from the union of the two queries, equivalent to `UNION DISTINCT`, while the latter keeps all rows. In sqala, use the `union` and `unionAll` methods to combine two queries:

```scala
val q1 = from(User).filter(u => u.id === 1).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id === 2).map(u => (id = u.id, name = u.name))

val query = q1.unionAll(q2)
```

The generated SQL is:

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" = 1
)
UNION ALL
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" = 2
)
```

## Type Inference for Set Operations

sqala reconciles the types of the two queries participating in a set operation as much as possible. The two queries must have exactly the same number of fields, but their return types do not need to be identical; they only need to be type-compatible.

Suppose the row type of the first query is `(Option[Int], String, Long)`,

and the row type of the second query is `(Double, Option[String], Option[Int])`,

then the return type is inferred as `List[(Option[Double], Option[String], Option[Long])]`.

While pursuing type safety, sqala also strives for convenience as much as possible.

If the first query returns a named tuple and the second query returns a tuple, the result is inferred as a named tuple. The field names of the named tuple come from the first query, while the return type is inferred from both queries together.

## Intersect

In SQL, `INTERSECT` and `INTERSECT ALL` represent intersection operations. In sqala, use the `intersect` and `intersectAll` methods to combine two queries:

```scala
val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))

val query = q1.intersectAll(q2)
```

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" >= 5
)
INTERSECT ALL
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" <= 10
)
```

## Except

In SQL, `EXCEPT` and `EXCEPT ALL` represent difference operations. In sqala, use the `except` and `exceptAll` methods to combine two queries:

```scala
val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))

val query = q1.exceptAll(q2)
```

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" >= 5
)
EXCEPT ALL
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" <= 10
)
```

## Sorting and Pagination

Queries produced by set operations also support `sortBy`, `drop`, and `take`. They act on the overall result of the set operation, not on any individual subquery:

```scala
val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))

val query =
    q1.union(q2)
        .sortBy(c => (c.name.asc, c.id.desc))
        .drop(10)
        .take(5)
```

The generated SQL is:

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" >= 5
)
UNION
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" <= 10
)
ORDER BY
    "c2" ASC,
    "c1" DESC
LIMIT 5 OFFSET 10
```

The lambda parameter of `sortBy` has the return type of the set operation result, so you can use the projected field names directly. The generated `ORDER BY` references the aliases of the output columns of the set operation, while `drop` and `take` generate the corresponding pagination clauses for the dialect (the example shows PostgreSQL's `LIMIT` and `OFFSET`).

After `sortBy`, a set query can also call `takeWithTies` to generate a `FETCH n ROWS WITH TIES` clause; its dialect restrictions are the same as described in the [query DSL](./query.md) (MySQL does not support it).

## Compatibility

The measured support for set operations in the latest versions of mainstream databases is as follows:

| Method | PostgreSQL | MySQL | Oracle |
| ------ | ------------ | ------- | -------- |
| `union` | ✅ | ✅ | ✅ |
| `unionAll` | ✅ | ✅ | ✅ |
| `intersect` | ✅ | ✅ | ✅ |
| `intersectAll` | ✅ | ✅ | ✅ |
| `except` | ✅ | ✅ | ✅ |
| `exceptAll` | ✅ | ✅ | ✅ |
