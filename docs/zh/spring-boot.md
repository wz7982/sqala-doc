# Spring Boot 集成

`sqala-spring-boot-starter`为Spring Boot应用提供以下自动配置：

- 从应用的`DataSource`创建`JdbcContext`
- 注册参与Spring事务的`SqalaExecutionContext`
- 注册基于SLF4J的`SqalaLogging`
- 在应用没有事务管理器时注册`DataSourceTransactionManager`

## 环境要求

| 项目 | 版本 |
| :--- | :--- |
| Spring Boot | 4.0+ |
| Spring Framework | 7.0+ |
| JDK | 17+ |
| Scala | 3.9+ |

## 引入依赖

starter仅包含适配代码，Spring相关依赖全部声明为`Provided`，版本由应用自身的依赖管理决定，因此需要同时引入JDBC starter：

```scala
libraryDependencies ++= Seq(
    "cn.sqala" %% "sqala-spring-boot-starter" % "latest.integration",
    "org.springframework.boot" % "spring-boot-starter-jdbc" % "4.0.10"
)
```

`spring-boot-starter-jdbc`负责提供`DataSource`、`spring-jdbc`和`spring-tx`。如果应用已通过`spring-boot-starter-data-jpa`、MyBatis等引入了JDBC starter，则无需重复声明。

## Scala 3.9 注意事项

使用Scala 3.9.x编译时，需要在项目中额外加入：

```scala
libraryDependencies += "io.micrometer" % "context-propagation" % "1.2.1"
```

`spring-core 7.x`中的`PropagationContextElement`引用了`io.micrometer.context.ContextSnapshot$Scope`，而micrometer将`context-propagation`声明为optional依赖，不会传递到应用。Scala 3.9的classfile parser遇到缺失的内部类时会直接断言失败：

```text
java.lang.AssertionError: assertion failed: failure to resolve inner class:
externalName = io.micrometer.context.ContextSnapshot$Scope,
outerName = io.micrometer.context.ContextSnapshot,
innerName = Scope,
owner.fullName = io.micrometer.context.ContextSnapshot
while parsing .../spring-core-7.0.11.jar(org/springframework/core/PropagationContextElement.class)
```

- Scala 3.10.x已修复该问题，不需要该依赖
- 仅使用`sqala-jdbc`、不涉及Spring的项目不需要添加
- 使用Spring Boot 3.x（Spring Framework 6.x）的应用不需要添加
- `1.2.1`与Spring Boot 4.0.10管理的`micrometer-observation 1.16.9`对齐

## 快速开始

### 实体

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

`SqalaExecutionContext`和`SqalaLogging`均为Spring bean，注入后通过`import`引入其`given`实例即可。

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

### 配置

```yaml
# Spring 配置：数据源
spring:
  datasource:
    url: jdbc:h2:mem:demo;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1
    username: sa
    password: ""

# sqala 配置：JdbcContext 与 SqalaLogging
sqala:
  jdbc:
    dialect: postgresql
  logging:
    enabled: true
    level: debug

# SLF4J/Logback 配置：打开名为 sqala 的 logger
logging:
  level:
    sqala: debug
```

`sqala.logging.level`控制sqala以何种级别生成日志，`logging.level.sqala`控制Logback是否接收该级别的日志。两者不一致时，成功语句可能不会输出。

## 自动配置

| Bean | 条件 | 说明 |
| :--- | :--- | :--- |
| `JdbcContext` | 存在唯一或`@Primary`的`DataSource` | 使用`sqala.jdbc.*`配置 |
| `SqalaExecutionContext` | 没有其他`JdbcExecutionContext` | 使用当前`JdbcContext`的`DataSource`参与Spring事务 |
| `SqalaLogging` | 存在SLF4J | 持有`Logger`，使用`sqala.logging.*`配置 |
| `PlatformTransactionManager` | 存在唯一或`@Primary`的`DataSource`且没有其他事务管理器 | 注册`DataSourceTransactionManager` |

所有自动配置均带有`@ConditionalOnMissingBean`条件，应用可声明自己的Bean以覆盖默认行为。

## 配置项

### sqala.jdbc

| 配置 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `sqala.jdbc.dialect` | `postgresql` | 数据库方言，可选`postgresql`（别名`postgres`）、`mysql`、`oracle` |
| `sqala.jdbc.standard-escape-strings` | `true` | 是否使用标准SQL字符串转义 |

### sqala.logging

| 配置 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `sqala.logging.enabled` | `true` | 是否启用日志 |
| `sqala.logging.level` | `debug` | 成功执行时使用的日志级别 |
| `sqala.logging.log-args` | `true` | 是否输出绑定参数 |
| `sqala.logging.max-argument-length` | `200` | 单个参数渲染的最大长度 |
| `sqala.logging.name` | `sqala` | SLF4J logger名称 |

失败的操作始终以`error`级别记录，`sqala.logging.level`仅控制成功操作使用的级别。

## 事务

在Spring Boot环境下，事务边界完全交由Spring管理，**不推荐使用sqala的原生事务管理**。请直接使用`@Transactional`或`TransactionTemplate`：

```scala
import org.springframework.transaction.annotation.Transactional
import sqala.static.dsl.*

@Transactional
def transfer(): Unit =
    db.execute(update[Account].set(a => a.balance := a.balance - 100).where(_.id === 1))
    db.execute(update[Account].set(a => a.balance := a.balance + 100).where(_.id === 2))
```

`db.executeTransaction`是为非Spring环境准备的。在Spring Boot中既无必要，也不应再额外包裹一层sqala事务。

Spring事务的`timeout`会传递给sqala创建的`Statement`。JDBC `SQLException`会被转换为Spring的`DataAccessException`，因此Spring默认的回滚规则会生效。

适配层仅转换JDBC的`SQLException`。若业务代码还会抛出其他受检异常并希望Spring回滚，请使用`@Transactional(rollbackFor = Array(classOf[Exception]))`，或自行将异常包装为运行时异常。

## 日志

注入`SqalaLogging`并导入其`given`：

```scala
import sqala.spring.boot.SqalaLogging

class UserService(logging: SqalaLogging):
    import logging.given
```

**请勿在Spring应用中同时使用`import sqala.slf4j.given`。** 否则会引入另一个使用默认配置的`Logger`，导致`sqala.logging.*`配置失效，严重时还会造成`given`二义性。

## JSON 序列化

Spring Boot 4使用Jackson 3。若Controller直接返回case class，需注册Scala模块：

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

依赖：

```scala
libraryDependencies += "tools.jackson.module" %% "jackson-module-scala" % "3.1.8"
```

Spring Boot会自动收集`JacksonModule`类型的Bean并注册到`JsonMapper`。

Jackson目前尚不支持直接对Scala 3命名元组（named tuple）进行JSON序列化。Controller不应直接返回sqala查询得到的命名元组，请定义一个专门的接收类，将查询结果映射后再返回：

```scala
case class UserResponse(id: Int, name: String)

val rows = db.fetch(...) // sqala查询结果，例如命名元组
val response = rows.map(row => UserResponse(row.id, row.name))
```

## 多数据源

自动配置只在存在唯一或`@Primary`的`DataSource`时创建`JdbcContext`和回退的`PlatformTransactionManager`。存在多个`DataSource`且没有`@Primary`时，这两项自动配置会被跳过，应用仍可正常启动，相关Bean需按数据源自行声明。

`SqalaExecutionContext`不绑定固定的`DataSource`，它总是使用当前`JdbcContext`的`DataSource`，因此一个实例即可服务多个数据源；starter会自动注册它。

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

如果只有一个`DataSource`标记了`@Primary`，它会被视为唯一候选，自动配置会使用这个数据源。
