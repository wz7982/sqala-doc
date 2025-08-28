# 原生SQL

sqala支持使用原生SQL，需要使用`sql`插值器：

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

我们可以使用`fetchTo`方法来查询原生SQL：

```scala
case class Result(x: Int, y: String)

val result = db.fetchTo[Result](nativeSql)
```

sqala支持编译期读取静态的原生SQL，并连接到数据库检查合法性，以及从SQL中计算出返回类型（**此功能仅用于快速搭建Demo，请勿在生产环境使用**）：

```scala
val result = db.fetch(sql"select 1 as x, 'abc' as y")

for r <- result do
    val x: Int = r.x
    val y: String = r.y
```