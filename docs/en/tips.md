# Query Construction Techniques

## Query Reuse

Since sqala uses Scala code to manage query construction, it is easy to encapsulate common parts of several queries:

```scala
def baseQuery =
    from[Employee]
        .join[Department]((e, d) => e.departmentId == d.id)
```

This way, the base query can be reused multiple times to build other queries:

```scala
val q1 =
    baseQuery.filter((e, d) => e.name == "Dave")

val q2 =
    baseQuery.sortBy((e, d) => d.name)
```

However, if the shared part of the query is used as a subquery, the above code might produce incorrect query semantics. In such cases, we need to use `using QueryContext` when encapsulating the query:

```scala
def baseQuery(using QueryContext) =
    from[Employee]
```

And the actual query needs to be constructed within the `queryContext` method:

```scala
val q1 = queryContext:
    baseQuery.filter(e => e.name == "Dave")

val q2 = queryContext:
    baseQuery.filter(e => e.name == baseQuery.filter(ee => e.id == 1).map(ee => ee.name))
```

In future versions, Scala 3's new feature `Capture Checking` might be utilized to enforce checks on whether queries are built within the same context. However, **currently, it is important not to omit `using QueryContext` when writing reusable subqueries to prevent generating incorrect SQL**.

## Conditional Construction

In addition to the basic `filterIf` for constructing optional filtering conditions, sqala also supports more flexible conditional construction queries, such as grouping by different fields based on different conditions:

```scala
case class Data(dim1: Int, dim2: Int, dim3: Int, measure: Int)

val dim: Int = ???

val baseQuery = from[Data]

val q = if dim == 1 then
    baseQuery.groupBy(d => d.dim1).map(d => (d.dim3, sum(d.measure)))
else if dim == 2 then
    baseQuery.groupBy(d => d.dim2).map(d => (d.dim3, sum(d.measure)))
else
    baseQuery.groupBy(d => d.dim3).map(d => (d.dim3, sum(d.measure)))
```

## Improving Subquery Readability

Within the same `queryContext`, we can store independently executable subqueries in variables, avoiding the need to nest subqueries as in standard SQL, thereby improving readability:

```scala
val q = queryContext:
    val salaryAvg = from[Employee].map(e => avg(e.salary))

    from[Employee].filter(e => e.salary > salaryAvg)
```