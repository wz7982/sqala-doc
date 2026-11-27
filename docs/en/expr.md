# Expressions

sqala includes a SQL expression type `Expr`, which wraps a SQL AST and gives sqala powerful abstraction capabilities. Below, we introduce some commonly used sqala expressions.

## Fields

Field expressions are among the most basic expressions. When building a query, sqala automatically generates the corresponding field expressions on the companion object of an entity class. For example, if a field in the entity class is of type `Int`, sqala generates the corresponding `Expr[Int]` version, which stores the database table name and column name:

```scala
// u.id is a field-type expression
val query =
    from(User).map(u => u.id)
```

## Values

Values of sqala's built-in data types, such as `Int` and `String`, as well as values of types that implement `CustomField`, can all be used as sqala value expressions. They can appear naturally in queries without being explicitly converted to `Expr`, thanks to the powerful contextual abstraction capabilities of Scala 3:

```scala
val query =
    from(User).map(u => (u.id, 1, "a"))
```

sqala manages nullable values with `Option`. Since `None` has no concrete type, use `Option.empty[T]` to construct an empty value in a plain value position:

```scala
val query =
    from(User).map(u => (u.id, Option.empty[String]))
```

## Conversion Expressions

In almost all of sqala's built-in features, you can seamlessly mix `Expr`, subqueries, values, and other types in computations (this capability is provided by the `AsExpr` trait). However, for some custom features such as custom functions and custom operators, sqala also lets you explicitly convert values and subqueries to the `Expr` type for convenience.

`asExpr` is the conversion method. The example above can also be written as:

```scala
val query =
    from(User).map(u => (u.id, 1.asExpr, "a".asExpr))
```

### Inlined Expressions

`asInlinedExpr` renders a value directly as a SQL literal instead of generating a `?` placeholder. A typical case is PostgreSQL `GROUP BY` expression matching:

```scala
case class T(x: Int)

val offset = 1

val query =
    from(T)
        .groupBy(t => t.x + offset.asInlinedExpr)
        .map((g, t) => (g, count()))
```

Generated SQL:

```sql
SELECT
    "t1"."x" + 1 AS "c1",
    COUNT(*) AS "c2"
FROM
    "t" AS "t1"
GROUP BY
    "t1"."x" + 1
```

If a normal value is used (`t.x + offset`), PostgreSQL receives two different parameter expressions, `x + $1` and `x + $2`, and therefore treats the expression in `SELECT` as not appearing in `GROUP BY`; `asInlinedExpr` turns both sides into the same literal `x + 1`.

The same query can also be rewritten as a subquery to avoid repeating the expression in `GROUP BY`:

```scala
val query =
    from(
        from(T).map(t => (v = t.x + offset))
    )
        .groupBy(r => r.v)
        .map((g, r) => (g, count()))
```

```sql
SELECT
    "t2"."c1" AS "c1",
    COUNT(*) AS "c2"
FROM (
    SELECT
        "t1"."x" + ? AS "c1"
    FROM
        "t" AS "t1"
) AS "t2"
GROUP BY
    "t2"."c1"
```

Note that the two examples use different display conventions: the first shows the output of plain-text generation via `.sql(dialect)` (values inlined as literals), while the second shows what JDBC actually sends at execution time (ordinary values passed as `?` placeholders). See the "Two Levels of Dialects" section of [Database Interaction](./database.md) for the difference between the two paths.

Values inlined by `asInlinedExpr` are safely escaped by sqala according to the configured dialect and escaping settings. For ordinary queries, prefer `asExpr` or plain values so that sqala can bind them through `?` parameters.

See [Database Interaction](./database.md) for more about JDBC parameters and inlined expressions.

## Native Expressions

For special SQL syntax that the sqala expression system cannot express (such as MySQL full-text search), you can write raw SQL fragments with the `rawExpr` interpolator. See [Custom Expressions](./expr-custom.md) for details.

## Relational Operations

### Symbolic Operators

Besides fields and values, the most common expressions are relational operation expressions, which are often used in query methods such as `filter`, `on`, and `having`.

sqala supports the following symbolic relational operators:

| Operator Name | Corresponding SQL Operator |
|:---------:|:---------------------:|
| `===`      | `=`                   |
| `<>`      | `<>`                  |
| `<=>`     | `IS NOT DISTINCT FROM`|
| `>`       | `>`                   |
| `>=`      | `>=`                  |
| `<`       | `<`                   |
| `<=`      | `<=`                  |

You can use them just like the operators built into Scala:

```scala
val query =
    from(User).filter(u => u.name === "Dave")
```

Thanks to sqala's powerful type compatibility, the right side of an operator can be not only a value but also another expression or a subquery. This is common in join conditions:

```scala
val query =
    from(User).filter(u => u.id === u.id)
```

Operators such as `===` do not require both sides to have the same type; they only need to be compatible as allowed by the SQL standard. For example, databases allow comparisons between different numeric types, and they also allow direct comparisons between nullable and non-nullable types. The following SQL is valid:

```sql
SELECT
    CAST(1 AS INTEGER) = CAST(NULL AS BIGINT)
```

So sqala allows this behavior:

```scala
val query =
    // u.id is Expr[Int] and can be compared directly with Option[Long]
    from(User).filter(u => u.id === Option(1L))
```

Databases allow comparisons between time types and strings, so sqala lets expressions of time and string types be compared directly:

```scala
val query =
    // u.createTime is Expr[LocalDateTime] and can be compared directly with String
    from(Post).filter(p => p.createTime > "2020-01-01 00:00:00")
```

Here is an extreme example that demonstrates sqala's type compatibility. Suppose we have the following entity class:

```scala
case class Entity(x: Array[Option[Array[Int]]], y: Option[Array[Array[Option[Int]]]])
```

Both fields of the entity class are `Int` arrays nested two levels deep, differing only in their nullability strategy. sqala allows two array fields like these to be compared as long as they have the **same number of levels** and compatible types:

```scala
val query =
    from(Entity).filter(e => e.x === e.y)
```

However, if the types on both sides are incompatible, sqala strictly forbids the comparison at compile time:

```scala
val query =
    // Compile error
    from(User).filter(u => u.id === "abc")
```

Similarly, if we change the innermost type of the right-side field in the complex example above to a string type:

```scala
case class Entity(x: Array[Option[Array[Int]]], y: Option[Array[Array[Option[String]]]])
```

sqala also does not allow the two fields to be compared:

```scala
val query =
    // Compile error
    from(Entity).filter(e => e.x === e.y)
```

sqala's type compatibility check does not stop at the surface level; it recursively checks the entire type tree.

The left side of sqala's relational operators (`===`, `<>`, etc.) can be any value that can be lifted to an expression. They no longer rely on Scala's `==`/`!=` overloading, so they do not conflict with Scala's equality semantics (other operators are not affected):

```scala
val query =
    from(User).filter(u => "Dave" === u.name)
```

Or explicitly use `asExpr` to convert the value to the `Expr` type:

```scala
val query =
    from(User).filter(u => "Dave".asExpr === u.name)
```

In rare cases, a comparison result (`Boolean`) must itself participate in another comparison, and then you must pay special attention to operator precedence. In Scala, `!=` has lower precedence than `<` and `>`, so `a != b < c` is parsed as `a != (b < c)`; but `<>` used by sqala starts with `<` and therefore has the same precedence as `<` and `>`, so `a <> b < c` is parsed as `(a <> b) < c`. This difference can change the semantics when a comparison result is compared again, for example `true <> false < true` (here `true` and `false` can be understood as expressions returning `Boolean`). In such cases, add parentheses manually to make the grouping explicit, for example `true <> (false < true)`.

### IS NULL

The `isEmpty` method corresponds to SQL's `IS NULL` and is used to check whether a nullable expression is null:

```scala
val query =
    from(User).filter(u => u.name.isEmpty)
```

Negating it gives `IS NOT NULL`:

```scala
val query =
    from(User).filter(u => !u.name.isEmpty)
```

### IN

The `in` method corresponds to SQL's `IN` operator. sqala supports two forms of `in`. The first is to pass a collection of values such as `Seq` or `List`, which is the most common usage:

```scala
val query =
    from(User).filter(u => u.id.in(List(1, 2, 3)))
```

**Since `IN ()` in SQL is usually a syntax error, sqala enables an optimization for empty collections that rewrites the expression to `1 = 0`**.

The `in` method can also accept a tuple of expressions, whose elements are each compatible with `Expr`, values, and subqueries:

```scala
val query =
    from(User).filter(u => u.id.in(1, u.id, from(User).map(_.id).take(1)))
```

Moreover, sqala's operators usually have extremely strong type compatibility; for example, the following is also valid:

```scala
val list: List[Option[Long]] = List(Some(1L), None, Some(2L))

val query =
    from(User).filter(u => u.id.in(list))
```

But when the types do not match, this results in a compile error:

```scala
val list: List[String] = List("a", "b", "c")

val query =
    // Compile error
    from(User).filter(u => u.id.in(list))
```

### LIKE

The `like` method corresponds to SQL's `LIKE` operator, and its right side is compatible with `Expr`, values, and subqueries:

```scala
val query =
    from(User).filter(u => u.name.like("%Dave%"))
```

`contains` is a simplified version of `like` that does not require you to write the `%` wildcards manually, but its right side accepts only `String`:

```scala
val query =
    from(User).filter(u => u.name.contains("Dave"))
```

`startsWith` and `endsWith` are similar to `contains`:

```scala
val query =
    from(User).filter(u => u.name.startsWith("Dave"))
```

### BETWEEN

`between` is a method with two parameters that corresponds to the ternary `BETWEEN` expression, and its parameters are compatible with `Expr`, values, and subqueries:

```scala
val query =
    from(User).filter(u => u.id.between(1, 10))
```

## Logical Operations

sqala supports the binary logical operators `&&` (corresponding to `AND`) and `||` (corresponding to `OR`):

```scala
val query =
    from(User).filter(u => u.id === 1 && u.name === "Dave")
```

Usually `&&` has higher precedence than `||`, and you can control precedence with `()`:

```scala
val query =
    from(User).filter(u => u.id < 5 && (u.name === "Dave" || u.name === "Ben"))
```

The unary logical operation `!` corresponds to SQL's `NOT` operator:

```scala
val query =
    from(User).filter(u => !(u.name === "Dave"))
```

When `!` is applied to an operator such as `like`, `in`, or `between`, sqala actually generates `NOT LIKE`, `NOT IN`, `NOT BETWEEN`, and so on.

## Multi-column Comparison

sqala allows multiple columns to participate in relational operations at the same time, using `===`/`<>` to compare the corresponding tuples:

```scala
val q1 =
    from(User).filter: u =>
        (u.id, u.name) === (1, "Dave")

val q2 =
    from(User).filter: u =>
        (u.id, u.name).in(List((1, "Dave"), (2, "Ben")))

val q3 =
    from(User).filter: u =>
        (u.id, u.name).in(from(User).map(uu => (uu.id, uu.name)))
```

Expressions, values, and subqueries with compatible types can be mixed arbitrarily in a comparison:

```scala
val q4 =
    from(User).filter: u =>
        (u.id, u.name) === (Option(1L), from(User).map(uu => uu.name).take(1))
```

In the example above, the types of `u.id` and `u.name` are `Expr[...]`, the type of `Option(1L)` is `Option[Long]`, and the type of the subquery is `Query[...]`. sqala guarantees compatibility for these types through the unified `AsExpr` trait, whereas "method overloading" in traditional programming languages would run into a combinatorial explosion in this scenario and therefore could not support such an intuitive calling form.

## Numerical Operations

sqala supports the following numerical operators:

| Operator Name | Corresponding SQL Operator |
|:---------:|:------------:|
| `+`       | `+`          |
| `-`       | `-`          |
| `*`       | `*`          |
| `/`       | `/`          |
| unary `+` | `+expr`      |
| unary `-` | `-expr`      |

`+` and `-` also work in unary form:

```scala
val query =
    from(User).map(u => -u.id)
```

```scala
val query =
    from(User).filter(u => u.id + 1 > 5).map(_.id * 100)
```

sqala's numerical operations also have extremely strong type compatibility. For example, performing a numerical operation on two expressions of types `Expr[Int]` and `Option[Double]` actually returns an expression of type `Expr[Option[Double]]`.

sqala also supports the `%` operator, but it actually generates the SQL standard `MOD` function.

Note in particular that, because databases handle division differently, sqala converts both operands of `/` to `DECIMAL(38, 10)` when generating SQL for compatibility, so that the division result is an exact decimal, i.e. `CAST(x AS DECIMAL(38, 10)) / CAST(y AS DECIMAL(38, 10))`. Therefore, if a field itself is of type `Double` or `Float`, this conversion may introduce precision issues; it is best to avoid using division directly on such fields and to prefer exact numeric types such as `DECIMAL` (`BigDecimal` in Scala).

## String Concatenation

sqala supports database string concatenation operations. You can use `++` to concatenate strings, which generates the `||` operator:

```scala
val query =
    from(User).map(u => u.name ++ "abc")
```

In databases such as MySQL that do not support the `||` operator, this operation generates a `CONCAT` function expression.

## Conditional Expressions

Methods such as `caseWhen`/`when`/`otherwise` correspond to SQL's `CASE WHEN THEN ELSE END` expression, and their parameters are likewise compatible with `Expr`, values, and subqueries:

```scala
val query =
    from(User).map(u => caseWhen(u.id === 1)(1).when(u.id === 2)(u.id).otherwise(Option.empty[Int]))
```

The generated SQL expression is:

```sql
CASE WHEN "t1"."id" = 1 THEN 1 WHEN "t1"."id" = 2 THEN "t1"."id" ELSE CAST(NULL AS INTEGER) END
```

sqala has very strong return-type inference. In the relational operations section, we defined an extreme example:

```scala
case class Entity(x: Array[Option[Array[Int]]], y: Option[Array[Array[Option[Int]]]])
```

If we put the two fields in the two branches of a conditional expression:

```scala
val query =
    from(Entity)
        .map(e => caseWhen(e.x === e.y)(e.x).otherwise(e.y))
```

After the query, the return type is automatically inferred as:

```scala
// Result type: List[Option[Array[Option[Array[Option[Int]]]]]]
val result = db.fetch(query)
```

`coalesce` corresponds to SQL's `COALESCE` expression and returns the first non-null value among its parameters:

```scala
val query =
    from(User).map(u => coalesce(u.id, 1))
```

sqala also supports `ifNull` as an alias for `coalesce`:

```scala
val query =
    from(User).map(u => ifNull(u.id, 1))
```

In addition, since `COALESCE` is an extremely common operation, sqala also provides the `getOrElse` method, which follows the conventions of the Scala standard library and maps automatically to `COALESCE`:

```scala
val query =
    from(User).map(u => u.id.getOrElse(1))
```

`nullIf` corresponds to SQL's `NULLIF` expression, which compares two values and returns `NULL` if they are equal:

```scala
val query =
    from(User).map(u => nullIf(u.id, 1))
```

## Functions

Because functions differ greatly across databases, sqala only includes the SQL functions defined in the ISO/IEC 9075 standard. Although these are standard functions, you should still consult the documentation of the database you actually use to confirm that it supports them, and refer to that documentation for what each function does. For functions not in this standard list, you can use sqala's [custom expressions](./expr-custom.md) feature to create your own.

Function usage example:

```scala
val query =
    from(User).map(u => substring(u.name, 1))
```

The functions built into sqala are as follows (aggregate functions, window functions, time operation functions, JSON functions, etc. are not listed here):

|     Function           |      Corresponding SQL Function      |
|:-----------------:|:-----------------------:|
|`substring(a, b)`  |`SUBSTRING(a FROM b)`    |
|`substring(a, b, c)`|`SUBSTRING(a FROM b FOR c)`|
|`upper(a)`        |`UPPER(a)`                |
|`lower(a)`        |`LOWER(a)`                |
|`lpad(a, b)`      |`LPAD(a, b)`              |
|`lpad(a, b, c)`   |`LPAD(a, b, c)`           |
|`rpad(a, b)`      |`RPAD(a, b)`              |
|`rpad(a, b, c)`   |`RPAD(a, b, c)`           |
|`btrim(a)`        |`BTRIM(a)`                |
|`btrim(a, b)`     |`BTRIM(a, b)`             |
|`ltrim(a)`        |`LTRIM(a)`                |
|`ltrim(a, b)`     |`LTRIM(a, b)`             |
|`rtrim(a)`        |`RTRIM(a)`                |
|`rtrim(a, b)`     |`RTRIM(a, b)`             |
|`overlay(a, b, c)`|`OVERLAY(a PLACING b FROM c)`|
|`overlay(a, b, c, d)`|`OVERLAY(a PLACING b FROM c FOR d)`|
|`regexpLike(a, b)`|`REGEXP_LIKE(a, b)`      |
|`position(a, b)` |`POSITION(a IN b)`         |
|`charLength(a)`   |`CHAR_LENGTH(a)`          |
|`octetLength(a)`  |`OCTET_LENGTH(a)`         |
|`abs(a)`           |`ABS(a)`                  |
|`mod(a, b)`        |`MOD(a, b)`               |
|`sin(a)`         |`SIN(a)`                 |
|`cos(a)`         |`COS(a)`                 |
|`tan(a)`         |`TAN(a)`                 |
|`asin(a)`         |`ASIN(a)`                 |
|`acos(a)`         |`ACOS(a)`                 |
|`atan(a)`         |`ATAN(a)`                 |
|`sinh(a)`         |`SINH(a)`                 |
|`cosh(a)`         |`COSH(a)`                 |
|`tanh(a)`         |`TANH(a)`                 |
|`log(a, b)`       |`LOG(a, b)`                 |
|`log10(a)`       |`LOG10(a)`                 |
|`ln(a)`         |`LN(a)`                 |
|`exp(a)`         |`EXP(a)`                 |
|`sqrt(a)`         |`SQRT(a)`                 |
|`power(a, b)`     |`POWER(a, b)`             |
|`ceil(a)`         |`CEIL(a)`                 |
|`floor(a)`       |`FLOOR(a)`                 |
|`round(a, b)`     |`ROUND(a, b)`              |
|`widthBucket(a, b, c, d)`|`WIDTH_BUCKET(a, b, c, d)`|
|`currentDate()`   |`CURRENT_DATE`          |
|`currentTime()`   |`CURRENT_TIME`          |
|`currentTimestamp()`|`CURRENT_TIMESTAMP`    |
|`localTime()`     |`LOCALTIME`             |
|`localTimestamp()`|`LOCALTIMESTAMP`        |

For string expressions, sqala also provides Scala-idiomatic extension methods: `toUpperCase`, `toLowerCase`, `trim` (no argument, maps to `TRIM(a)`), and `length` (maps to `CHAR_LENGTH(a)`). They generate the same SQL as the standard functions `upper`/`lower`, etc., so you can use whichever style you prefer:

```scala
val query =
    from(User).map(u => u.name.toUpperCase)
```

## Type Conversion

The `as` method, together with a type parameter, performs type conversion and corresponds to SQL's `CAST` expression:

```scala
val query =
    from(User).map(u => u.id.as[String])
```
