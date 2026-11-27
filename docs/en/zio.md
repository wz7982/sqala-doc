# ZIO Integration

sqala does not ship an official ZIO module. JDBC is a synchronous, blocking API, so the recommended approach is to run sqala calls through `ZIO.attemptBlocking` and keep each transaction inside a single synchronous block.

This page describes the recommended pattern and several incorrect usages to avoid.

## Dependency

```scala
libraryDependencies ++= Seq(
    "cn.sqala" %% "sqala-jdbc" % "latest.integration",
    "cn.sqala" %% "sqala-slf4j" % "latest.integration",
    "dev.zio" %% "zio" % "2.1.27",
    "com.zaxxer" % "HikariCP" % "6.2.1",
    "org.postgresql" % "postgresql" % "42.7.4"
)
```

`sqala-slf4j` is an optional dependency. Without it, `Logger` falls back to `Logger.noop` and no SQL is logged.

## Why `attemptBlocking`

JDBC calls block the calling thread. Running them on ZIO's default executor occupies compute threads and can starve other effects.

```scala
import zio.*
import sqala.static.dsl.*

val users: ZIO[Any, Throwable, List[User]] =
    ZIO.attemptBlocking(db.fetch(from(User)))
```

`ZIO.attemptBlocking` moves the call to ZIO's blocking thread pool, so CPU-intensive tasks are not slowed down.

## Building Layers

```scala
import com.zaxxer.hikari.{HikariConfig, HikariDataSource}
import sqala.jdbc.JdbcContext
import sqala.jdbc.dialect.PostgresqlJdbcDialect
import zio.*

import javax.sql.DataSource

val dataSourceLayer: ZLayer[Any, Throwable, DataSource] =
    ZLayer.scoped {
        ZIO.acquireRelease(
            ZIO.attempt {
                val config = new HikariConfig()
                config.setJdbcUrl("jdbc:postgresql://localhost:5432/demo")
                config.setUsername("postgres")
                config.setPassword("123456")
                new HikariDataSource(config)
            }
        )(dataSource => ZIO.succeed(dataSource.close()))
    }

val jdbcContextLayer: ZLayer[DataSource, Nothing, JdbcContext] =
    ZLayer.fromFunction { (dataSource: DataSource) =>
        JdbcContext(dataSource, PostgresqlJdbcDialect, true)
    }
```

## Service

The examples below reuse the `User` entity from [Metadata Configuration](metadata).

```scala
import sqala.jdbc.JdbcContext
import sqala.static.dsl.*
import zio.*

trait UserService:
    def find(id: Long): ZIO[Any, Throwable, Option[User]]
    def all: ZIO[Any, Throwable, List[User]]
    def create(name: String): ZIO[Any, Throwable, User]

final class UserServiceLive(db: JdbcContext) extends UserService:
    import sqala.slf4j.given

    def find(id: Long): ZIO[Any, Throwable, Option[User]] =
        ZIO.attemptBlocking(db.findByPrimaryKey[User](id))

    def all: ZIO[Any, Throwable, List[User]] =
        ZIO.attemptBlocking(db.fetch(from(User)))

    def create(name: String): ZIO[Any, Throwable, User] =
        ZIO.attemptBlocking(db.insertAndReturn(User(0, name)))

val userServiceLayer: ZLayer[JdbcContext, Nothing, UserService] =
    ZLayer.fromFunction((db: JdbcContext) => UserServiceLive(db))
```

## Transactions

sqala transactions are **synchronous and lexically scoped**. In ZIO, the whole transaction must run inside **a single** `ZIO.attemptBlocking`:

```scala
import sqala.static.dsl.*

def transfer(fromId: Int, toId: Int, amount: BigDecimal): ZIO[Any, Throwable, Unit] =
    ZIO.attemptBlocking {
        db.executeTransaction {
            db.execute(update[Account].set(a => a.balance := a.balance - amount).where(_.id === fromId))
            db.execute(update[Account].set(a => a.balance := a.balance + amount).where(_.id === toId))
        }
    }.unit
```

The block runs on a single blocking thread. The connection stays bound for the whole block, and commit or rollback happens when the block finishes.

### Wrong: putting a ZIO inside the transaction block

```scala
// Wrong: the ZIO is only constructed, never executed
db.executeTransaction {
    ZIO.attemptBlocking(db.insert(User(1, "Alice")))
}
```

`executeTransaction` takes a synchronous block. The returned `ZIO` is treated as a plain value, the transaction commits immediately, and the `insert` is never executed.

### Wrong: spanning effects

```scala
// Wrong: each attemptBlocking gets its own connection and its own transaction
for
    _ <- ZIO.attemptBlocking(db.insert(User(1, "Alice")))
    _ <- callRemoteService()
    _ <- ZIO.attemptBlocking(db.insert(User(2, "Bob")))
yield ()
```

A transaction cannot cross effect boundaries. Sharing a transaction across effects requires pinning the connection to a thread or fiber, which is outside sqala's scope; `zio-jdbc` is a better fit for that scenario.

## Logging

sqala's `Logger` is a Scala `given`, not a ZIO environment service. The simplest option is to import it inside the service:

```scala
import sqala.slf4j.given
```

If it must be provided through a `ZLayer`, it has to be bound manually at the call site:

```scala
def fetchUsers: ZIO[Logger, Throwable, List[User]] =
    ZIO.serviceWithZIO[Logger] { logger =>
        given Logger = logger
        ZIO.attemptBlocking(db.fetch(from(User)))
    }
```

## Timeouts and Cancellation

```scala
ZIO.attemptBlocking(db.fetch(from(User))).timeout(5.seconds)
```

`timeout` only ensures that the fiber returns; the JDBC call itself may not be interruptible, and the underlying thread may keep running. For a hard limit, configure a timeout at the database or connection-pool level.

## Streaming

`cursorFetch` is a synchronous, callback-based API. It can run inside a blocking effect:

```scala
ZIO.attemptBlocking {
    db.cursorFetch(from(User), fetchSize = 1000) { cursor =>
        // process each batch synchronously
    }
}
```

Streaming as a `ZStream` would currently require bridging the callback with a `Queue` and a separate fiber; sqala does not provide a `ZStream` integration.
