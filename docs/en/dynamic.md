# Dynamic Query

Previously introduced queries are more inclined to be determined at compile time, where sqala can provide type safety and automatic deserialization capabilities. However, in certain applications (such as user-customizable reporting systems), the queries to be executed cannot be known in advance at compile time. We may not even know what tables exist in the database or what fields are in the tables at compile time. To address such scenarios, sqala provides a set of dynamic query DSLs.

First, add the dependency:

```scala
libraryDependencies += "com.wz7982" % "sqala-dynamic_3" % "latest.integration"
```

The dynamic query DSL requires `import sqala.dynamic.dsl.*`.

We use the `asTable` method to create a table and incorporate it into the query:

```scala
import import sqala.dynamic.dsl.*

val department = asTable[Department]

val q = select (department.id, department.name) from department where department.id == 1
```

We can also use the `table` and `column` methods to dynamically create tables and fields that are not known at compile time and incorporate them into the query:

```scala
import import sqala.dynamic.dsl.*

val q = select (List(column("a"), column("b"))) from table("t") where column("a") == 1
```

sqala's dynamic queries can not only fill in simple strings, but we can also pass in an SQL fragment. The `unsafeExpr` method will enable an SQL parser and convert it into an SQL syntax tree:

```scala
val q = select (List(unsafeExpr("a"), unsafeExpr("b"))) from table("t") where unsafeExpr("a = 1") && unsafeExpr("b") == 1
```

**As the name suggests, the `unsafeExpr` method is unsafe and may pose SQL injection risks. Please use it with caution!**

Next, let's delve into the details of sqala's dynamic query constructors.

## SELECT

Use the `select` method to create a `SELECT` statement:

```scala
val s = select(List(column("a"), column("b") as "column"))
```

Chaining `select` calls will sequentially concatenate them when generating SQL.

Suppose we have a list of fields obtained at runtime that need to be included in the query, we can write it like this:

```scala
// Assume the list is obtained at runtime
val columnList: List[String] = List("a", "b")

val s = select(columnList.map(column(_)))
```

## FROM

Use the `from` method with `table` to generate the `FROM` clause:

```scala
val s = select (column("a"), column("b")) from table("t")
```

## WHERE

Use the `where` method to generate the `WHERE` clause:

```scala
val s = select (column("a"), column("b")) from table("t") where column("a") == 1
```

Suppose we have a list of values determined at runtime, and we need to use `OR` to concatenate them in the query, we can write it like this:

```scala
// Assume the list is obtained at runtime
val values = List("x", "y", "z")
val condition = values.map(v => column("a") == v).reduce((x, y) => x || y)
val s = select (column("a")) from table("t") where condition
```

The generated SQL will look like:

```sql
SELECT a FROM t WHERE a = 'x' OR a = 'y' OR a = 'z'
```

Chaining `where` calls will concatenate conditions using `AND`.

## JOIN

Use `join`, `leftJoin`, `rightJoin`, `fullJoin` with the `on` method to generate a `JOIN` table, and then include it in `from`:

```scala
val t = table("a") join table("b") on column("a.x") == column("b.y")
val s = select (column("*")) from t
```

## GROUP BY

Use the `groupBy` method to generate the `GROUP BY` clause:

```scala
val s = select (List(column("a"), sum(column("b")))) from table("t") groupBy List(column("a"))
```

Chaining `groupBy` calls will sequentially concatenate them.

Use the `having` method to generate the `HAVING` clause:

```scala
val s = select (List(column("a"), sum(column("b")))) from table("t") groupBy List(column("a")) having sum(column("b")) > 1
```

## ORDER BY

Use the `orderBy` method to generate the `GROUP BY` clause, used in conjunction with the `asc` and `desc` methods of expressions:

```scala
val s = select (List(column("a"), column("b"))) from table("t") orderBy List(column("a").asc, column("b").desc)
```

Chaining `orderBy` calls will sequentially concatenate them.

## LIMIT

Use the `limit` and `offset` methods to create the `LIMIT` clause:

```scala
val s = select (List(column("a"), column("b"))) from table("t") limit 10 offset 10
```

The generated SQL will vary according to the database dialect.

## UNION

Use `union`, `unionAll`, `except`, `exceptAll`, `intersect`, `intersectAll` methods to generate set queries:

```scala
val s1 = select (column("a")) from table("t1")
val s2 = select (column("b")) from table("t2")
val s = s1 union s2
```

## Subqueries

Subqueries can appear as part of expressions, for example:

```scala
val subQuery = select (max(column("a"))) from table("t")

val s = select (List(column("a"))) from table("t") where column("a") < subQuery
```

Additionally, subquery-related predicates such as `IN`, `ANY`, `SOME`, `ALL`, `EXISTS` are also supported.

For subqueries in `FROM`, we need to use the `as` method to alias the fields and the query, and then reference them again:

```scala
val subQuery = select (List(column("x"), column("y"))) from table("t1") as "q1"

val q = select (List(column("q1.x"), column("q1.y"))) from subQuery
```

## Expressions

The expressions in the dynamic query constructor mostly have similar usage to the [expressions](./expr) part of static queries, and you can refer to the explanations there. The difference lies in the usage of `CASE` expressions, which are designed to facilitate the dynamic construction of `CASE` at runtime:

```scala
val caseExpr = `case`(List(column("a") == 1 -> 1, column("a") == 2 -> 2), 0)
```

To maintain ease of use in highly dynamic query construction scenarios, the expressions in dynamic queries do not adopt a strictly type-safe design.

## Generating SQL

After creating the query, if we want to send it to JDBC for processing, we also need to obtain the generated SQL. We can use the `sql` method in conjunction with `Dialect` from `sqala.printer` to generate SQL:

```scala
import sqala.printer.Dialect

val s = select (List(column("a"), column("b"))) from table("t")
val sql: (String, Array[Any]) = s.sql(MySqlDialect)
```

The `sql` method returns a tuple, where the first item is the generated SQL statement, and the second parameter is the parameters within it.