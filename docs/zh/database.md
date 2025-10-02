# 数据库交互

在配置好实体类的元数据之后，我们还需要配置数据库的连接信息，目前sqala使用JDBC来支撑与数据库交互的能力。

sqala需要一个继承了`javax.sql.DataSource`的连接池作为连接管理器，您可以使用自己喜欢的连接池，如Hikari、Druid、DBCP、C3P0等。

我们首先需要为连接池类型实现`sqala.jdbc.JdbcConnection`：

```scala
import sqala.jdbc.JdbcConnection

// 类型参数是您使用的连接池类型
given JdbcConnection[SomeDataSource] with
    // 使用init方法创建连接池
    def init(url: String, username: String, password: String, driverClassName: String): SomeDataSource =
        val dataSource: SomeDataSource = ???
        dataSource.setUrl("...")
        dataSource.setMaxConnection(1)
        // ... 其他连接池初始化代码
        dataSource
```

然后，我们创建一个`sqala.jdbc.JdbcContext`实例，这个实例为了避免资源泄露，最好放在某个`object`单例对象中：

```scala
import sqala.jdbc.{JdbcConnection, JdbcContext}
import sqala.metadata.MysqlDialect

object DB:
    given JdbcConnection[SomeDataSource] with
        // 省略连接池构建代码

    // 您可以从环境变量，配置文件，或者是静态字符串中获取这些连接信息，传入JdbcContext的构造器中
    val db = JdbcContext[SomeDataSource](MysqlDialect, true, url, username, password, driver)
```

连接上下文构造的第一个参数是数据库使用的方言，目前sqala内置支持四种方言：

`MysqlDialect`、`PostgresqlDialect`、`OracleDialect`、`H2Dialect`，均可从`sqala.static.metadata`中导入。

第二个参数**很重要**，由于sqala支持的SQL表达式很全面，而不是所有的字符串（比如`INTERVAL`表达式、`TIME`字面量、JSON功能的JSON path等）都能使用JDBC预编译语句参数化，所以sqala自己管理转义字符，**避免SQL注入**，第一个参数如果为`true`则采用标准SQL的转义模式。

如果您不确定您的数据库是何种转义模式，可以在数据库中发送查询`SELECT '//'`，如果数据库返回`//`则填`true`，如果为`/`则填`false`。

通常情况下，MySQL数据库填写false，PostgreSQL和Oracle等数据库填写`true`。

配置数据库连接信息的最后一步是配置一个日志处理器，以便在执行查询时在日志中记录调试信息，任何类型为`String => Unit`，下面将以JVM主流日志框架`SLF4J`和控制台打印两种情况为例，介绍日志配置方式，实际使用时可以自行替换成成各种日志框架。

使用`SLF4J`：

```scala
import org.slf4j.LoggerFactory
import sqala.jdbc.Logger

class Service:
    val logger = LoggerFactory.getLogger(Service.class)

    given Logger = Logger((s: String) => logger.info(s))
```

使用控制台打印：

```scala
import sqala.jdbc.Logger

class Service:
    given Logger = Logger((s: String) => println(s))
```

如果您希望日志处理什么都不做，直接将`given`实现写成：

```scala
import sqala.jdbc.Logger

class Service:
    given Logger = Logger(_ => ())
```

即可。

配置好连接信息后，我们就可以使用sqala连接到数据库执行查询了。

## 新增数据

sqala支持直接使用实体对象生成数据库的`INSERT`语句，使用`db.insert`即可简单的插入操作：

```scala
val user = User(0, "小明")

val result: Int = db.insert(user)
```

在实体类中配置了`autoInc`注解的字段不会在SQL语句中出现，所以对应字段的值可以随意填写。

`db.insert`方法返回值为受影响行数。

如果是一个实体集合，我们可以用`db.insertBatch`方法来批量写入：

```scala
val users = List(User(0, "小明"), User(0, "小刚"))

val result: Int = db.insertBatch(users)
```

如果希望在插入后，拿到数据库生成的自增主键，我们可以使用`db.insertAndReturn`：

```scala
val user = User(0, "小明")

val result: User = db.insertAndReturn(user)
```

`db.insertAndReturn`会在数据库执行插入数据成功后，将数据库返回的主键值绑定到一个**新的实体对象**上，而**不会**像一些Java查询库那样直接**原地修改**原来的实体对象。

对于更复杂的新增数据需求，请参考[增删改DSL](./update.md)部分。

## 更新数据

sqala支持使用实体对象来**按主键**更新其他字段的值，请确保实体类上使用`primaryKey`或`autoInc`注解配置了主键字段，然后使用`db.update`方法更新数据：

```scala
val user = User(0, "小明")

val result: Int = db.update(user)
```

`db.update`返回受影响行数。

对于可空字段的不同处理方式，`db.update`支持一个额外的参数`skipNone`，默认为`false`，也就是说，sqala的默认策略是将`None`值映射为数据库的`NULL`更新，如果设置`skipNone`为`true`，则会在生成SQL时跳过值为`None`的字段：

```scala
val user = User(1, "小明")

val result: Int = db.update(user, skipNone = true)
```

对于更复杂的更新数据需求，请参考[增删改DSL](./update.md)部分。

## 新增或更新数据

对于“按主键值决定新增还是更新数据”的需求，sqala使用`db.save`方法来解决：

```scala
val user = User(1, "小明")

val result: Int = db.save(user)
```

此操作已经做了方言兼容，会在不同数据库中生成不同的命令。

## 按主键查询数据

sqala支持直接使用主键查询数据，，请确保实体类上使用`primaryKey`或`autoInc`注解配置了主键字段，然后使用`db.findByPrimaryKey`方法查询数据：

```scala
val result: Option[User] = db.findByPrimaryKey[User](1)
```

此方法的类型参数为实体类的类型，值参数为实体类主键（sqala会自动从注解信息中推断主键类型，您无需额外配置类型信息，并且这个操作是完全类型安全的）。

此方法返回类型为实体类类型的`Option`类型 。

之所以使用`findByPrimaryKey`而不是`findById`等名称，是因为sqala支持联合主键推导，将参数类型推导为元组类型：

```scala
case class Entity(@primaryKey x: Int, @primaryKey y: String, z: Int)

val result: Option[Entity] = db.findByPrimaryKey[Entity](1, "a")
```

`db.fetchByPrimaryKeys`方法支持批量查找：

```scala
val ids = List(1, 2, 3)
val result: List[User] = db.fetchByPrimaryKeys[User](ids)
```

此方法返回类型为实体类类型的`List`类型。

如果是联合主键，则使用元组集合即可：

```scala
val keys = List((1, "a"), (2, "b"), (3, "c"))
val result: List[Entity] = db.fetchByPrimaryKeys[Entity](keys)
```

## 查询数据

`db.fetch`是sqala查询数据的主要方式，使用Scala3强大的类型系统提供完全类型安全的查询操作。

`db.fetch`方法配合[查询DSL](./query.md)查询数据，并返回对应的`List`类型结果：

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

// 返回类型自动推导为List[User]
val result = db.fetch(q)
```

如果不希望使用sqala自动推导出的类型，我们可以使用`db.fetchTo`方法手动传入类型参数，但如果类型与实际返回不符，**则可能在运行时返回类型转换错误**：

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

val result: List[SomeType] = db.fetchTo[SomeType](q)
```

## 查询单条数据

`db.find`是`db.fetch`的单条数据优化版本，其返回`Option`而不是`List`，并且会自动优化查询，添加类似`LIMIT 1`的信息（视数据库方言而定）：

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

// 返回类型自动推导为Option[User]
val result = db.find(q)
```

如果不希望使用sqala自动推导出的类型，使用`db.findTo`方法即可，用法类似`db.fetchTo`，不赘述。

## 查询行数

`db.fetchCount`获取查询的结果行数，返回`Long`类型结果，为了提高此类查询的性能和结果准确性，此方法会自动优化查询：

1. **移除冗余信息**：首先去掉最外层查询中的`ORDER BY`和`LIMIT`，这在查询总行数的场景中是不必要的，只会拖慢数据库响应速度，或影响结果准确性；
2. **简单查询优化**：如果最外层查询是`SELECT`查询，且不包含`DISTINCT`、`GROUP BY`等信息，直接将查询列表替换为`COUNT(*)`；
3. **复杂查询优化**：如果最外层查询不是`SELECT`查询（比如`UNION`）或包含`DISTINCT`、`GROUP BY`等信息，则将原查询作为子查询，并在外侧查询中查询`COUNT(*)`。

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

val result: Long = db.fetchCount(q)
```

## 查询存在性

`db.fetchExists`方法查询数据存在性，在不关心实际数据和条数，只关心数据是否存在的场景中使用，通常性能优于`db.fetchCount`后判断返回数是否大于0：

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

val result: Boolean = db.fetchExists(q)
```

## 分页查询

`db.page`方法用于分页查询，其返回`Page`类型结果，`Page`类型定义如下：

```scala
case class Page[T](
    pageTotal: Int,  // 总页数
    querySize: Long, // 查询COUNT(*)返回的条目数
    pageNo: Int,     // 当前页码
    pageSize: Int,   // 页大小
    data: List[T]    // 分页数据
)
```

`db.page`的参数分别为：查询语句、页大小、页码、是否需要查询条数和总页数（默认为true）。

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

val result = db.page(q, 10, 1)
```

每页都查询数据条数和总页数是不必要的，我们通常可以只在第一页查询条数和总页数，避免浪费数据库性能：

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

val result = db.page(q, pageSize, pageNo, pageNo == 1)
```

## 执行语句

对于非查询类语句（比如DML、DDL等），使用`db.execute`方法执行，并返回`Int`类型的受影响行数，DML类语句构建请参考[增删改DSL](./update.md)：

```scala
val result: Int = db.execute(...)
```

## 游标查询

在需要大批量操作数据的场景中（比如导出数据到文件），如果我们将数据一次性查入到内存，会导致响应时间过长、内存占用过大的问题，如果采用分页查询，也有效率低下的问题，因此sqala支持JDBC游标查询，使用`db.cursorFetch`方法启用游标查询：

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

db.cursorFetch(q, 100): c =>
    // 对数据的操作 ...
```

`db.cursorFetch`的第一个参数是查询语句，第二个参数是每次获取的条目数，然后传入一个对**每一批次**数据的操作函数，类型为`Cursor[T] => R`

`Cursor`类型的定义为：

```scala
case class Cursor[T](
    batchNo: Int,    // 批次编码
    batchSize: Int,  // 批次大小，即cursorFetch的第二个参数
    data: List[T]    // 一批次的数据
)
```

## 返回SQL
`db.showSql`功能会返回sqala生成的SQL：

```scala
import sqala.static.dsl.*

val q = query:
    from(User)

val sql = db.showSql(q)
```

## 事务

`db.executeTransaction`方法用于创建一个事务上下文并执行，它是一个带有上下文的函数，内部出现异常会**回滚**事务并抛出异常，如无异常则会**提交**事务并返回函数中的返回值：

```scala
import sqala.jdbc.*

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

**需要注意的是，在事务方法体内不要使用`db`这样的显式数据上下文，而是用`transaction`对象来执行事务操作**。

利用Scala3的上下文抽象机制，我们可以方便地将事务上下文在不同方法之间共享（需要使用事务的方法上标记`using JdbcTransactionContext`），也就是编译期类型安全的**依赖注入**：

```scala
import sqala.jdbc.*

def insert(row: User)(using JdbcTransactionContext): Int =
    transaction.executeReturnKey(insert(row)).head.toInt

def delete(id: Int)(using JdbcTransactionContext): Int =
    transaction.execute(delete[User].where(d => d.id == id))

def insertAndDelete(row: User)(using JdbcTransactionContext): Int =
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

`db.executeTransactionWithIsolation`方法手动指定事务的隔离级别。

sqala支持的隔离级别有：

|         隔离级别                      |  说明   |
|:------------------------------------:|:-------:|
|TransactionIsolation.None             |不使用事务|
|TransactionIsolation.ReadUncommitted  |读未提交  |
|TransactionIsolation.ReadCommitted    |读已提交  |
|TransactionIsolation.RepeatableRead   |可重复读  |
|TransactionIsolation.Serializable     |序列化   |

```scala
import sqala.jdbc.*

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