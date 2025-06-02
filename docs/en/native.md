# Native SQL

sqala supports the use of native SQL. For commonly used fixed-template SQL, we can use the string interpolator `staticSql` provided by the `jdbc` module to create it. The prerequisite is to ensure that a `given` instance with test connection information can be found in the scope. We have seen this instance in the optional validation data section of the database interaction part:

```scala
import sqala.jdbc.*

transparent inline given JdbcTestConnection = JdbcTestConnection(
    "Your Url",
    "Your username",
    "Your password",
    "Driver class name",
    MysqlDialect // Corresponding dialect
)
```

With the above assurance, use the string interpolator to create native SQL:

```scala
val x = 1
val y = "abc"

val nativeSql = staticSql"select a as col1, b, c from t where x = $x and y = $y"
```

The passed variables will be processed as `?` to avoid SQL injection.

Variables of type `List` will generate `(?, ?, ?)` based on the number of elements, **but note that unlike the query builder provided by sqala, which optimizes for empty collections, native SQL may generate incorrect SQL when passing empty collections. Please check if the collection is empty before passing it**.

Then we can use the configured context to query the data:

```scala
val result = db.fetch(nativeSql)
```

If the SQL is correct and the parameter types match the database, sqala can automatically deduce the fields of the result from the query information. We can handle the fields in the query like ordinary objects, and this operation is type-safe:

```scala
for r <- result do
    val col1 = r.col1
    val b = r.b
    val c = r.c
```

However, if your query requires dynamic splicing, you need to use the `sql` interpolator:

```scala
val x = 1
val y = "abc"

val nativeSql = sql"select * from t where x = $x and y = $y"
```

The `sql` interpolator supports `+` operations, making it convenient for conditional splicing:

```scala
val x = 1
val y = "abc"

var nativeSql = sql"select * from t where true "

if x > 0 then nativeSql += sql"and x = $x "

if y.nonEmpty then nativeSql += sql"and y = $y"
```

At this point, sqala does not support automatic inference of return types, but we can use the `fetchTo` method in conjunction with a new class to query native SQL:

```scala
case class Result(x: Int, y: String)

val result = db.fetchTo[Result](nativeSql)
```