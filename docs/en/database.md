# Database Interaction

After configuring the metadata of entity classes, you also need to configure the database connection information. sqala currently uses JDBC to interact with databases.

sqala requires a connection pool implementing `javax.sql.DataSource` as the connection manager. Any connection pool you prefer works, such as Hikari, Druid, DBCP, or C3P0.

Next, create an instance of `sqala.jdbc.JdbcContext`. To avoid resource leaks, it is best to keep this instance in a singleton `object`:

```scala
import sqala.jdbc.JdbcContext
import sqala.jdbc.dialect.PostgresqlJdbcDialect

object DB:
    // The first parameter is the connection pool, you can use any connection pool you like
    // The second parameter is the database dialect
    // The third parameter controls standard SQL escaping for inlined strings
    val db = JdbcContext(dataSource, PostgresqlJdbcDialect, true)
```

The second parameter of the context constructor is the JDBC dialect used by the database. sqala currently has built-in support for the following dialects (all can be imported from `sqala.jdbc.dialect`):

| JDBC Dialect |
| :----------------------: |
| `PostgresqlJdbcDialect` |
| `MysqlJdbcDialect` |
| `OracleJdbcDialect` |

The third parameter is `standardEscapeStrings`. It controls how **strings that must be inlined into the SQL text** are escaped, such as JSON paths, values explicitly inlined with `asInlinedExpr`, and special syntax required by some dialects. Ordinary string, numeric, boolean, and time literals are passed as JDBC `?` placeholders whenever possible and bound by a `PreparedStatement`, so they are not affected by this parameter.

If you are unsure which escaping mode your database uses, send the query `SELECT '\\'` to the database: if it returns `\\` (two backslashes), set the parameter to `true`; if it returns `\` (a single backslash), set it to `false`.

Usually, MySQL databases use `false`, while databases such as PostgreSQL and Oracle use `true`.

## Two Dialect Layers

sqala has two dialect types serving different purposes:

| Type | Package | Purpose | Generated SQL |
| --- | --- | --- | --- |
| `Dialect` | `sqala.dialect` | Plain SQL text generation such as `.sql(...)` and `queryToString` | Literals are inlined |
| `JdbcDialect` | `sqala.jdbc.dialect` | Execution through `JdbcContext` | `?` placeholders and a parameter array |

`JdbcDialect` extends `Dialect`, but its printer turns ordinary literals into `?` and collects their values. Therefore:

- Do not call `.sql()` with a `*JdbcDialect`; doing so produces placeholder SQL without the parameter values.
- `JdbcContext` requires a `JdbcDialect`; passing a plain `*Dialect` does not compile.

```scala
import sqala.dialect.PostgresqlDialect
import sqala.jdbc.dialect.PostgresqlJdbcDialect

val sql = query.sql(PostgresqlDialect, true)                   // plain SQL text
val db = JdbcContext(dataSource, PostgresqlJdbcDialect, true)  // executable SQL
```

Text dialects include `PostgresqlDialect`, `MysqlDialect`, `OracleDialect`, `SqlserverDialect`, `SqliteDialect`, and `H2Dialect`.

JDBC dialects include `PostgresqlJdbcDialect`, `MysqlJdbcDialect`, and `OracleJdbcDialect`.

## JDBC Parameters and Inlined Expressions

sqala prefers the `?` placeholders of JDBC prepared statements. Ordinary literals are collected as parameters and bound through a `PreparedStatement` at execution time:

```scala
val id = 1

val query =
    from(User).filter(u => u.id === id)

// The generated SQL is roughly:
// SELECT ... FROM "user" WHERE "id" = ?
```

However, the SQL syntax supported by sqala is far broader than ordinary value parameters. The following cases still require values to be inlined into the SQL text:

1. **Some values are themselves part of the SQL syntax and cannot be parameterized**: JSON paths in JSON features (such as `'$.a ? (@ > 1)'`) are written inside string constants and cannot be replaced with placeholders; row pattern quantifiers in `MATCH_RECOGNIZE` and quantifiers in property graph queries are also part of the SQL syntax. Some dialect-specific syntax may likewise require literals to appear directly in the SQL text.

2. **When the same expression appears repeatedly, it must remain exactly identical**: PostgreSQL matches by expression structure in `GROUP BY`. If placeholders are used, `SELECT x + ? FROM t GROUP BY x + ?` will be compiled by the JDBC driver into `x + $1` and `x + $2`, and the database will consider these to be two different expressions and refuse to execute the statement; if values are inlined directly, `SELECT x + 1 FROM t GROUP BY x + 1` is generated, both sides share the same structure, and the problem does not arise.

3. **`?` is itself an operator in some SQL syntax**: for example, in the row pattern quantifiers of `MATCH_RECOGNIZE` (`A?` meaning zero or one occurrence), `A*?`, `A+?`, and the quantifiers in property graph queries, `?` is part of the syntax. If `?` is treated as a placeholder as well, the JDBC driver will mistake these syntax symbols for parameters, and the statement cannot be executed at all.

In these cases, sqala automatically marks the literals that need inlining in the syntax tree (for example, JSON paths and row pattern quantifiers). If a business expression also needs to be forced inline, use `asInlinedExpr`, which renders the value directly as a SQL literal instead of generating a `?` placeholder. See the "Inlined Expressions" section of [Expressions](./expr.md) for usage and examples.

Values inlined by `asInlinedExpr` are safely escaped by sqala according to the configured dialect and `standardEscapeStrings`. For ordinary queries, prefer plain values or `asExpr` so that sqala can bind them through JDBC `?` placeholders, which is usually more efficient.

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
libraryDependencies += "cn.sqala" %% "sqala-slf4j" % "latest.integration"
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

With the connection information configured, sqala can connect to the database and execute queries.

## Querying Data by Primary Key

sqala supports querying data directly by primary key. Make sure the entity class declares its primary key field with the `primaryKey` or `autoInc` annotation, then query data with the `db.findByPrimaryKey` method:

```scala
val result: Option[User] = db.findByPrimaryKey[User](1)
```

The type parameter of this method is the type of the entity class, and the value parameter is the primary key of the entity class (sqala infers the primary key type automatically from the annotations, so no extra type configuration is needed, and the operation is fully type-safe).

The return type of this method is `Option` of the entity class type.

The method is named `findByPrimaryKey` rather than `findById` because sqala supports composite primary key inference, inferring the parameter type as a tuple type:

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

For composite primary keys, use a collection of tuples:

```scala
val keys = List((1, "a"), (2, "b"), (3, "c"))
val result: List[Entity] = db.fetchByPrimaryKeys[Entity](keys)
```

## Querying Data

`db.fetch` is sqala's primary way of querying data, using Scala 3's powerful type system to provide fully type-safe query operations.

The `db.fetch` method works with the [query DSL](./query.md) and returns the corresponding `List` result:

```scala
import sqala.static.dsl.*

val query =
    from(User)

// The return type is inferred as List[User]
val result = db.fetch(query)
```

If you do not want to use the type inferred by sqala, you can use the `db.fetchTo` method to pass the type parameter manually; however, if the type does not match the actual result, **a type conversion error may be thrown at runtime**:

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: List[SomeType] = db.fetchTo[SomeType](query)
```

## Querying a Single Row

`db.find` is the single-row optimized version of `db.fetch`. It returns `Option` instead of `List`, and automatically optimizes the query by adding a clause such as `LIMIT 1` (depending on the database dialect):

```scala
import sqala.static.dsl.*

val query =
    from(User)

// The return type is inferred as Option[User]
val result = db.find(query)
```

If you do not want to use the type inferred by sqala, just use the `db.findTo` method. Its usage is similar to that of `db.fetchTo`, so it is not elaborated here.

## Querying Row Count

`db.fetchCount` gets the number of rows returned by a query and returns a `Long` result. To improve the performance and result accuracy of such queries, the method optimizes the query automatically:

1. **Remove redundant information**: remove `ORDER BY` and `LIMIT` from the outermost query first, since they are unnecessary when counting the total number of rows and only slow down the database response or affect result accuracy;
2. **Simple query optimization**: if the outermost query is a `SELECT` query and does not contain `DISTINCT`, `GROUP BY`, or similar information, directly replace the select list with `COUNT(*)`;
3. **Complex query optimization**: if the outermost query is not a `SELECT` query (such as `UNION`) or contains `DISTINCT`, `GROUP BY`, or similar information, use the original query as a subquery and query `COUNT(*)` in the outer query.

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: Long = db.fetchCount(query)
```

## Querying Existence

The `db.fetchExists` method checks whether data exists. Use it in scenarios where you only care about existence rather than the actual data or row count; its performance is usually better than calling `db.fetchCount` and checking whether the returned count is greater than 0:

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result: Boolean = db.fetchExists(query)
```

## Pagination Queries

The `db.page` method performs pagination queries and returns a `Page` result. The `Page` type is defined as follows:

```scala
case class Page[T](
    pageTotal: Int,  // Total number of pages
    querySize: Long, // Number of rows returned by the COUNT(*) query
    pageSize: Int,   // Page size
    pageNo: Int,     // Current page number
    data: List[T]    // Paged data
)
```

`Page` also provides a `map` method that transforms the element type while preserving the paging metadata:

```scala
val result: Page[UserDTO] = db.page(query, 10, 1).map(u => UserDTO(u.id, u.name))
```

The parameters of `db.page` are: the query statement, the page size, the page number, and whether the total row count needs to be queried (defaults to `true`).

```scala
import sqala.static.dsl.*

val query =
    from(User)

val result = db.page(query, 10, 1)
```

Querying the row count and total number of pages on every page is unnecessary; usually they only need to be queried on the first page, which avoids wasting database performance:

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

Fields annotated with `autoInc` in the entity class do not appear in the SQL statement, so the values of the corresponding fields can be anything.

The return value of the `db.insert` method is the number of affected rows.

For a collection of entities, use the `db.insertBatch` method to write them in batches:

```scala
val users = List(User(0, "Alice"), User(0, "Bob"))

val result: Int = db.insertBatch(users)
```

If you want the auto-increment primary key generated by the database after insertion, use `db.insertAndReturn`:

```scala
val user = User(0, "Alice")

val result: User = db.insertAndReturn(user)
```

Once the insert succeeds, `db.insertAndReturn` binds the primary key returned by the database to a **new entity object**; it does **not** modify the original entity object **in place** the way some Java query libraries do.

For more complex insert requirements, see the [CUD DSL](./update.md) section.

## Updating Data

sqala supports using entity objects to update the values of other fields **by primary key**. Make sure the entity class declares its primary key field with the `primaryKey` or `autoInc` annotation, then use the `db.update` method to update data:

```scala
val user = User(0, "Alice")

val result: Int = db.update(user)
```

`db.update` returns the number of affected rows.

To handle nullable fields differently, `db.update` accepts an extra parameter `skipNone`, which defaults to `false`: by default, sqala maps `None` values to database `NULL` updates. If `skipNone` is set to `true`, fields whose value is `None` are skipped when generating SQL:

```scala
val user = User(1, "Alice")

val result: Int = db.update(user, skipNone = true)
```

Note that if `skipNone` skips every field, `db.update` returns `0` directly and executes no SQL at all.

For more complex update requirements, see the [CUD DSL](./update.md) section.

## Inserting or Updating Data

For requirements where the primary key value decides whether to insert or update data, sqala provides the `db.save` method:

```scala
val user = User(1, "Alice")

val result: Int = db.save(user)
```

This operation handles dialect differences automatically and generates different commands on different databases.

## Deleting Data by Primary Key

sqala supports deleting data directly by primary key. Make sure the entity class declares its primary key field with the `primaryKey` or `autoInc` annotation, then use the `db.deleteByPrimaryKey` method to delete data:

```scala
val result: Int = db.deleteByPrimaryKey[User](1)
```

The usage is similar to that of `findByPrimaryKey`.

You can also use `db.deleteByPrimaryKeys` to delete in batches:

```scala
val result: Int = db.deleteByPrimaryKeys[User](List(1, 2, 3))
```

## Executing Statements

For non-query statements, use the `db.execute` method, which returns the number of affected rows as an `Int`. See the [CUD DSL](./update.md) for building such statements:

```scala
val result: Int = db.execute(...)
```

## Cursor Queries

In scenarios that operate on large amounts of data (for example, exporting data to a file), loading all data into memory at once leads to long response times and high memory usage, while pagination queries are inefficient. Therefore sqala supports JDBC cursor queries, enabled through the `db.cursorFetch` method:

```scala
import sqala.static.dsl.*

val query =
    from(User)

db.cursorFetch(query, 100): c =>
    // Operations on the data ...
```

The first parameter of `db.cursorFetch` is the query statement, the second is the number of rows fetched each time, and the last is a function that processes **each batch** of data, with type `Cursor[T] => R`.

The `Cursor` type is defined as follows:

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

The `db.executeTransaction` method creates a transaction context and executes a block inside it. If an exception occurs, the transaction is **rolled back** and the exception is rethrown; otherwise, the transaction is **committed** and the block's return value is returned:

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

Using Scala 3's context abstraction, a transaction context can be shared easily between methods (methods that need the transaction are marked with `using JdbcTransactionContext`), which is compile-time type-safe **dependency injection**:

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

`executeTransaction` supports nesting. If a `JdbcTransactionContext` is already in scope, an inner call joins the outer transaction and does not commit or roll back independently. `executeTransactionWithIsolation` also joins the current transaction; the requested isolation level is ignored in that case.

The `db.executeTransactionWithIsolation` method lets you specify the transaction isolation level manually.

The isolation levels supported by sqala are:

| Isolation Level | Description |
| :------------------------------------: | :--------------: |
| TransactionIsolation.None | Sets the JDBC isolation level to `TRANSACTION_NONE`; the transaction block still commits/rolls back normally, and the actual isolation semantics depend on the driver |
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

### Savepoints

`db.currentTransaction` returns the current `JdbcTransactionContext`, which can be used to create and manage savepoints:

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

`createSavepoint()` creates an unnamed savepoint and `createSavepoint(name)` creates a named one. `rollbackToSavepoint` rolls back to the savepoint, and `releaseSavepoint` releases it.

Savepoints depend on database and JDBC driver support.

In a Spring application, use Spring's transaction management instead of sqala's native transactions.