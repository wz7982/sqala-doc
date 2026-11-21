# Spring Boot Integration

`sqala-spring-boot-starter` provides the following auto-configuration for Spring Boot applications:

- Creates a `JdbcContext` from the application's `DataSource`
- Registers a `SqalaExecutionContext` that participates in Spring transactions
- Registers an SLF4J-backed `SqalaLogging`
- Registers a `DataSourceTransactionManager` when the application has none

## Requirements

| Item | Version |
| :--- | :--- |
| Spring Boot | 4.0+ |
| Spring Framework | 7.0+ |
| JDK | 17+ |
| Scala | 3.9+ |

## Dependency

The starter contains only adapter code. All Spring dependencies are `Provided`, and their versions come from the application's dependency management. Add the JDBC starter as well:

```scala
libraryDependencies ++= Seq(
    "com.wz7982" %% "sqala-spring-boot-starter" % "latest.integration",
    "org.springframework.boot" % "spring-boot-starter-jdbc" % "4.0.10"
)
```

`spring-boot-starter-jdbc` provides the `DataSource`, `spring-jdbc` and `spring-tx`. If the application already pulls in a JDBC starter through `spring-boot-starter-data-jpa`, MyBatis, or another framework, it does not need to be declared again.

## Scala 3.9 Note

When compiling with Scala 3.9.x, add the following dependency:

```scala
libraryDependencies += "io.micrometer" % "context-propagation" % "1.2.1"
```

`PropagationContextElement` in `spring-core 7.x` references `io.micrometer.context.ContextSnapshot$Scope`, but micrometer declares `context-propagation` as an optional dependency, so it is not transitive. The Scala 3.9 classfile parser aborts when an inner class cannot be resolved:

```text
java.lang.AssertionError: assertion failed: failure to resolve inner class:
externalName = io.micrometer.context.ContextSnapshot$Scope,
outerName = io.micrometer.context.ContextSnapshot,
innerName = Scope,
owner.fullName = io.micrometer.context.ContextSnapshot
while parsing .../spring-core-7.0.11.jar(org/springframework/core/PropagationContextElement.class)
```

- Scala 3.10.x does not need this dependency
- Projects that use only `sqala-jdbc` without Spring do not need it
- Spring Boot 3.x (Spring Framework 6.x) does not need it
- `1.2.1` matches `micrometer-observation 1.16.9` managed by Spring Boot 4.0.10

## Quick Start

### Entity

```scala
import sqala.metadata.{autoInc, primaryKey, table}

@table("demo_user")
case class DemoUser(
    @primaryKey @autoInc id: Long,
    name: String,
    age: Int
)
```

### Service

```scala
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import sqala.jdbc.JdbcContext
import sqala.spring.boot.{SqalaExecutionContext, SqalaLogging}
import sqala.static.dsl.*

@Service
class UserService(
    db: JdbcContext,
    execution: SqalaExecutionContext,
    logging: SqalaLogging
):
    import execution.given
    import logging.given

    def create(name: String, age: Int): DemoUser =
        db.insertAndReturn(DemoUser(0L, name, age))

    def find(id: Long): Option[DemoUser] =
        db.findByPrimaryKey[DemoUser](id)

    def all(): List[DemoUser] =
        db.fetch(from(DemoUser).sortBy(u => u.id))

    @Transactional
    def createPair(first: String, second: String): List[DemoUser] =
        val a = db.insertAndReturn(DemoUser(0L, first, 20))
        val b = db.insertAndReturn(DemoUser(0L, second, 30))
        List(a, b)
```

`SqalaExecutionContext` and `SqalaLogging` are Spring beans. Inject them and import their `given` instances.

### Controller

```scala
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

case class CreateUser(name: String, age: Int)

@RestController
@RequestMapping(Array("/users"))
class UserController(service: UserService):
    @GetMapping
    def all(): List[DemoUser] =
        service.all()

    @GetMapping(Array("/{id}"))
    def find(@PathVariable id: Long): DemoUser =
        service.find(id).getOrElse(
            throw ResponseStatusException(HttpStatus.NOT_FOUND, s"User $id not found")
        )

    @PostMapping
    def create(@RequestBody body: CreateUser): DemoUser =
        service.create(body.name, body.age)
```

### Configuration

```yaml
# Spring configuration: data source
spring:
  datasource:
    url: jdbc:h2:mem:demo;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
    username: sa
    password: ""

# sqala configuration: JdbcContext and SqalaLogging
sqala:
  jdbc:
    dialect: postgresql
  logging:
    enabled: true
    level: debug

# SLF4J/Logback configuration: enable the logger named "sqala"
logging:
  level:
    sqala: debug
```

`sqala.logging.level` controls the level sqala emits events at, while `logging.level.sqala` controls whether Logback accepts that level. If they disagree, successful statements may not be printed.

## Auto-configuration

| Bean | Condition | Description |
| :--- | :--- | :--- |
| `JdbcContext` | Exactly one or an `@Primary` `DataSource` exists | Configured through `sqala.jdbc.*` |
| `SqalaExecutionContext` | No other `JdbcExecutionContext` is defined | Uses the `DataSource` of the current `JdbcContext` to participate in Spring transactions |
| `SqalaLogging` | SLF4J is present | Holds a `Logger`, configured through `sqala.logging.*` |
| `PlatformTransactionManager` | Exactly one or an `@Primary` `DataSource` exists and no other transaction manager is defined | Registers a `DataSourceTransactionManager` |

Every auto-configuration uses `@ConditionalOnMissingBean`, so an application can override any of these beans.

## Properties

### sqala.jdbc

| Property | Default | Description |
| :--- | :--- | :--- |
| `sqala.jdbc.dialect` | `postgresql` | Database dialect: `postgresql`, `mysql` or `oracle` |
| `sqala.jdbc.standard-escape-strings` | `true` | Whether to use standard SQL string escaping |

### sqala.logging

| Property | Default | Description |
| :--- | :--- | :--- |
| `sqala.logging.enabled` | `true` | Whether logging is enabled |
| `sqala.logging.level` | `debug` | Level used for successful operations |
| `sqala.logging.log-args` | `true` | Whether bound parameters are logged |
| `sqala.logging.max-argument-length` | `200` | Maximum rendered length of one argument |
| `sqala.logging.name` | `sqala` | SLF4J logger name |

Failed operations are always logged at `error`. `sqala.logging.level` only controls the level used for successful operations.

## Transactions

In a Spring Boot application, transaction boundaries belong entirely to Spring. **Do not use sqala's native transaction management here.** Use `@Transactional` or `TransactionTemplate` instead:

```scala
import org.springframework.transaction.annotation.Transactional
import sqala.static.dsl.*

@Transactional
def transfer(): Unit =
    db.execute(update[Account].set(a => a.balance := a.balance - 100).where(_.id === 1))
    db.execute(update[Account].set(a => a.balance := a.balance + 100).where(_.id === 2))
```

`db.executeTransaction` is intended for non-Spring environments. In Spring Boot it is unnecessary, and sqala operations should not be wrapped in an additional sqala transaction.

Spring transaction `timeout` values are applied to statements created by sqala. JDBC `SQLException`s are translated to Spring `DataAccessException`s, so Spring's default rollback rules apply.

The adapter only translates JDBC `SQLException`s. If business code can throw other checked exceptions and you want Spring to roll back, use `@Transactional(rollbackFor = Array(classOf[Exception]))` or wrap them in a runtime exception.

## Logging

Inject `SqalaLogging` and import its `given`:

```scala
import sqala.spring.boot.SqalaLogging

class UserService(logging: SqalaLogging):
    import logging.given
```

**Do not use `import sqala.slf4j.given` in a Spring application.** It introduces a second `Logger` that uses default settings, so `sqala.logging.*` stops taking effect and the `given` instances may become ambiguous.

## JSON Serialization

Spring Boot 4 uses Jackson 3. When a controller returns a case class directly, register the Scala module:

```scala
import org.springframework.context.annotation.{Bean, Configuration}
import tools.jackson.databind.JacksonModule
import tools.jackson.module.scala.DefaultScalaModule

@Configuration
class JacksonConfig:
    @Bean
    def scalaJacksonModule(): JacksonModule =
        DefaultScalaModule()
```

Dependency:

```scala
libraryDependencies += "tools.jackson.module" %% "jackson-module-scala" % "3.1.8"
```

Spring Boot collects every `JacksonModule` bean and registers it with the `JsonMapper`.

## Multiple Data Sources

Auto-configuration creates `JdbcContext` and the fallback `PlatformTransactionManager` only when there is exactly one or an `@Primary` `DataSource`. With multiple `DataSource`s and no `@Primary`, those two auto-configurations are skipped and the application still starts; declare them per data source.

`SqalaExecutionContext` is not bound to a fixed `DataSource`. It always uses the `DataSource` of the current `JdbcContext`, so one instance can serve multiple data sources. The starter registers it automatically.

```scala
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.context.annotation.{Bean, Configuration}
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.transaction.PlatformTransactionManager
import sqala.jdbc.JdbcContext
import sqala.jdbc.dialect.PostgresqlJdbcDialect

import javax.sql.DataSource

@Configuration
class DataSourceConfig:
    @Bean
    def readDb(@Qualifier("readDataSource") dataSource: DataSource): JdbcContext =
        JdbcContext(dataSource, PostgresqlJdbcDialect, true)

    @Bean
    def writeDb(@Qualifier("writeDataSource") dataSource: DataSource): JdbcContext =
        JdbcContext(dataSource, PostgresqlJdbcDialect, true)

    @Bean
    def readTransactionManager(
        @Qualifier("readDataSource") dataSource: DataSource
    ): PlatformTransactionManager =
        new DataSourceTransactionManager(dataSource)

    @Bean
    def writeTransactionManager(
        @Qualifier("writeDataSource") dataSource: DataSource
    ): PlatformTransactionManager =
        new DataSourceTransactionManager(dataSource)
```

If exactly one `DataSource` is marked `@Primary`, it is treated as the single candidate and auto-configuration uses it.
