# 数据库交互

配置好实体类的元数据之后，还需要配置数据库的连接信息。目前sqala使用JDBC支撑与数据库交互的能力。

sqala需要一个实现了`javax.sql.DataSource`接口的连接池作为连接管理器，可自由选择熟悉的连接池，如Hikari、Druid、DBCP、C3P0等。

接下来创建`sqala.jdbc.JdbcContext`实例。为避免资源泄露，建议将该实例保存在某个`object`单例对象中：

```scala
import sqala.jdbc.JdbcContext
import sqala.jdbc.dialect.PostgresqlJdbcDialect

object DB:
    // 第一个参数是连接池，您可以使用自己喜欢的连接池
    // 第二个参数是数据库方言
    // 第三个参数是内联字符串是否使用SQL标准转义
    val db = JdbcContext(dataSource, PostgresqlJdbcDialect, true)
```

连接上下文构造函数的第二个参数是数据库使用的JDBC方言，目前sqala内置支持以下方言（均可从`sqala.jdbc.dialect`导入）：

| JDBC方言 |
| :---------------------: |
| `PostgresqlJdbcDialect` |
| `MysqlJdbcDialect` |
| `OracleJdbcDialect` |

第三个参数是`standardEscapeStrings`，它决定**必须内联到SQL文本中的字符串**如何转义，例如JSON path、使用`asInlinedExpr`显式内联的值，以及部分方言的特殊语法。普通字符串、数字、布尔值、时间等字面量会优先通过JDBC的`?`占位符传递，由`PreparedStatement`完成参数绑定，不受该参数影响。

如果不确定数据库采用哪种转义模式，可以向数据库发送查询`SELECT '\\'`：若返回`\\`（两个反斜杠）则填`true`，若返回`\`（单个反斜杠）则填`false`。

通常，MySQL数据库填写`false`，PostgreSQL和Oracle等数据库填写`true`。

## 方言的两个层次

sqala有两套方言类型，用途不同：

| 类型 | 包 | 用途 | 生成的SQL |
| --- | --- | --- | --- |
| `Dialect` | `sqala.dialect` | `.sql(...)`、`queryToString`等纯文本SQL生成 | 字面量直接内联 |
| `JdbcDialect` | `sqala.jdbc.dialect` | `JdbcContext`执行 | `?`占位符和参数数组 |

`JdbcDialect`继承自`Dialect`，但其printer会将普通字面量转为`?`并收集参数。因此：

- 不要使用`*JdbcDialect`调用`.sql()`，否则只会得到不含参数值的占位符SQL。
- `JdbcContext`需要`JdbcDialect`，传入普通的`*Dialect`会编译失败。

```scala
import sqala.dialect.PostgresqlDialect
import sqala.jdbc.dialect.PostgresqlJdbcDialect

val sql = query.sql(PostgresqlDialect, true)                   // 纯文本SQL
val db = JdbcContext(dataSource, PostgresqlJdbcDialect, true)  // 执行SQL
```

文本方言包括`PostgresqlDialect`、`MysqlDialect`、`OracleDialect`、`SqlserverDialect`、`SqliteDialect`、`H2Dialect`。

JDBC方言包括`PostgresqlJdbcDialect`、`MysqlJdbcDialect`、`OracleJdbcDialect`。

## JDBC参数与内联表达式

sqala默认优先使用JDBC预编译语句的`?`占位符。普通字面量会被收集为参数，并在执行时通过`PreparedStatement`绑定：

```scala
val id = 1

val query =
    from(User).filter(u => u.id === id)

// 生成的SQL大致为：
// SELECT ... FROM "user" WHERE "id" = ?
```

但sqala支持的SQL语法范围远超普通值参数，以下情况仍必须将值内联到SQL文本中：

1. **有些值本身就是SQL语法的一部分，无法参数化**：JSON功能中的JSON path（如`'$.a ? (@ > 1)'`）写在字符串常量中，无法替换为占位符；`MATCH_RECOGNIZE`的行模式量词、属性图查询中的量词等也属于SQL语法的一部分。少数方言特有的语法同样可能要求字面量直接出现在SQL文本中。

2. **同一表达式重复出现时，必须保持完全一致**：PostgreSQL在`GROUP BY`中按表达式结构进行匹配。如果使用占位符，`SELECT x + ? FROM t GROUP BY x + ?`会被JDBC驱动编译成`x + $1`和`x + $2`，数据库会认为这是两个不同的表达式而拒绝执行；把值直接内联后生成`SELECT x + 1 FROM t GROUP BY x + 1`，两侧结构一致，便不存在该问题。

3. **`?`在某些SQL语法中本身就是运算符**：比如`MATCH_RECOGNIZE`的行模式量词`A?`（出现零次或一次）、`A*?`、`A+?`，以及属性图查询中的量词，`?`都是语法的一部分。若再将其用作占位符，JDBC驱动会把这些语法符号误认为参数，语句根本无法执行。

针对这些情况，sqala会自动在语法树中标记需要内联的字面量（例如JSON path、行模式量词等）。如果业务表达式也需要强制内联，可以使用`asInlinedExpr`，它会把值直接渲染为SQL字面量，而不是生成`?`占位符。用法和示例请参考[表达式](./expr.md)中的“内联表达式”部分。

`asInlinedExpr`内联的值会由sqala按照当前方言和`standardEscapeStrings`配置进行安全转义。对于普通查询，仍推荐直接写值或使用`asExpr`，由sqala通过JDBC的`?`占位符绑定参数，通常性能更好。

### 内联字符串的转义

对于必须内联的字符串，sqala会按以下规则处理转义：

- 字符串中的单引号始终通过双写（`''`）转义；
- 第三个参数为`true`时使用标准SQL转义模式，反斜杠按普通字符处理；
- 第三个参数为`false`时额外转义反斜杠，以兼容MySQL的默认转义模式。

## 配置日志

sqala通过`sqala.jdbc.Logger`输出JDBC执行日志。`Logger`接收结构化的`LogEvent`，其中包含日志级别、操作类型、SQL语句、绑定参数、执行耗时、影响行数和异常信息。

日志是可选的。若未提供`given Logger`，sqala会使用`Logger.noop`，不产生任何输出。

使用控制台输出：

```scala
import sqala.jdbc.Logger

given Logger = Logger.console()
```

`Logger.console`的参数依次是成功操作使用的日志级别、是否输出参数和参数最大长度。

使用JDK自带的`java.util.logging`：

```scala
import sqala.jdbc.{JdkLogger, Logger}

given Logger = JdkLogger("sqala")
```

`JdkLogger`默认使用`info`级别，与JDK日志的默认级别一致。

如果使用SLF4J，可以引入`sqala-slf4j`模块：

```scala
libraryDependencies += "cn.sqala" %% "sqala-slf4j" % "latest.integration"
```

然后直接导入默认的`given`：

```scala
import sqala.slf4j.given
```

也可以自定义实例：

```scala
import sqala.jdbc.{LogLevel, Logger}
import sqala.slf4j.Slf4jLogger

given Logger = Slf4jLogger("my-service", level = LogLevel.Info)
```

`sqala-slf4j`除`sqala-jdbc`外只依赖`slf4j-api`，不会引入任何日志实现，日志实现仍由应用自行选择。

Spring Boot项目中的日志配置请参考[Spring Boot 集成](./spring-boot.md)。

配置好连接信息后，即可使用sqala连接数据库执行查询。

## 按主键查询数据

sqala支持直接使用主键查询数据。请确保实体类已通过`primaryKey`或`autoInc`注解配置主键字段，然后使用`db.findByPrimaryKey`方法查询数据：

```scala
val result: Option[User] = db.findByPrimaryKey[User](1)
```

此方法的类型参数为实体类类型，值参数为实体类主键（sqala会自动从注解信息中推断主键类型，无需额外配置类型信息，且该操作完全类型安全）。

此方法的返回类型为实体类类型的`Option`。

方法名采用`findByPrimaryKey`而非`findById`等，是因为sqala支持联合主键推导，会将参数类型推导为元组类型：

```scala
case class Entity(@primaryKey x: Int, @primaryKey y: String, z: Int)

val result: Option[Entity] = db.findByPrimaryKey[Entity](1, "a")
```

`db.fetchByPrimaryKeys`方法支持批量查找：

```scala
val ids = List(1, 2, 3)
val result: List[User] = db.fetchByPrimaryKeys[User](ids)
```

此方法的返回类型为实体类类型的`List`。

对于联合主键，使用元组集合即可：

```scala
val keys = List((1, "a"), (2, "b"), (3, "c"))
val result: List[Entity] = db.fetchByPrimaryKeys[Entity](keys)
```

## 查询数据

`db.fetch`是sqala查询数据的主要方式，借助Scala 3强大的类型系统提供完全类型安全的查询操作。

`db.fetch`方法配合[查询DSL](./query.md)使用，返回对应的`List`类型结果：

```scala
import sqala.static.dsl.*

val query =
    from(User)

// 返回类型自动推导为List[User]
val result = db.fetch(query)
```

如果不希望使用sqala自动推导的类型，可以使用`db.fetchTo`方法手动传入类型参数；但若类型与实际返回不符，**可能在运行时抛出类型转换错误**：

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: List[SomeType] = db.fetchTo[SomeType](query)
```

## 查询单条数据

`db.find`是`db.fetch`的单条数据优化版本，返回`Option`而非`List`，并会自动优化查询，添加类似`LIMIT 1`的语句（视数据库方言而定）：

```scala
import sqala.static.dsl.*

val query =
    from(User)

// 返回类型自动推导为Option[User]
val result = db.find(query)
```

如果不希望使用sqala自动推导的类型，使用`db.findTo`方法即可，用法与`db.fetchTo`类似，不再赘述。

## 查询行数

`db.fetchCount`获取查询的结果行数，返回`Long`类型结果。为提高此类查询的性能与结果准确性，该方法会自动优化查询：

1. **移除冗余信息**：首先去掉最外层查询中的`ORDER BY`和`LIMIT`——在统计总行数的场景中这些信息并无必要，只会拖慢数据库响应速度，或影响结果准确性；
2. **简单查询优化**：若最外层查询是`SELECT`查询，且不包含`DISTINCT`、`GROUP BY`等信息，则直接将查询列表替换为`COUNT(*)`；
3. **复杂查询优化**：若最外层查询不是`SELECT`查询（比如`UNION`）或包含`DISTINCT`、`GROUP BY`等信息，则将原查询作为子查询，在外层查询`COUNT(*)`。

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: Long = db.fetchCount(query)
```

## 查询存在性

`db.fetchExists`方法查询数据存在性，适用于不关心实际数据与条数、只需判断数据是否存在的场景，性能通常优于先调用`db.fetchCount`再判断返回数是否大于0：

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: Boolean = db.fetchExists(query)
```

## 分页查询

`db.page`方法用于分页查询，返回`Page`类型结果，其定义如下：

```scala
case class Page[T](
    pageTotal: Int,  // 总页数
    querySize: Long, // 查询COUNT(*)返回的条目数
    pageSize: Int,   // 页大小
    pageNo: Int,     // 当前页码
    data: List[T]    // 分页数据
)
```

`Page`还提供`map`方法，可在保留分页元信息的同时转换元素类型：

```scala
val result: Page[UserDTO] = db.page(query, 10, 1).map(u => UserDTO(u.id, u.name))
```

`db.page`的参数分别为：查询语句、页大小、页码、是否需要查询总条数（默认为`true`）。

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result = db.page(query, 10, 1)
```

每页都查询数据条数和总页数并无必要，通常只需在第一页查询条数和总页数，以避免浪费数据库性能：

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result = db.page(query, pageSize, pageNo, pageNo == 1)
```

## 新增数据

sqala支持直接使用实体对象生成数据库的`INSERT`语句，调用`db.insert`即可简单插入数据：

```scala
val user = User(0, "小明")

val result: Int = db.insert(user)
```

实体类中配置了`autoInc`注解的字段不会出现在SQL语句中，因此对应字段的值可以随意填写。

`db.insert`方法的返回值为受影响行数。

如果是一个实体集合，可使用`db.insertBatch`方法批量写入：

```scala
val users = List(User(0, "小明"), User(0, "小刚"))

val result: Int = db.insertBatch(users)
```

如果希望在插入后获得数据库生成的自增主键，可使用`db.insertAndReturn`：

```scala
val user = User(0, "小明")

val result: User = db.insertAndReturn(user)
```

`db.insertAndReturn`会在插入成功后，将数据库返回的主键值绑定到一个**新的实体对象**上，而**不会**像一些Java查询库那样直接**原地修改**原实体对象。

对于更复杂的新增数据需求，请参考[增删改DSL](./update.md)部分。

## 更新数据

sqala支持使用实体对象**按主键**更新其他字段的值。请确保实体类已通过`primaryKey`或`autoInc`注解配置主键字段，然后使用`db.update`方法更新数据：

```scala
val user = User(0, "小明")

val result: Int = db.update(user)
```

`db.update`返回受影响行数。

针对可空字段的处理方式，`db.update`支持一个额外参数`skipNone`，默认为`false`，即sqala默认将`None`值映射为数据库的`NULL`更新；若将`skipNone`设为`true`，生成SQL时会跳过值为`None`的字段：

```scala
val user = User(1, "小明")

val result: Int = db.update(user, skipNone = true)
```

注意：如果`skipNone`跳过所有字段后已无可更新字段，`db.update`将直接返回`0`，不会执行任何SQL。

对于更复杂的更新数据需求，请参考[增删改DSL](./update.md)部分。

## 新增或更新数据

对于“按主键值决定新增还是更新数据”的需求，sqala使用`db.save`方法来解决：

```scala
val user = User(1, "小明")

val result: Int = db.save(user)
```

此操作已做方言兼容，会在不同数据库中生成不同的命令。

## 按主键删除数据

sqala支持直接使用主键删除数据。请确保实体类已通过`primaryKey`或`autoInc`注解配置主键字段，然后使用`db.deleteByPrimaryKey`方法删除数据：

```scala
val result: Int = db.deleteByPrimaryKey[User](1)
```

用法与`findByPrimaryKey`类似。

也可使用`db.deleteByPrimaryKeys`方法批量删除：

```scala
val result: Int = db.deleteByPrimaryKeys[User](List(1, 2, 3))
```

## 执行语句

对于非查询类语句，使用`db.execute`方法执行，返回`Int`类型的受影响行数；此类语句的构建请参考[增删改DSL](./update.md)：

```scala
val result: Int = db.execute(...)
```

## 游标查询

在需要大批量操作数据的场景中（比如导出数据到文件），将数据一次性读入内存会导致响应时间过长、内存占用过大；若采用分页查询，又存在效率低下的问题。因此sqala支持JDBC游标查询，使用`db.cursorFetch`方法启用：

```scala
import sqala.static.dsl.*

val query =
    from(User)

db.cursorFetch(query, 100): c =>
    // 对数据的操作 ...
```

`db.cursorFetch`的第一个参数是查询语句，第二个参数是每次获取的条目数，之后传入一个针对**每一批次**数据的操作函数，类型为`Cursor[T] => R`。

`Cursor`类型的定义如下：

```scala
case class Cursor[T](
    batchNo: Int,    // 批次编码
    batchSize: Int,  // 批次大小，即cursorFetch的第二个参数
    data: List[T]    // 一批次的数据
)
```

## 返回SQL

`db.showSql`会返回sqala生成的SQL字符串和对应的参数数组：

```scala
import sqala.static.dsl.*

val query =
    from(User)

val (sql, args) = db.showSql(query)
```

`sql`中的`?`占位符与`args`中的参数按顺序一一对应，可直接用于`PreparedStatement`。

## 事务

`db.executeTransaction`方法用于创建事务上下文并在其中执行代码块：若内部出现异常，则**回滚**事务并抛出异常；若无异常，则**提交**事务并返回代码块的返回值：

```scala
import sqala.jdbc.*

try {
    val result = db.executeTransaction {
        db.execute(...)
        db.execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("查询错误")
}
```

利用Scala 3的上下文抽象机制，可以方便地将事务上下文在不同方法之间共享（需要使用事务的方法标记`using JdbcTransactionContext`），也就是编译期类型安全的**依赖注入**：

```scala
import sqala.jdbc.*
import sqala.static.dsl.*

def insert(row: User)(using JdbcTransactionContext): Int =
    db.insert(row)

def deleteUser(id: Int)(using JdbcTransactionContext): Int =
    db.execute(delete[User].where(d => d.id === id))

def insertAndDelete(row: User, id: Int)(using JdbcTransactionContext): Int =
    insert(row)
    deleteUser(id)

val user: User = ???

try {
    db.executeTransaction {
        insertAndDelete(user, 1)
    }
} catch {
    case e: Exception =>
}
```

`executeTransaction`支持嵌套调用。如果当前作用域中已存在`JdbcTransactionContext`，内层调用会直接加入外层事务，不会单独提交或回滚；`executeTransactionWithIsolation`在已有事务中同样会加入当前事务，此时指定的隔离级别会被忽略。

`db.executeTransactionWithIsolation`方法用于手动指定事务的隔离级别。

sqala支持的隔离级别有：

| 隔离级别 | 说明 |
| :------------------------------------: | :-------: |
| TransactionIsolation.None | 将隔离级别设为JDBC的`TRANSACTION_NONE`；事务块仍正常提交/回滚，隔离语义由驱动决定 |
| TransactionIsolation.ReadUncommitted | 读未提交 |
| TransactionIsolation.ReadCommitted | 读已提交 |
| TransactionIsolation.RepeatableRead | 可重复读 |
| TransactionIsolation.Serializable | 序列化 |

```scala
import sqala.jdbc.*

try {
    val result = db.executeTransactionWithIsolation(TransactionIsolation.ReadUncommitted) {
        db.execute(...)
        db.execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("查询错误")
}
```

### Savepoint

`db.currentTransaction`返回当前的`JdbcTransactionContext`，可用于创建和管理保存点：

```scala
import sqala.jdbc.*

val result = db.executeTransaction {
    db.execute(...)

    val tx = db.currentTransaction
    val savepoint = tx.createSavepoint("before_update")

    try
        db.execute(...)
        tx.releaseSavepoint(savepoint)
    catch
        case e: Exception =>
            tx.rollbackToSavepoint(savepoint)
            throw e
}
```

`createSavepoint()`创建匿名保存点，`createSavepoint(name)`创建命名保存点；`rollbackToSavepoint`回滚到保存点，`releaseSavepoint`释放保存点。

保存点依赖数据库和JDBC驱动的支持。

在Spring项目中，请使用Spring的事务管理，而非sqala原生事务。