# ZIO 集成

sqala没有提供官方的ZIO模块。JDBC本身是同步阻塞API，推荐的集成方式是用`ZIO.attemptBlocking`把sqala调用放到阻塞线程池执行，事务边界则保持在一个同步块内。

本文介绍推荐的写法，以及几个常见的错误用法。

## 引入依赖

```scala
libraryDependencies ++= Seq(
    "cn.sqala" %% "sqala-jdbc" % "latest.integration",
    "cn.sqala" %% "sqala-slf4j" % "latest.integration",
    "dev.zio" %% "zio" % "2.1.27",
    "com.zaxxer" % "HikariCP" % "6.2.1",
    "org.postgresql" % "postgresql" % "42.7.4"
)
```

`sqala-slf4j`是可选依赖。不引入时，`Logger`会退化为`Logger.noop`，不输出SQL日志。

## 为什么需要`attemptBlocking`

JDBC调用会阻塞线程。若直接在ZIO的默认执行器上执行，会占用计算线程，拖累其他effect。

```scala
import zio.*
import sqala.static.dsl.*

val users: ZIO[Any, Throwable, List[User]] =
    ZIO.attemptBlocking(db.fetch(from(User)))
```

`ZIO.attemptBlocking`会把调用放到ZIO的阻塞线程池，避免拖慢CPU密集型任务。

## 构建Layer

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

以下示例沿用[元数据配置](metadata)中的`User`实体。

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

## 事务

sqala的事务是**同步、词法作用域**的。在ZIO中，必须把整个事务放在**同一个**`ZIO.attemptBlocking`内：

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

`executeTransaction`的代码块完整运行在同一个阻塞线程上，连接在块内保持绑定，提交或回滚均在块结束时完成。

### 错误写法一：把ZIO放进事务块

```scala
// 错误：ZIO只是被构造出来，没有执行
db.executeTransaction {
    ZIO.attemptBlocking(db.insert(User(1, "Alice")))
}
```

`executeTransaction`的参数是同步块，其中返回的`ZIO`只会被当作普通值处理，事务立即提交，`insert`实际上并不会执行。

### 错误写法二：跨effect保持事务

```scala
// 错误：两次attemptBlocking各自获取连接，不在同一个事务里
for
    _ <- ZIO.attemptBlocking(db.insert(User(1, "Alice")))
    _ <- callRemoteService()
    _ <- ZIO.attemptBlocking(db.insert(User(2, "Bob")))
yield ()
```

事务不能跨越effect边界。若需要在多个effect之间共享事务，就必须自行把连接固定在一个线程或fiber上，这已经超出sqala的使用范围；这种场景更适合`zio-jdbc`。

## 日志

sqala的`Logger`是Scala的`given`，不是ZIO的环境服务。最简单的做法是在Service内直接导入：

```scala
import sqala.slf4j.given
```

若确需通过`ZLayer`提供，则要在调用点手动绑定：

```scala
def fetchUsers: ZIO[Logger, Throwable, List[User]] =
    ZIO.serviceWithZIO[Logger] { logger =>
        given Logger = logger
        ZIO.attemptBlocking(db.fetch(from(User)))
    }
```

## 超时与取消

```scala
ZIO.attemptBlocking(db.fetch(from(User))).timeout(5.seconds)
```

`timeout`只保证fiber在超时后返回；JDBC调用本身不一定能被中断，底层线程可能仍在继续执行。需要硬性限制时，请在数据库或连接池层面设置超时。

## 流式查询

`cursorFetch`是基于回调的同步API，可以放在一个阻塞effect内处理：

```scala
ZIO.attemptBlocking {
    db.cursorFetch(from(User), fetchSize = 1000) { cursor =>
        // 同步处理每一批数据
    }
}
```

如果需要`ZStream`形式的流式输出，目前需自行用`Queue`和一个单独的fiber做桥接；sqala没有提供`ZStream`集成。
