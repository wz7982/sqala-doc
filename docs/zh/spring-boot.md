# Spring Boot 集成

`sqala-spring-boot-starter`提供Spring Boot自动配置，包括日志和事务集成。

## 引入依赖

```scala
libraryDependencies += "com.wz7982" %% "sqala-spring-boot-starter" % "latest.integration"
```

Spring相关依赖均为`Provided`，版本由应用的Spring Boot BOM决定。事务集成需要classpath中存在`spring-jdbc`和`spring-tx`，通常由`spring-boot-starter-jdbc`引入。

## 日志配置

starter会自动注册一个`SqalaLogging` bean，可以通过`sqala.logging.*`配置：

| 配置项 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `sqala.logging.enabled` | `true` | 是否启用日志 |
| `sqala.logging.level` | `debug` | 成功执行时使用的日志级别 |
| `sqala.logging.log-args` | `true` | 是否输出绑定参数 |
| `sqala.logging.max-argument-length` | `200` | 单个参数渲染的最大长度 |
| `sqala.logging.name` | `sqala` | SLF4J logger名称 |

## 事务集成

当应用中存在`DataSource` bean时，starter会自动注册一个`SqalaSpringExecuteContext` bean。它使用Spring的`DataSourceUtils`获取连接，让sqala操作加入当前Spring事务。

在Service中注入`SqalaSpringExecuteContext`并导入它的`given`，然后使用Spring的`@Transactional`：

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

如果classpath中没有其他`PlatformTransactionManager`，starter还会注册一个`DataSourceTransactionManager`。如果应用已经配置了事务管理器，则不会覆盖。

`SqalaSpringExecuteContext`不会创建原生JDBC事务。在Spring事务中调用`db.executeTransaction`会加入当前事务；没有活动Spring事务时会抛出`IllegalStateException`。推荐使用`@Transactional`或`TransactionTemplate`管理事务边界。

## 同时使用日志和事务

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

失败的操作始终以`error`级别记录，`sqala.logging.level`只控制成功操作使用的级别。