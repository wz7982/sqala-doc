# 原生SQL

sqala支持使用原生SQL，对于常用的固定模板的SQL，我们可以使用`jdbc`模块提供的字符串插值器`staticSql`来创建，前提是需要保证作用域中能找到测试连接信息的`given`实例，该实例我们在数据库交互部分的可选验证数据环节已经见过：

```scala
import sqala.jdbc.*

transparent inline given JdbcTestConnection = JdbcTestConnection(
    "Your Url",
    "Your username",
    "Your password",
    "Driver class name",
    MysqlDialect // 对应的方言
)
```

有了以上保证后，使用字符串插值器创建原生SQL：

```scala
val x = 1
val y = "abc"

val nativeSql = staticSql"select a as col1, b, c from t where x = $x and y = $y"
```

传入的变量会被处理为`?`，来避免SQL注入。

`List`类型变量会按元素数量生成`(?, ?, ?)`，**但注意其不像sqala提供的查询构造器对空集合进行优化，原生SQL在传入空集合时可能会生成错误的SQL，请在传入时请检查集合是否为空**。

然后我们可以使用配置好的上下文来查询数据：

```scala
val result = db.fetch(nativeSql)
```

如果SQL正确且参数类型与数据库相符合，sqala能从查询信息中自动推导出结果的字段，我们可以像使用普通对象一样处理查询中的字段，这个操作是类型安全的：

```scala
for r <- result do
    val col1 = r.col1
    val b = r.b
    val c = r.c
```

但如果你的查询是需要动态拼接的，则需要使用`sql`插值器：


```scala
val x = 1
val y = "abc"

val nativeSql = sql"select * from t where x = $x and y = $y"
```

`sql`插值器支持`+`运算，方便进行条件拼接：

```scala
val x = 1
val y = "abc"

var nativeSql = sql"select * from t where true "

if x > 0 then nativeSql += sql"and x = $x "

if y.nonEmpty then nativeSql += sql"and y = $y"
```

此时sqala不支持自动推断返回类型，但我们可以使用`fetchTo`方法配合一个新的类来查询原生SQL：

```scala
case class Result(x: Int, y: Streing)

val result = db.fetchTo[Result](nativeSql)
```