# Getting Started

The following example demonstrates the basic functionality of sqala using the H2 in-memory database. Save the code below as a `.sc` file, for example `demo.sc`, and execute it with the `scala demo.sc` command to see the results:

```scala
//> using scala 3.7.0
//> using dep com.h2database:h2:2.3.232
//> using dep com.wz7982::sqala-jdbc:0.3.6

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
    query:
        from[Demo]
            .filter(_.key == "sqala")
            .map(d => (key = d.key, value = d.value))

println(result)
```
