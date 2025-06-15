# 数据库交互

为了和数据库交互，在配置好实体类的元数据信息后，我们还需要配置好数据库的连接信息，目前sqala支持创建JDBC上下文管理连接。

我们这样来构造一个查询上下文：

```scala
import sqala.jdbc.*

import javax.sql.DataSource

// 任意连接池，比如Hikari、Druid、DBCP、C3P0等
val dataSource: DataSource = ???

// 第二个参数传入数据库方言
// 支持的方言有：
// MysqlDialect
// PostgresqlDialect
// SqliteDialect
// OracleDialect
// MssqlDialect
// DB2Dialect
// H2Dialect
val db = JdbcContext(dataSource, MysqlDialect)
```

然后我们需要配置日志处理器，以便在执行查询时打印出对应的SQL语句，任何类型为`String => Unit`的函数都可以作为日志处理器，此处以JVM主流日志框架`SLF4J`为例，实际使用时可以自行替换成成各种日志框架：

```scala
import sqala.jdbc.*

class Service:
    val logger = LoggerFactory.getLogger(Service.class)

    given Logger = Logger((s: String) => logger.info(s))
```

如果不需要打印日志，可以写成：

```scala
import sqala.jdbc.*

class Service:
    given Logger = Logger(_ => ())
```

配置好连接信息之后，就可以连接到数据库执行查询了。

我们无需为实体类手工编写反序列化代码，如果遇到编译错误，请尝试使用`CustomField`。

## 查询数据

使用`fetch`方法查询数据，其返回一个List类型的结果：

```scala
val q = query:
    from[Department].filter(_.id > 1)

val result: List[Department] = db.fetch(q)
```

我们可以使用`fetchTo`方法将结果映射到非sqala自动推导出的类型，但可能在运行时返回类型转换错误：

```scala
val result: List[SomeEntity] = db.fetchTo[SomeEntity](q)
```

## 查询首条数据

`find`方法返回一个`Option`类型的结果，即查询命中结果集的首条数据：

```scala
val q = query:
    from[Department].filter(_.id > 1)

val result: Option[Department] = db.find(q)
```

`findTo`方法与`fetchTo`类似：

```scala
val result: Option[SomeEntity] = db.findTo[SomeEntity](q)
```

## 查询条数

查询数据条数是一个常用的操作，我们可以使用`fetchSize`方法进行查询：

```scala
val q = query:
    from[Department].filter(_.id > 1)

val result: Long = db.fetchSize(q)
```

为了避免性能浪费，在调用`fetchSize`时，sqala会视情况对传入的查询进行优化：

    1. 首先去除查询中的`ORDER BY`和`LIMIT`子句；

    2. 如果查询含有`GROUP BY`或`SELECT DISTINCT`，则将查询作为子查询，并将外层查询列设置为`COUNT(*)`；

    3. 否则将`SELECT`的字段替换成`COUNT(*)`

## 查询存在性

使用`fetchExists`查询存在性：

```scala
val q = query:
    from[Department].filter(_.id > 1)

val result: Boolean = db.fetchExists(q)
```

## 分页查询

使用`page`方法分页查询，其返回Page类型的结果，Page类型定义如下：

```scala
case class Page[T](
    pageTotal: Int,  // 总页数
    querySize: Long, // 查询COUNT(*)返回的条目数
    pageNo: Int,     // 当前页码
    pageSize: Int,   // 页大小
    data: List[T]    // 分页数据
)
```

`page`的参数分别为：查询语句、页大小、页码、是否需要查询条数（默认为true）：

```scala
val q = query:
    from[Department]

val result: Page[Department] = db.page(q, 10, 1)
```

其中最后一个参数控制是否需要查询条数，如果在每次分页查询都查询条数，可能会浪费数据库资源，比如实际业务中我们可以只在第一页查询条数，其他情况返回0：

```scala
val q = query:
    from[Department]

val pageSize = 10
val pageNo = 1

val result: Page[Department] = db.page(q, pageSize, pageNo, pageNo == 1)
```

## 执行语句

对于非查询类语句，使用`execute`方法执行语句，其返回Int类型的结果，含义是受影响行数：

```scala
val result: Int = db.execute(insert[Department](d => (d.managerId, d.name)) values (1, "IT"))
```

## 使用对象插入数据

`insert`方法可以使用实体对象生成插入语句，并执行返回受影响行数（使用`@autoInc`注解标记的字段会跳过）：

```scala
val department = Department(0, 1, "IT")

val result: Int = db.insert(department)
```

`insertAndReturn`方法可以使用实体对象生成插入语句，并执行后返回实体对象非自增主键字段值和数据库生成自增主键绑定的一个新的实体对象，由于使用`@autoInc`标记的字段会跳过，因此，插入实体类的自增主键字段可以随意填写一个无关的值：

```scala
val department = Department(0, 1, "IT")

val inserted = db.insertAndReturn(department)
```

`insertBatch`方法用于批量插入，参数是一个实体对象的`List`，插入后返回受影响行数：

```scala
val departments = Department(0, 1, "IT") :: Department(0, 2, "Legal") :: Nil

val result: Int = db.insertBatch(departments)
```

## 使用对象修改数据

`update`方法可以使用实体对象生成一个按主键字段更新其他字段的更新语句，并执行返回受影响行数：

```scala
val department = Department(1, 10, "IT")

val result: Int = db.update(department)
```

如果想设置为字段值为`None`时则不更新此字段，则可以传入`skipNone = true`：

```scala
val department = Department(1, 10, "IT")

val result: Int = db.update(department, skipNone = true)
```

为了避免生成错误插入，此时如果非主键字段的值全都是None，则不会向数据库发出此更新请求。

`save`方法可以使用实体对象生成：按主键是否存在觉得插入或更新的语句：

```scala
val department = Department(1, 10, "IT")

val result: Int = db.save(department)
```

各数据库生成的方言均不同。

## 游标查询

在需要操作大批量数据的场景中（比如导出数据到文件），如果我们将数据一次性查入到内存，可能会导致内存占用过大，如果采用分页查询，可能会导致效率低下。因此sqala支持了JDBC的游标查询，使用`cursorFetch`启用游标查询：

```scala
val q = query:
    from[Department]

db.cursorFetch(q, 100): c =>
    // 对数据的操作
    ...
```

`cursorFetch`的第一个参数是查询语句，第二个参数是每一批次获取的条目数，可以根据实际情况选用合适的大小。

然后传入一个对**每一批次**数据的操作函数，类型为`Cursor[T] => R`

`Cursor`类型的定义为：

```scala
case class Cursor[T](
    batchNo: Int,    // 批次编码
    batchSize: Int,  // 批次大小，即cursorFetch的第二个参数
    data: List[T]    // 一批次的数据
)
```

## 返回SQL

使用`sql`方法返回生成的SQL：

```scala
val q = query:
    from[Department].filter(_.id > 1)

val (sql, args) = q.sql(MysqlDialect)
```

## 事务

`executeTransaction`方法用来创建一个事务并执行，`executeTransaction`是一个带有上下文的函数，内部出现异常会回滚事务并抛出异常，如无异常则会返回内部的返回值：

```scala
try {
    val result = db.executeTransaction {
        transaction.execute(...)
        transaction.execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("查询错误")
}
```

**非常重要的一点是：在`executeTransaction`内部执行的查询方法，请不要使用`transaction.`显式指定数据库连接上下文。**

利用Scala3的上下文抽象机制，我们可以方便地将事务上下文在不同方法之间传播，而且这个操作是类型安全的：

```scala
import sqala.jdbc.*

def insertDepartment(row: Department)(using JdbcTransactionContext): Int =
    transaction.executeReturnKey(insert(row)).head.toInt

def deleteDepartment(id: Int)(using JdbcTransactionContext): Int =
    transaction.execute(delete[Department].where(d => d.id == id))

def insertAndDelete(row: Department)(using JdbcTransactionContext): Int =
    val id = insertDepartment(row)
    deleteDepartment(id)

val department: Department = ???

try {
    db.executeTransaction {
        insertAndDelete(department)
    }
} catch {
    case e: Exception =>
}
```

通过`using JdbcTransactionContext`，将会在需要事务执行的函数上添加事务上下文，如果不在`executeTransaction`方法内调用，则会产生编译错误，并且标记了`using JdbcTransactionContext`的方法可以在`transaction`内共享同一个事务。

另外，使用`executeTransactionWithIsolation`方法可以指定事务隔离级别：

```scala
try {
    val result = db.executeTransactionWithIsolation(TransactionIsolation.ReadUncommitted) {
        transaction.execute(...)
        transaction.execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("查询错误")
}
```

`TransactionIsolation`是一个枚举，枚举项有：`None`、`ReadUncommitted`、`ReadCommitted`、`RepeatableRead`和`Serializable`。
