# Expressions

To better use sqala for handling business, it is better to have some understanding of sqala's expressions.

sqala includes an SQL expression type `Expr`, and the sub-items of `Expr` also accept parameters of type `Expr`, thus sqala has powerful expression composition capabilities.

## Fields

Fields are one of the most basic expressions. The fields we use in query construction are field expressions:

```scala
// id is a field-type expression
val q =
    from[Department].filter(d => d.id > 1)
```

## Values

Besides fields, value expressions are also the most basic expressions. For example, sometimes we may need a constant value as a column in the result:

```scala
val q =
    from[Department].map(d => (id = d.id, c1 = 1, c2 = "a"))
```

We can also use `asExpr` to convert a value to an SQL expression:

```scala
val q =
    from[Department].map(d => (id = d.id, c1 = 1.asExpr, c2 = "a".asExpr))
```

## Conversion Expressions

In most cases, sqala treats values (such as Int, String, etc.), expressions (Expr type), subqueries (Query type), and tuples composed of them as expressions (handled by `trait AsExpr`). However, in some places that are not specially optimized, such as certain SQL functions, when using parameters that are not of type `Expr`, you need to use the `asExpr` method to convert them to expressions:

```scala
val q =
    from[Department].map(d => (id = d.id, c1 = floor(1.asExpr)))
```

## Logical and Relational Operations

Besides fields and values, the most commonly used in constructing queries are logical and relational operation expressions, which are often used in the `filter`, `on`, and `having` methods of query expressions.

sqala supports the following symbolic operators:

| Operator Name | Corresponding SQL Operator |
|:-------------:|:--------------------------:|
| `==`          | `=`                        |
| `!=`          | `<>`                       |
| `>`           | `>`                        |
| `>=`          | `>=`                       |
| `<`           | `<`                        |
| `<=`          | `<=`                       |
| `&&`          | `AND`                      |
| `\|\|`        | `OR`                       |

For example:

```scala
val id = 1
val name = "Dave"
val q =
    from[Department].filter(d => d.id > id && d.name == name)
```

When the right side of `==` or `!=` is `None`, it corresponds to SQL's `IS NULL` and `IS NOT NULL`:

```scala
// a.x IS NULL
val q1 =
    from[A].filter(a => a.x == None)

// a.x IS NOT NULL
val q2 =
    from[A].filter(a => a.x != None)
```

To make `!=` consistent with the semantics of programming languages, sqala performs semantic optimization:

```scala
// a.x <> 1 OR a.x IS NULL
val q =
    from[A].filter(a => a.x != 1)
```

The right side of the operator can not only be a regular value but also another expression, such as being placed in an `ON` condition:

```scala
val q =
    from[A].join[B].on((a, b) => a.id == b.id)
```

Value expressions can also easily be placed on the left side of a binary operation, but `==` needs to be replaced with `===`, and `!=` needs to be replaced with `<>`:

```scala
val q =
    from[Department].filter(d => 1 === d.id)
```

Or use `asExpr` to explicitly convert a value to an expression:

```scala
val q =
    from[Department].filter(d => 1.asExpr == d.id)
```

In addition to these symbolic operators, sqala also supports some non-symbolic operators:

| Operator Name    | Corresponding SQL Operator |
|:----------------:|:--------------------------:|
| `in`             | `IN`                       |
| `between`        | `BETWEEN`                  |
| `like`           | `LIKE`                     |
| `contains`       | `LIKE '%xxx%'`             |
| `startsWith`     | `LIKE 'xxx%'`              |
| `endsWith`       | `LIKE '%xxx'`              |

```scala
val ids = List(1, 2, 3)
val q =
    from[Department].filter(d => d.id.in(ids) && d.name.like("小%"))
```

When an empty list is passed to the `in` operation, to avoid generating incorrect SQL, this predicate will be optimized to `FALSE`.

The `in` operation can also accept a tuple of expressions of the corresponding type, rather than a list of values:

```scala
val q =
    from[Department].filter(d => d.id.in(d.id, d.id + 1, 1))
```

Use `!` to create a unary logical operation:

```scala
val q =
    from[Department].filter(d => !(d.id == 1))
```

Using the logical operator `!` on `in`, `between`, `like` and other operators will generate the corresponding `NOT IN`, `NOT BETWEEN`, `NOT LIKE` operators, rather than a unary operation.

## Multi-column Comparison

sqala also allows multiple columns to participate in relational operations simultaneously. Similar to value expressions written on the left side of a comparison, `==` needs to be replaced with `===`, and `!=` needs to be replaced with `<>`:

```scala
val q1 =
    from[Department].filter: d =>
        (d.id, d.name) === (1, "Dave")

val q2 =
    from[Department].filter: d =>
        (d.id, d.name).in(List((1, "Dave"), (2, "Ben")))

val q3 =
    from[Department].filter: d =>
        (d.id, d.name).in(from[Department].map(d => (d.id, d.name)))
```

Or use `.asExpr` to convert a tuple of expressions into a single expression:

```scala
val q1 =
    from[Department].filter: d =>
        (d.id, d.name).asExpr == (1, "Dave")

val q2 =
    from[Department].filter: d =>
        (d.id, d.name).asExpr.in(List((1, "Dave"), (2, "Ben")))

val q3 =
    from[Department].filter: d =>
        (d.id, d.name).asExpr.in(from[Department].map(d => (d.id, d.name)))
```

## Numerical Operations

sqala supports the following numerical operators:

| Operator Name | Corresponding SQL Operator |
|:-------------:|:--------------------------:|
| `+`           | `+`                        |
| `-`           | `-`                        |
| `*`           | `*`                        |
| `/`           | `/`                        |
| `%`           | `%`                        |

```scala
val q =
    from[Department].filter(d => d.id + 1 > 5).map(_.id * 100)
```

And unary operations `+` and `-`:

```scala
val q =
    from[Department].map(d => -d.id)
```

## Functions

sqala has built-in some commonly used functions:

| Function Name | Corresponding SQL Function |
|:-------------:|:--------------------------:|
|`coalesce`     |`COALESCE`                  |
|`ifNull`       |`COALESCE`                  |
|`nullIf`       |`NULLIF`                    |
|`abs`          |`ABS`                       |
|`ceil`         |`CEIL`                      |
|`floor`        |`FLOOR`                     |
|`round`        |`ROUND`                     |
|`power`        |`POWER`                     |
|`concat`       |`CONCAT`                    |
|`substring`    |`SUBSTRING`                 |
|`replace`      |`REPLACE`                   |
|`trim`         |`TRIM`                      |
|`upper`        |`UPPER`                     |
|`lower`        |`LOWER`                     |
|`now`          |`NOW`                       |

Due to the significant differences in functions across various databases, sqala does not have built-in other SQL functions, but we can use `Expr.Func` to create functions.

Let's take MySQL's `LEFT` function as an example:

```scala
def left(x: Expr[String], n: Int): Expr[String] =
    Expr.Func("LEFT", x :: n.asExpr :: Nil)
```

Now, we can use `left` function to build queries:

```scala
val q =
    from[Department].map(d => left(d.name, 2))
```

Function-type expressions can also be nested:

```scala
val q =
    from[Department].map(d => left(left(d.name, 2), 1))
```

To allow the semantic analyzer `analysisContext` to recognize SQL functions, we can add the `sqlFunction` annotation to custom functions:

```scala
import sqala.metadata.sqlFunction

@sqlFunction
def left(x: Expr[String], n: Int): Expr[String] =
    Expr.Func("LEFT", x :: n.asExpr :: Nil)
```

If it's an aggregate function, add the `sqlAgg` annotation, and for window functions, add the `sqlWindow` annotation.

## Aggregate Functions

sqala has built-in several commonly used SQL standard aggregate functions:

| Function Name          | Corresponding SQL Function |
|:----------------------:|:--------------------------:|
| `count()`              | `COUNT(*)`                 |
| `count(expr)`          | `COUNT(x)`                 |
| `sum(expr)`            | `SUM(x)`                   |
| `max(expr)`            | `MAX(x)`                   |
| `min(expr)`            | `MIN(x)`                   |
| `avg(expr)`            | `AVG(x)`                   |
| `anyValue(expr)`       | `ANY_VALUE(x)`             |

```scala
val q =
    from[Department].map(d => (c = count(), s = sum(d.id)))
```

Aggregate functions can also be combined with other expressions:

```scala
val q =
    from[Department].map(d => (c = count() + sum(d.id * 100)))
```

### Special Aggregate Functions

#### percentileDisc and percentileCont

sqala supports two special numerical aggregate functions `percentileDisc` and `percentileCont`, corresponding to the database's `PERCENTILE_DIST` and `PERCENTILE_CONT` functions.

Usage is as follows:

```scala
val q =
    from[Department]
        .map: d =>
            percentileDisc(0.5, withinGroup = d.id.asc)
```

The first parameter accepts a `Double` value;

The second parameter `withinGroup` accepts a sorting rule, and the sorting field must be of a numerical type.

**MySQL, SQLite do not currently support this function.**

#### stringAgg

sqala supports special string aggregate functions `stringAgg`, `groupConcat`, and `listAgg`. The three methods are essentially the same, used for concatenating strings. Usage is as follows:

```scala
val q =
    from[Department]
        .map: d =>
            stringAgg(d.name, ",", d.id.asc)
```

The first parameter is a string expression;

The second parameter is a `String` value, the separator;

Followed by several sorting rules, which can be omitted.

sqala has special dialect adaptations for this function, with the following rules:

In PostgreSQL or SQLServer, it generates the `STRING_AGG` function;

In MySQL, it generates the `GROUP_CONCAT` function, and places the separator after the `SEPARATOR` keyword;

In SQLite, it generates the `GROUP_CONCAT` function;

In Oracle or DB2, it generates the `LISTAGG` function, and places the sorting rules in the `WITHIN GROUP` clause.

#### grouping

sqala supports the `grouping` aggregate function, corresponding to the database's `GROUPING` function, used to distinguish which expressions participated in the current grouping. It is very useful in complex groupings like `GROUP BY CUBE` and when the grouped expressions may have null values. Its parameters are several grouping expressions:

```scala
val q =
    from[Department]
        .groupBy d =>
            (name = d.name)
        .map: (g, _) =>
            grouping(g.name)
```

**Note: For the `GROUPING` function, MySQL database restricts its use to queries with `GROUP BY ROLLUP` or `GROUP BY GROUPING SETS`; SQLite database does not support this function, and sqala does not perform compile-time checks for the above situations.**

### Custom Aggregate Functions

In addition to the built-in aggregate functions in sqala, we can also easily customize aggregate functions using `Expr.Func`.

In addition to the function name, parameter list, and other fields that functions have, aggregate functions can use `Expr.Func`'s:

    1. The field named `sortBy`, which generates the `ORDER BY` clause of the aggregate function.
    2. The field named `withinGroup`, which generates the `WITHIN GROUP` clause of the aggregate function.
    3. The field named `filter`, which generates the `FILTER` clause of the aggregate function.
    4. The field named `distinct`, which corresponds to the `DISTINCT` aggregate function when the value is `true`.

## Window Functions

sqala supports the following analytical functions:

| Function Name       | Corresponding SQL Function |
|:-------------------:|:--------------------------:|
| `rank()`            | `RANK()`                   |
| `denseRank()`       | `DENSE_RANK()`             |
| `percentRank()`     | `PERCENT_RANK()`           |
| `rowNumber()`       | `ROW_NUMBER()`             |
| `lag`               | `LAG(x, n, default)`       |
| `lead`              | `LEAD(x, n, default)`      |
| `ntile(n)`          | `NTILE(n)`                 |
| `firstValue`        | `FIRST_VALUE(x)`           |
| `lastValue`         | `LAST_VALUE(x)`            |
| `nthValue`          | `NTH_VALUE(x)`             |
| `cumeDist()`        | `CUME_DIST()`              |

Calling `over` after an analytical function or aggregate function can generate a window function expression. You can use `partitionBy` and `sortBy` (or `orderBy`), where `partitionBy`'s parameters are several expressions, and `sortBy`'s parameters are several sorting rules generated by expressions:

```scala
val q =
    from[Department].map: d =>
        rank() over (partitionBy (d.birthday) sortBy (d.name.asc))
```

The parameters of the window function can be empty:

```scala
val q =
    from[Department].map: d =>
        rank() over ()
```

The parameters of the window function can only have `sortBy` (or `orderBy`):

```scala
val q =
    from[Department].map: d =>
        rank() over (sortBy (d.name.asc))
```

sqala supports the framework of window functions, using `rowsBetween`, `rangeBetween`, `groupsBetween` to generate a framework. The above methods all have two parameters, which can be:

| Parameter           |
|:-------------------:|
|`currentRow`         |
|`unboundedPreceding` |
|`unboundedFollowing` |
|`n.preceding`        |
|`n.following`        |

For example:

```scala
import scala.language.postfixOps

val q =
    from[Department].map: d =>
        rank() over (partitionBy (d.birthday) sortBy (d.name.asc) rowsBetween (currentRow, 1 preceding))
```

## Conditional Expressions

sqala uses the `if` method to create `CASE WHEN` expressions:

```scala
val q =
    from[Employee].map: e =>
        `if` e.state == EmployeeState.Active `then` 1
        `else` 0
```

You can return an `Option` type value in `then`:

```scala
val q
    from[Employee].map: e =>
        `if` e.state == EmployeeState.Active `then` Some(1)
        `else` None
```

Conditional expressions can also be combined with other expressions:

```scala
val q =
    from[Employee].map: e =>
        sum(`if` e.state == EmployeeState.Active `then` 1 `else` 0)
```

## JSON Operations

sqala supports the `->` and `->>` JSON operators, with semantics consistent with MySQL and PostgreSQL:

```scala
val q =
    from[A].map: a =>
        a.x -> 0 ->> "a"
```

For JSON operations, the field type needs to be specified as `sqala.metadata.Json`:

```scala
import sqala.metadata.Json

case class A(x: Json)
```

Its definition is `opaque type Json = String`. We can use its `toString` method to convert it to a string.

## Time Operations

We can use the `interval` method to perform operations on time:

```scala
import scala.language.postfixOps

val q =
    from[A].map: a =>
        a.date + interval(1 day) + interval(1 month)
```

The first parameter of `interval` is of type `Double`, and the second parameter is the time unit. sqala supports the following time units:

| Unit   | Meaning |
|:------:|:-------:|
| year   | Year    |
| month  | Month   |
| week   | Week    |
| day    | Day     |
| hour   | Hour    |
| minute | Minute  |
| second | Second  |

sqala will automatically perform dialect conversion when generating SQL. For example, in SQLServer, it will be converted to the `DATEADD` function, in SQLite, it will be converted to the `DATETIME` function, and in other databases, it will generate different `INTERVAL` expression dialects.

sqala supports the `timestamp` and `date` methods to convert strings into database time literal expressions, with corresponding types of `Expr[LocalDateTime]` and `Expr[LocalDate]`:

```scala
val time1 = timestamp("2020-01-01 00:00:00")

val time2 = date("2020-01-01")

val q =
    from[A].filter(a => a.date1 == time1 && a.date2 == time2)
```

In Sqlite and SQLServer, it will be converted to date function and `CAST` expression, on other databases, it gerates date literal.

We can use `extract` function to extract some parts from datetime:

```scala
val q =
    from[A].map: a =>
        extract(year from a.date)
```

In SQLServer, it will be casted to `DATEPART` function, other databases however, `EXTRACT` expression will be generated。

We can use `extract` operation to calculate duration between two datetime.

```scala
val q =
    from[A].map: a =>
        extract(day from (a.date1 - a.date2))
```

## Type Conversion

We can use `as` function to convert expressions.

```scala
val q =
    from[A].map: a =>
        a.x.as[String]
```

sqala will automatically adopt to dialect of database.

## Custom Binary Operator

sqala supports customize non-standard binary operaor, for example, MySQL's `RLIKE`.

```scala
extension (x: Expr[String])
    def rlike(y: String): Expr[Boolean] =
        Expr.Binary(x, SqlBinaryOperator.Custom("RLIKE"), y.asExpr)

val q =
    from[A].filter(a => a.x.rlike("..."))
```