# 原生SQL

sqala支持原生SQL，需通过`sql`插值器编写：

```scala
import sqala.jdbc.sql

val x = 1
val y = "abc"

val nativeSql = sql"select * from t where x = $x and y = $y"
```

插值参数会在编译期通过`JdbcEncoder`类型类编码：标量参数需要其类型对应的`JdbcEncoder`实例，`Seq`类型的参数则需要其**元素类型**的`JdbcEncoder`（`Seq`本身不需要编码器实例）。内置类型已提供实例，自定义类型可自行实现`JdbcEncoder`。`Seq`类型的参数会展开为`(?, ?, ?)`，适合用于`IN`子句；编译期不检查`Seq`内容，传入空的`Seq`会在执行时抛出`IllegalArgumentException`。

注意：`JdbcEncoder`只用于原生SQL的参数绑定。查询DSL中的值由`AsSqlExpr`转换，DSL不使用`JdbcEncoder`，因此自定义`JdbcEncoder`不会影响DSL生成的SQL或参数。

`sql`插值器支持`+`运算，便于进行条件拼接：

```scala
import sqala.jdbc.sql

val x = 1
val y = "abc"

var nativeSql = sql"select * from t where true "

if x > 0 then nativeSql += sql"and x = $x "

if y.nonEmpty then nativeSql += sql"and y = $y"
```

除`NativeSql`外，`+`还提供`String`重载，用于追加原始SQL文本。注意：追加的字符串会直接进入SQL，不产生任何参数绑定，需自行保证其内容安全：

```scala
val order = " order by x"

val sorted = nativeSql + order
```

可使用`fetchTo`方法执行原生SQL查询：

```scala
case class Result(x: Int, y: String)

val result = db.fetchTo[Result](nativeSql)
```

如果不想为结果定义case class，可用`fetchToMap`将每行读取为`Map[String, Any]`：

```scala
val result: List[Map[String, Any]] = db.fetchToMap(nativeSql)
```

执行INSERT/UPDATE/DELETE等原生DML时使用`db.execute`，返回受影响行数：

```scala
val affected: Int = db.execute(sql"update t set y = $y where x = $x")
```