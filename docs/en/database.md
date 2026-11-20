# Database Interaction

After configuring the metadata of entity classes, we also need to configure the database connection information. Currently sqala uses JDBC to support database interaction.

sqala requires a connection pool that extends `javax.sql.DataSource` as the connection manager. You can use any connection pool you like, such as Hikari, Druid, DBCP, C3P0, etc.

We need to create an instance of `sqala.jdbc.JdbcContext`. To avoid resource leaks, it is best to put this instance in a singleton `object`:

```scala
import sqala.jdbc.JdbcContext
import sqala.jdbc.dialect.PostgresqlJdbcDialect

object DB:
    // The first parameter is the connection pool, you can use any connection pool you like
    // The second parameter is the database dialect
    // The third parameter controls standard SQL escaping for inlined strings
    val db = JdbcContext(dataSource, PostgresqlJdbcDialect, true)
```

Besides the connection pool, the second parameter passed to the context constructor is the JDBC dialect used by the database. Currently sqala has built-in support for the following dialects (all can be imported from `sqala.jdbc.dialect`):

| JDBC Dialect |
| :----------------------: |
| `PostgresqlJdbcDialect` |
| `MysqlJdbcDialect` |
| `OracleJdbcDialect` |

The third parameter is `standardEscapeStrings`. It controls how **strings that must be inlined into the SQL text** are escaped, such as JSON paths, values explicitly inlined with `asInlinedExpr`, and special syntax required by some dialects. Ordinary string, numeric, boolean, and time literals are preferably passed as JDBC `?` placeholders and bound by a `PreparedStatement`, so they are not affected by this parameter.

If you are not sure which escaping mode your database uses, you can send the query `SELECT '//'` to the database. If the database returns `//`, set it to `true`; if it returns `/`, set it to `false`.

Usually, MySQL databases use `false`, while databases such as PostgreSQL and Oracle use `true`.

## JDBC Parameters and Inlined Expressions

sqala prefers JDBC prepared statement `?` placeholders. Ordinary literals are collected as parameters and bound through a `PreparedStatement` at execution time:

```scala
val id = 1

val query =
    from(User).filter(u => u.id === id)

// The generated SQL is roughly:
// SELECT ... FROM "user" WHERE "id" = ?
```

However, the SQL syntax supported by sqala is much broader than ordinary value parameters. The following cases still require values to be inlined into the SQL text:

1. **Some values are themselves part of the SQL syntax and cannot be parameterized**: JSON paths in JSON features (such as `'$.a ? (@ > 1)'`) are written inside string constants and cannot be replaced with placeholders; row pattern quantifiers in `MATCH_RECOGNIZE` and quantifiers in property graph queries are also part of the SQL syntax. Some dialect-specific syntax may likewise require literals to appear directly in the SQL text.

2. **When the same expression appears repeatedly, it must remain exactly identical**: PostgreSQL matches by expression structure in `GROUP BY`. If placeholders are used, `SELECT x + ? FROM t GROUP BY x + ?` will be compiled by the JDBC driver into `x + $1` and `x + $2`, and the database will consider these to be two different expressions and refuse to execute the statement; if values are inlined directly, `SELECT x + 1 FROM t GROUP BY x + 1` is generated, both sides have the same structure, and this problem does not occur.

3. **`?` is itself an operator in some SQL syntax**: for example, in the row pattern quantifiers of `MATCH_RECOGNIZE` (`A?` meaning zero or one occurrence), `A*?`, `A+?`, and the quantifiers in property graph queries, `?` is part of the syntax. If it is treated as a placeholder as well, the JDBC driver will mistake these syntax symbols for parameters, and the statement cannot be executed at all.

For these cases, sqala automatically marks the literals that need to be inlined in the syntax tree (for example, JSON paths and row pattern quantifiers). If your own expression also needs to be forced inline, use `asInlinedExpr`, which renders the value directly as a SQL literal instead of generating a `?` placeholder. See the "Inlined Expressions" section in [Expressions](./expr.md) for usage and examples.

Values inlined by `asInlinedExpr` are safely escaped by sqala according to the configured dialect and `standardEscapeStrings`. For ordinary queries, prefer plain values or `asExpr` so that sqala can bind them through JDBC `?` parameters, which is usually more efficient.

### Escaping Inlined Strings

For strings that must be inlined, sqala applies the following escaping rules:

- Single quotes in strings are always escaped by doubling them (`''`);
- When the third parameter is `true`, the standard SQL escaping mode is used, and backslashes are treated as ordinary characters;
- When the third parameter is `false`, backslashes are escaped additionally, to be compatible with the default escaping mode of MySQL.

## Configuring Logging

sqala emits JDBC execution logs through a `sqala.jdbc.Logger`. A `Logger` receives structured `LogEvent` values that contain the log level, operation kind, SQL statement, bound parameters, elapsed time, affected row count, and error information.

Logging is optional. When no `given Logger` is provided, sqala uses `Logger.noop` and produces no output.

Using console output:

```scala
import sqala.jdbc.Logger

given Logger = Logger.console()
```

The arguments of `Logger.console` are the level used for successful operations, whether to output arguments, and the maximum rendered argument length.

Using the JDK's `java.util.logging`:

```scala
import sqala.jdbc.{JdkLogger, Logger}

given Logger = JdkLogger("sqala")
```

`JdkLogger` uses the `info` level by default, matching the JDK logging defaults.

If you use SLF4J, add the `sqala-slf4j` module:

```scala
libraryDependencies += "com.wz7982" %% "sqala-slf4j" % "latest.integration"
```

Then import its default `given`:

```scala
import sqala.slf4j.given
```

You can also create a custom instance:

```scala
import sqala.jdbc.{LogLevel, Logger}
import sqala.slf4j.Slf4jLogger

given Logger = Slf4jLogger("my-service", level = LogLevel.Info)
```

Apart from `sqala-jdbc`, `sqala-slf4j` depends only on `slf4j-api` and does not bring in a logging implementation. The logging implementation is still chosen by the application.

For Spring Boot logging configuration, see [Spring Boot Integration](./spring-boot.md).

After configuring the connection information, we can use sqala to connect to the database and execute queries.

## Querying Data by Primary Key

sqala supports querying data directly by primary key. Make sure the primary key field is configured with the `primaryKey` or `autoInc` annotation on the entity class, then use the `db.findByPrimaryKey` method to query data:

```scala
val result: Option[User] = db.findByPrimaryKey[User](1)
```

The type parameter of this method is the type of the entity class, and the value parameter is the primary key of the entity class (sqala automatically infers the primary key type from the annotation information, so you do not need to configure type information additionally, and this operation is fully type-safe).

The return type of this method is `Option` of the entity class type.

The reason for using `findByPrimaryKey` rather than names such as `findById` is that sqala supports composite primary key inference, inferring the parameter type as a tuple type:

```scala
case class Entity(@primaryKey x: Int, @primaryKey y: String, z: Int)

val result: Option[Entity] = db.findByPrimaryKey[Entity](1, "a")
```

The `db.fetchByPrimaryKeys` method supports batch lookup:

```scala
val ids = List(1, 2, 3)
val result: List[User] = db.fetchByPrimaryKeys[User](ids)
```

The return type of this method is `List` of the entity class type.

For composite primary keys, just use a collection of tuples:

```scala
val keys = List((1, "a"), (2, "b"), (3, "c"))
val result: List[Entity] = db.fetchByPrimaryKeys[Entity](keys)
```

## Querying Data

`db.fetch` is the main way to query data with sqala, using the powerful type system of Scala 3 to provide fully type-safe query operations.

The `db.fetch` method works with the [query DSL](./query.md) to query data and returns the corresponding `List` type result:

```scala
import sqala.static.dsl.*

val query =
    from(User)

// The return type is inferred as List[User]
val result = db.fetch(query)
```

If you do not want to use the type inferred automatically by sqala, we can use the `db.fetchTo` method to pass the type parameter manually, but if the type does not match the actual return, **a type conversion error may be raised at runtime**:

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: List[SomeType] = db.fetchTo[SomeType](query)
```

## Querying a Single Row

`db.find` is the single-row optimized version of `db.fetch`. It returns `Option` instead of `List`, and automatically optimizes the query by adding information such as `LIMIT 1` (depending on the database dialect):

```scala
import sqala.static.dsl.*

val query =
    from(User)

// The return type is inferred as Option[User]
val result = db.find(query)
```

If you do not want to use the type inferred automatically by sqala, just use the `db.findTo` method. Its usage is similar to `db.fetchTo`, so we will not elaborate here.

## Querying Row Count

`db.fetchCount` gets the number of rows returned by a query and returns a `Long` type result. To improve the performance and result accuracy of such queries, this method automatically optimizes the query:

1. **Remove redundant information**: first remove `ORDER BY` and `LIMIT` from the outermost query, which are unnecessary when counting the total number of rows and only slow down the database response or affect result accuracy;
2. **Simple query optimization**: if the outermost query is a `SELECT` query and does not contain `DISTINCT`, `GROUP BY`, or similar information, directly replace the select list with `COUNT(*)`;
3. **Complex query optimization**: if the outermost query is not a `SELECT` query (such as `UNION`) or contains `DISTINCT`, `GROUP BY`, or similar information, use the original query as a subquery and query `COUNT(*)` in the outer query.

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: Long = db.fetchCount(query)
```

## Querying Existence

The `db.fetchExists` method queries whether data exists. It is used in scenarios where you do not care about the actual data or the number of rows and only care about whether data exists, and its performance is usually better than calling `db.fetchCount` and then checking whether the returned count is greater than 0:

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: Boolean = db.fetchExists(query)
```

## Pagination Queries

The `db.page` method is used for pagination queries and returns a `Page` type result. The `Page` type is defined as follows:

```scala
case class Page[T](
    pageTotal: Int,  // Total number of pages
    querySize: Long, // Number of rows returned by the COUNT(*) query
    pageSize: Int,   // Page size
    pageNo: Int,     // Current page number
    data: List[T]    // Paged data
)
```

The parameters of `db.page` are: the query statement, the page size, the page number, and whether the total row count needs to be queried (defaults to `true`).

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result = db.page(query, 10, 1)
```

Querying the row count and total number of pages on every page is unnecessary. We can usually query the count and total number of pages only on the first page, to avoid wasting database performance:

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result = db.page(query, pageSize, pageNo, pageNo == 1)
```

## Inserting Data

sqala supports generating database `INSERT` statements directly from entity objects. Use `db.insert` for simple insert operations:

```scala
val user = User(0, "Alice")

val result: Int = db.insert(user)
```

Fields configured with the `autoInc` annotation in the entity class do not appear in the SQL statement, so the values of the corresponding fields can be anything.

The return value of the `db.insert` method is the number of affected rows.

If you have a collection of entities, we can use the `db.insertBatch` method to write them in batches:

```scala
val users = List(User(0, "Alice"), User(0, "Bob"))

val result: Int = db.insertBatch(users)
```

If you want to get the auto-increment primary key generated by the database after insertion, we can use `db.insertAndReturn`:

```scala
val user = User(0, "Alice")

val result: User = db.insertAndReturn(user)
```

After the database successfully executes the insert, `db.insertAndReturn` binds the primary key value returned by the database to a **new entity object**, and does **not** modify the original entity object **in place** like some Java query libraries do.

For more complex insert requirements, please refer to the [CUD DSL](./update.md) section.

## Updating Data

sqala supports using entity objects to update the values of other fields **by primary key**. Make sure the primary key field is configured with the `primaryKey` or `autoInc` annotation on the entity class, then use the `db.update` method to update data:

```scala
val user = User(0, "Alice")

val result: Int = db.update(user)
```

`db.update` returns the number of affected rows.

To handle nullable fields differently, `db.update` supports an extra parameter `skipNone`, which defaults to `false`. That is, sqala's default strategy is to map `None` values to database `NULL` updates; if `skipNone` is set to `true`, fields whose value is `None` are skipped when generating SQL:

```scala
val user = User(1, "Alice")

val result: Int = db.update(user, skipNone = true)
```

For more complex update requirements, please refer to the [CUD DSL](./update.md) section.

## Inserting or Updating Data

For requirements where the primary key value decides whether to insert or update data, sqala provides the `db.save` method:

```scala
val user = User(1, "Alice")

val result: Int = db.save(user)
```

This operation is dialect-compatible and generates different commands in different databases.

## Deleting Data by Primary Key

sqala supports deleting data directly by primary key. Make sure the primary key field is configured with the `primaryKey` or `autoInc` annotation on the entity class, then use the `db.deleteByPrimaryKey` method to delete data:

```scala
val result: Int = db.deleteByPrimaryKey[User](1)
```

The usage is similar to `findByPrimaryKey`.

You can also use the `db.deleteByPrimaryKeys` method to delete in batches:

```scala
val result: Int = db.deleteByPrimaryKeys[User](List(1, 2, 3))
```

## Executing Statements

For non-query statements, use the `db.execute` method to execute them, and it returns the number of affected rows as an `Int`. For building such statements, please refer to the [CUD DSL](./update.md):

```scala
val result: Int = db.execute(...)
```

## Cursor Queries

In scenarios that need to operate on large amounts of data (for example, exporting data to a file), loading all data into memory at once leads to long response times and high memory usage, while pagination queries are inefficient. Therefore sqala supports JDBC cursor queries. Use the `db.cursorFetch` method to enable cursor queries:

```scala
import sqala.static.dsl.*

val query =
    from(User)

db.cursorFetch(query, 100): c =>
    // Operations on the data ...
```

The first parameter of `db.cursorFetch` is the query statement, the second parameter is the number of rows fetched each time, and then you pass a function that operates on **each batch** of data, with type `Cursor[T] => R`.

The `Cursor` type is defined as:

```scala
case class Cursor[T](
    batchNo: Int,    // Batch number
    batchSize: Int,  // Batch size, i.e. the second parameter of cursorFetch
    data: List[T]    // Data of one batch
)
```

## Returning SQL
`db.showSql` returns the generated SQL string together with the corresponding argument array:

```scala
import sqala.static.dsl.*

val query =
    from(User)

val (sql, args) = db.showSql(query)
```

The `?` placeholders in `sql` correspond one-to-one, in order, with the arguments in `args`, and can be passed directly to a `PreparedStatement`.

## Transactions

The `db.executeTransaction` method is used to create and execute a transaction context. It is a function that takes a context; if an exception occurs inside, the transaction is **rolled back** and the exception is rethrown. If no exception occurs, the transaction is **committed** and the value returned by the function is returned:

```scala
import sqala.jdbc.*

try {
    val result = db.executeTransaction {
        db.execute(...)
        db.execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("Query error")
}
```

Using the context abstraction mechanism of Scala 3, we can easily share a transaction context between different methods (methods that need the transaction must be marked with `using JdbcTransactionContext`), which is compile-time type-safe **dependency injection**:

```scala
import sqala.jdbc.*

def insert(row: User)(using JdbcTransactionContext): Int =
    db.insertAndReturn(row).head.toInt

def delete(id: Int)(using JdbcTransactionContext): Int =
    db.execute(delete[User].where(d => d.id === id))

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

The `db.executeTransactionWithIsolation` method lets you specify the transaction isolation level manually.

The isolation levels supported by sqala are:

| Isolation Level | Description |
| :------------------------------------: | :--------------: |
| TransactionIsolation.None | Do not use transactions |
| TransactionIsolation.ReadUncommitted | Read uncommitted |
| TransactionIsolation.ReadCommitted | Read committed |
| TransactionIsolation.RepeatableRead | Repeatable read |
| TransactionIsolation.Serializable | Serializable |

```scala
import sqala.jdbc.*

try {
    val result = db.executeTransactionWithIsolation(TransactionIsolation.ReadUncommitted) {
        db.execute(...)
        db.execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("Query error")
}
```