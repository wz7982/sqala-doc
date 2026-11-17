# Function Tables

> The features on this page belong to the `sqala-static-ext` module, which requires an additional dependency. Import:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


sqala supports the function table feature of SQL (currently only PostgreSQL supports standard function table operations), letting you use the result of a function call as a table.

## UNNEST

`unnest` corresponds to the SQL standard function table `UNNEST`, which flattens an array field so it can be used as a table. We use the field `x` for subsequent operations:

```scala
val query =
    from(unnest(Array(1, 2, 3))).filter(t => t.x > 1)
```

The generated SQL is:

```sql
SELECT
    "t1"."x" AS "c1"
FROM
    UNNEST(ARRAY[1, 2, 3]) "t1"("x")
WHERE
    "t1"."x" > 1
```

`unnestWithOrdinal` adds an ordinal number after expanding the array; use the `ordinal` field for subsequent operations on the ordinal:

```scala
val query =
    from(unnestWithOrdinal(Array(1, 2, 3))).filter(t => t.ordinal > 1)
```

The generated SQL is:

```sql
SELECT
    "t1"."x" AS "c1",
    "t1"."ordinal" AS "c2"
FROM
    UNNEST(ARRAY[1, 2, 3]) WITH ORDINALITY AS "t1"("x", "ordinal")
WHERE
    "t1"."ordinal" > 1
```

We can use the `joinLateral` feature to reference an array field of the left-hand table:

```scala
case class Entity(arr: Array[Int])

val query =
    from:
        Entity.crossJoinLateral(e => unnest(e.arr))
```

The generated SQL is:

```sql
SELECT
    "t1"."arr" AS "c1",
    "t2"."x" AS "c2"
FROM
    "entity" AS "t1"
    CROSS JOIN LATERAL UNNEST("t1"."arr") AS "t2"("x")
```

## Custom Function Tables

Apart from the `unnest` function table from the SQL standard, sqala has no built-in function tables, but it supports custom ones. Let us use PostgreSQL's `generate_series` to generate a series as an example.

First, create a receiving structure:

```scala
case class GenerateSeries(x: Int)
```

Then create the function table:

```scala
def generateSeries[L <: Int](start: Int, end: Int)(using QueryContext[L]) =
    createTableFunc[GenerateSeries](
        "generate_series",
        start.asExpr :: end.asExpr :: Nil,
        false
    )
```

The first parameter is the function name, the second parameter is the argument list, and the third parameter indicates whether an ordinal is needed.

Then we can use it in a query:

```scala
val query =
    from(generateSeries(1, 10)).filter(t => t.x > 1)
```

The generated SQL is:

```sql
SELECT
    "t1"."x" AS "c1"
FROM
    generate_series(1, 10) AS "t1"("x")
WHERE
    "t1"."x" > 1
```
