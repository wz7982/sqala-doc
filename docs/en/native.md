# Native SQL

sqala supports native SQL through the `sql` interpolator:

```scala
import sqala.dynamic.native.sql

val x = 1
val y = "abc"

val nativeSql = sql"select * from t where x = $x and y = $y"
```

The `sql` interpolator supports the `+` operator, which makes conditional composition convenient:

```scala
import sqala.dynamic.native.sql

val x = 1
val y = "abc"

var nativeSql = sql"select * from t where true "

if x > 0 then nativeSql += sql"and x = $x "

if y.nonEmpty then nativeSql += sql"and y = $y"
```

We can use the `fetchTo` method to query with native SQL:

```scala
case class Result(x: Int, y: String)

val result = db.fetchTo[Result](nativeSql)
```
