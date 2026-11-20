# Spring Boot Integration

`sqala-spring-boot-starter` provides Spring Boot auto-configuration for logging and transactions.

## Dependency

```scala
libraryDependencies += "com.wz7982" %% "sqala-spring-boot-starter" % "0.8.2"
```

Spring dependencies are `Provided`; versions come from the application's Spring Boot BOM. Transaction integration requires `spring-jdbc` and `spring-tx` on the classpath, usually provided by `spring-boot-starter-jdbc`.

## Logging

The starter registers a `SqalaLogging` bean and configures it through `sqala.logging.*`:

| Property | Default | Description |
| :--- | :--- | :--- |
| `sqala.logging.enabled` | `true` | Whether logging is enabled |
| `sqala.logging.level` | `debug` | Level used for successful operations |
| `sqala.logging.log-args` | `true` | Whether bound parameters are logged |
| `sqala.logging.max-argument-length` | `200` | Maximum rendered length of one argument |
| `sqala.logging.name` | `sqala` | SLF4J logger name |

## Transactions

When a `DataSource` bean is present, the starter registers a `SqalaSpringExecuteContext` bean. It obtains connections through Spring's `DataSourceUtils`, so sqala operations join the current Spring transaction.

Inject `SqalaSpringExecuteContext` into a service, import its `given`, and use Spring's `@Transactional`:

```scala
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sqala.jdbc.JdbcContext
import sqala.spring.boot.SqalaSpringExecuteContext
import sqala.static.dsl.*

@Service
class UserService(val execution: SqalaSpringExecuteContext, db: JdbcContext):
    import execution.given

    @Transactional
    def transfer(): Unit =
        db.execute(update[Account].set(a => a.balance := a.balance - 100).where(_.id === 1))
        db.execute(update[Account].set(a => a.balance := a.balance + 100).where(_.id === 2))
```

If the classpath has no other `PlatformTransactionManager`, the starter also registers a `DataSourceTransactionManager`. An application-provided transaction manager is not overridden.

`SqalaSpringExecuteContext` does not create native JDBC transactions. Inside a Spring transaction, `db.executeTransaction` joins the current transaction; without an active Spring transaction it throws `IllegalStateException`. Prefer `@Transactional` or `TransactionTemplate` for transaction boundaries.

## Using Logging and Transactions Together

```scala
import sqala.spring.boot.{SqalaSpringExecuteContext, SqalaLogging}

class UserService(
    val execution: SqalaSpringExecuteContext,
    val logging: SqalaLogging,
    db: JdbcContext
):
    import execution.given
    import logging.given
```

Failed operations are always logged at `error`. `sqala.logging.level` only controls the level used for successful operations.