# Getting Started

The following example uses the H2 in-memory database to demonstrate the basic functionality of sqala. Save the code below as a `.sc` file, for example `demo.sc`, and run it with the `scala demo.sc` command to see the result:

```scala
//> using scala 3.9.0
//> using dep com.h2database:h2:2.3.232
//> using dep com.wz7982::sqala-jdbc:0.8.0

import org.h2.jdbcx.JdbcDataSource
import sqala.jdbc.*
import sqala.metadata.*
import sqala.static.dsl.*

object DB:
    given Logger = Logger(content => println(content))
    val dataSource = JdbcDataSource()
    dataSource.setURL("jdbc:h2:mem:main")
    val db = JdbcContext(dataSource, H2Dialect, true)

import DB.{db, dataSource}

dataSource.getConnection().createStatement().executeUpdate(
    """
    CREATE TABLE `demo` (
        `id` BIGINT PRIMARY KEY AUTO_INCREMENT, 
        `key` TEXT, 
        `value` TEXT
    )
    """
)

case class Demo(
    @autoInc id: Long,
    key: String,
    value: String
)

db.insert(Demo(0L, "sqala", "Scala's sql lib"))

val result = db.find:
    from(Demo)
        .filter(_.key === "sqala")
        .map(d => (key = d.key, value = d.value))

println(result)
```
