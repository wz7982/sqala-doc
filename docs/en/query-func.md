# Function Tables

> The features on this page belong to the `sqala-static-ext` module, which must be added as an extra dependency. Import the following:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


sqala supports SQL function tables (currently, only PostgreSQL supports standard function table operations), letting you use the result of a function call as a table.

## UNNEST

`unnest` corresponds to the SQL-standard function table `UNNEST`, which flattens an array field so that it can be used as a table. Use the field `x` in subsequent operations:

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

`unnestWithOrdinal` adds an ordinal column after expanding the array; use the `ordinal` field in subsequent operations:

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

With the `crossJoinLateral` feature, we can reference an array field from the left-hand table:

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

Apart from the SQL-standard `unnest` function table, sqala has no built-in function tables but supports custom ones. The following example uses PostgreSQL's `generate_series`.

First, create a structure to receive the result:

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

The first parameter is the function name, the second is the argument list, and the third indicates whether an ordinal is needed.

The function table can then be used in a query:

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
