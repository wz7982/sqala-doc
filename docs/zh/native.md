# 原生SQL

sqala支持使用原生SQL，需要使用`sql`插值器：

```scala
import sqala.jdbc.sql

val x = 1
val y = "abc"

val nativeSql = sql"select * from t where x = $x and y = $y"
```

插值参数会在编译期通过`JdbcEncoder`类型类编码，因此每个参数类型都需要有对应的`JdbcEncoder`实例。内置类型已经提供实例，自定义类型可以自行实现`JdbcEncoder`。`Seq`类型的参数会展开为`(?, ?, ?)`，适合用于`IN`子句；空的`Seq`会抛出错误。

注意：`JdbcEncoder`只用于原生SQL的参数绑定。查询DSL中的值由`AsSqlExpr`转换，DSL不会使用`JdbcEncoder`，因此自定义`JdbcEncoder`不会影响DSL生成的SQL或参数。

`sql`插值器支持`+`运算，方便进行条件拼接：

```scala
import sqala.jdbc.sql

val x = 1
val y = "abc"

var nativeSql = sql"select * from t where true "

if x > 0 then nativeSql += sql"and x = $x "

if y.nonEmpty then nativeSql += sql"and y = $y"
```

我们可以使用`fetchTo`方法来查询原生SQL：

```scala
case class Result(x: Int, y: String)

val result = db.fetchTo[Result](nativeSql)
```