# Database Interaction

To interact with the database, after configuring the metadata information of the entity classes, we also need to configure the database connection information. Currently, sqala supports creating a JDBC context to manage connections.

We construct a query context as follows:

```scala
import sqala.jdbc.*

import javax.sql.DataSource

// Any connection pool, such as Hikari, Druid, DBCP, C3P0, etc.
val dataSource: DataSource = ???

// The second parameter is the database dialect
// Supported dialects include:
// MysqlDialect
// PostgresqlDialect
// SqliteDialect
// OracleDialect
// MssqlDialect
// DB2Dialect
// H2Dialect
val db = JdbcContext(dataSource, MysqlDialect)
```

Then we need to configure a log handler to print the corresponding SQL statements when executing queries. Any function of type `String => Unit` can be used as a log handler. Here, we use the standard library's `println` as an example. In actual use, it can be replaced with various logging frameworks:

```scala
import sqala.jdbc.*

given Logger = Logger((s: String) => println(s))
```

If logging is not needed, simply write:

```scala
import sqala.jdbc.*

given Logger = Logger(_ => ())
```

After configuring the connection information, you can connect to the database and execute queries.

We do not need to manually write deserialization code for entity classes. If you encounter compilation errors, try using `CustomField`.

## Query Data

Use the `fetch` method to query data, which returns a List:

```scala
val q =
    from[Department].filter(_.id > 1)

val result: List[Department] = db.fetch(q)
```

We can use the `fetchTo` method to map the results to types not automatically derived by sqala, but this may result in runtime type conversion errors:

```scala
val result: List[SomeEntity] = db.fetchTo[SomeEntity](q)
```

## Query First Row

The `find` method returns an `Option` type result, which is the first row in the query result set:

```scala
val q = query:
    from[Department].filter(_.id > 1)

val result: Option[Department] = db.find(q)
```

The `findTo` method is similar to `fetchTo`:

```scala
val result: Option[SomeEntity] = db.findTo[SomeEntity](q)
```

## Query Count

Querying the count of data is a common operation. We can query count via the `fetchSize` method:

```scala
val q = query:
    from[Department].filter(_.id > 1)

val result: Long = db.fetchSize(q)
```

For better performance, when calling `fetchSize`, sqala will optimize the incoming query when possible:

    1. First, remove `ORDER BY` and `LIMIT` clauses.

    2. If query contains `GROUP BY` or `SELECT DISTINCT`, make the query a subquery of a `COUNT(*)` query.

    3. Otherwise, replace fields in `SELECT` with `COUNT(*)`

## Query Existence

Use `fetchExists` to query existence:

```scala
val q = query:
    from[Department].filter(_.id > 1)

val result: Boolean = db.fetchExists(q)
```

## Paging

Use the `page` method for pagination query, which returns a Page type result. The Page type is defined as follows:

```scala
case class Page[T](
    pageTotal: Int,  // Total pages
    querySize: Long, // Query COUNT(*) returned count
    pageNo: Int,     // Current page number
    pageSize: Int,   // Page size
    data: List[T]    // Paginated data
)
```

The parameters of `page` are: query statement, page size, page number, and whether to query count (default is true):

```scala
val q = query:
    from[Department]

val result: Page[Department] = db.page(q, 10, 1)
```

The last parameter controls whether to query the count. If the count is queried in every pagination query, it may waste database resources. For example, in actual business scenarios, we can query the count only on the first page and return 0 in other cases:

```scala
val q =
    from[Department]

val pageSize = 10
val pageNo = 1

val result: Page[Department] = db.page(q, pageSize, pageNo, pageNo == 1)
```

## Execute Statement

For non-query statements, use the `execute` method to execute the statement, which returns an Int type result, representing the number of affected rows:

```scala
val result: Int = db.execute(insert[Department](d => (d.managerId, d.name)) values (1, "IT"))
```

## Insert Data Using Objects

The `insert` method can use entity objects to generate insert statements and execute them, returning the number of affected rows (fields marked with `@autoInc` annotation will be skipped):

```scala
val department = Department(0, 1, "IT")

val result: Int = db.insert(department)
```

The `insertAndReturn` method can use entity objects to generate insert statements, execute them, and return a new entity object with non-auto-increment primary key field values and database-generated auto-increment primary key bound. Since fields marked with `@autoInc` will be skipped, the auto-increment primary key field of the inserted entity class can be filled with any irrelevant value:

```scala
val department = Department(0, 1, "IT")

val inserted = db.insertAndReturn(department)
```

The `insertBatch` method is used for batch insertion, with the parameter being a `List` of entity objects. After insertion, it returns the number of affected rows:

```scala
val departments = Department(0, 1, "IT") :: Department(0, 2, "Legal") :: Nil

val result: Int = db.insertBatch(departments)
```

## Update Data Using Objects

The `update` method can use entity objects to generate an update statement that updates other fields based on the primary key field, and execute it, returning the number of affected rows:

```scala
val department = Department(1, 10, "IT")

val result: Int = db.update(department)
```

If you want to skip updating fields with `None` value, you can pass `skipNone = true`:

```scala
val department = Department(1, 10, "IT")

val result: Int = db.update(department, skipNone = true)
```

To avoid generating incorrect inserts, if all non-primary key field values are `None`, this update request will not be sent to the database.

The `save` method can use entity objects to generate insert or update statements based on whether the primary key exists:

```scala
val department = Department(1, 10, "IT")

val result: Int = db.save(department)
```

The dialects generated by each database may vary.

## Cursor Query

In scenarios where large amounts of data need to be processed (such as exporting data to files), if we load all data into memory at once, it may cause excessive memory usage. If pagination queries are used, it may lead to inefficiency. Therefore, sqala supports JDBC cursor queries. Use `cursorFetch` to enable cursor queries:

```scala
val q = query:
    from[Department]

db.cursorFetch(q, 100): c =>
    // Operations on data
    ...
```

The first parameter of `cursorFetch` is the query statement, and the second parameter is the number of entries fetched in each batch. You can choose an appropriate size based on the actual situation.

Then pass in a function that operates on **each batch** of data, with the type `Cursor[T] => R`.

The `Cursor` type is defined as:

```scala
case class Cursor[T](
    batchNo: Int,    // Batch number
    batchSize: Int,  // Batch size, i.e., the second parameter of cursorFetch
    data: List[T]    // Data in a batch
)
```

## Return SQL

Use the `sql` method to return the generated SQL:

```scala
val q = query:
    from[Department].filter(_.id > 1)

val (sql, args) = q.sql(MysqlDialect)
```

## Transaction

Use `executeTransaction` method to create an transaction to execute. `executeTransaction` is a method carrying context. If an exception occurs inside, the transaction will be rolled back and the exception will be thrown. If no exception occurs, the return value inside will be returned:

```scala
try {
    val result = db.transaction {
        execute(...)
        execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("Query error")
}
```

A very important point is: do not use `transaction.` to explicitly specify the database connection context for query methods executed inside `executeTransaction`.

Using Scala3's context abstraction mechanism, we can conveniently propagate the transaction context between different methods, and this operation is type-safe:

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

By using `using JdbcTransactionContext`, a transaction context will be added to functions that need to execute transactions. If called outside the `executeTransaction` method, a compilation error will occur. Methods marked with `using JdbcTransactionContext` can share the same transaction within `transaction`.

Additionally, the `transactionWithIsolation` method can be used to specify the transaction isolation level.

```scala
try {
    val result = db.executeTransactionWithIsolation(TransactionIsolation.ReadUncommitted) {
        transaction.execute(...)
        transaction.execute(...)
    }
    println(result)
} catch {
    case e: Exception => println("Query Error")
}
```

`TransactionIsolation` is an Enum, values contains: `None`、`ReadUncommitted`、`ReadCommitted`、`RepeatableRead`和`Serializable`。
