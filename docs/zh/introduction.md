# 入门

下面的例子使用H2内存数据库展示了sqala的基本功能，将下面的代码保存为`.sc`文件，比如`demo.sc`，通过`scala demo.sc`命令执行即可看到运行结果：

```scala
//> using scala 3.6.2
//> using options -language:experimental.namedTuples
//> using dep com.h2database:h2:2.3.232
//> using dep com.wz7982::sqala-jdbc:0.2.24

import org.h2.jdbcx.*
import sqala.jdbc.*
import sqala.metadata.*
import sqala.static.dsl.*

object DB:
    given Logger = Logger(content => println(content))
    val ds = JdbcDataSource()
    ds.setURL("jdbc:h2:mem:main")
    val db = JdbcContext(ds, H2Dialect)

import DB.{db, ds}

ds.getConnection().createStatement().executeUpdate:
    """
    CREATE TABLE `demo` (
        `id` BIGINT PRIMARY KEY AUTO_INCREMENT, 
        `key` TEXT, 
        `value` TEXT
    )
    """

case class Demo(
    @autoInc id: Long,
    key: String,
    value: String
)

db.insert(Demo(0L, "sqala", "Scala's sql lib"))

val result = db.find:
    from[Demo].filter(_.key == "sqala").map(d => (key = d.key, value = d.value))

println(result)
```