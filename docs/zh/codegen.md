# 代码生成插件

sqala 提供了一个可选的 sbt 插件，用于读取 PostgreSQL 或 MySQL 的表结构，并生成对应的实体类。

它不会改变 sqala 的运行时行为，生成的代码就是普通的 case class。

## 前置条件

- sbt 1.x
- PostgreSQL 或 MySQL
- 数据库账号需要具有表结构的读取权限

## 添加插件

```scala
// project/plugins.sbt
addSbtPlugin("cn.sqala" % "sqala-sbt-codegen" % "0.1.0")
```

本地开发时，也可以先在 sqala 仓库的 `codegen-sbt` 目录将插件发布到本地：

```bash
cd codegen-sbt
sbt publishLocal
```

## 配置

```scala
// build.sbt
enablePlugins(SqalaCodegenPlugin)

sqalaDatabaseUrl := "jdbc:postgresql://localhost:5432/app"
sqalaDatabaseUser := sys.env("DB_USER")
sqalaDatabasePassword := sys.env("DB_PASSWORD")

// PostgreSQL 默认 public；MySQL 使用当前 database
sqalaSchema := Some("public")

// 空表示生成所有表
sqalaTables := Seq("user", "order")

sqalaOutputPackage := "com.example.domain"

// Managed（默认）或 Source
sqalaOutputMode := OutputMode.Managed

// 仅 Source 模式使用：
// 生成到 src/main/scala/<sqalaSourceDirectory>/...
sqalaSourceDirectory := "generated"

// 表名命名风格，见下文
sqalaTableNaming := TableNaming.SnakeCase
```

数据库连接信息也可以通过环境变量提供：

```text
SQALA_DATABASE_URL
SQALA_DATABASE_USER
SQALA_DATABASE_PASSWORD
```

请勿将密码直接写入 `build.sbt`。

## 执行生成

```bash
sbt sqalaGenerate
```

生成的文件位置取决于 `sqalaOutputMode`。

## 输出模式

### `OutputMode.Managed`（默认）

生成到：

```text
target/scala-3.x/src_managed/main/sqala-codegen/
```

注意：仅执行 `sqalaGenerate` 只会写出文件，**不会自动加入编译**。sbt 不会自动编译 `sourceManaged` 目录下的文件，需要将其接入编译流程。

推荐接入 `sourceGenerators`：

```scala
Compile / sourceGenerators += sqalaGenerate.taskValue
```

这样每次 `compile` 前都会执行生成，并把生成的文件作为源码编译。注意这会使每次编译都读取数据库。

如果不想每次编译都连接数据库，可以先手动执行：

```bash
sbt sqalaGenerate
```

然后把生成目录加入源码目录：

```scala
Compile / unmanagedSourceDirectories +=
    (Compile / sourceManaged).value / "sqala-codegen"
```

之后 `compile` 会直接编译已生成的文件，不再连接数据库；但执行 `sbt clean` 后需要重新生成。

### `OutputMode.Source`

生成到：

```text
src/main/scala/<sqalaSourceDirectory>/<包路径>/
```

例如：

```scala
sqalaSourceDirectory := "generated"
sqalaOutputPackage := "com.example.domain"
```

会生成：

```text
src/main/scala/generated/com/example/domain/User.scala
```

该目录位于 `src/main/scala` 之下，sbt 会正常编译，无需再配置 `sourceGenerators` 或 `unmanagedSourceDirectories`。

Source 模式适合需要提交和评审生成代码的团队。生成目录中会包含一个 `.sqala-codegen-manifest` 文件，用于记录生成的文件；下次生成时只会清理 manifest 中记录且不再生成的文件，不会删除同目录下的其他用户文件。

生成文件每次都会被覆盖，请勿直接修改。需要持久定制时，请使用 `sqalaTypeMappings`，或将对应表移出生成范围后手工接管实体。

## 生成的代码

例如数据库表：

```sql
CREATE TABLE user (
    id BIGINT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    email VARCHAR(128),
    created_at TIMESTAMP NOT NULL
);
```

生成：

```scala
package com.example.domain

import sqala.metadata.table
import sqala.metadata.primaryKey

@table("user")
case class User(
    @primaryKey id: Long,
    name: String,
    email: Option[String],
    createdAt: java.time.LocalDateTime
)
```

规则：

- 原始表名始终写入 `@table("...")`
- 可空列生成 `Option[T]`；主键列例外：即使在数据库中可空，也保持 `T` 而不包 `Option`
- 主键生成 `@primaryKey`
- 自增主键同时生成 `@primaryKey` 和 `@autoInc`
- 列名和默认 CamelCase 到 snake_case 转换不一致时，生成 `@column("...")`
- 保留字和 SQL 引号由 sqala 生成 SQL 时处理，代码生成器只保留原始列名

## 表名命名风格

`sqalaTableNaming` 描述**数据库表名的命名风格**，生成的 Scala 类名始终是 PascalCase。

| 配置 | 数据库表名示例 | 生成的类名 |
| --- | --- | --- |
| `TableNaming.SnakeCase`（默认） | `user_profile` | `UserProfile` |
| `TableNaming.CamelCase` | `userProfile` | `UserProfile` |
| `TableNaming.PascalCase` | `UserProfile` | `UserProfile` |
| `TableNaming.KebabCase` | `user-profile` | `UserProfile` |

表名本身不受影响，仍通过 `@table` 保留原始名称：

```scala
@table("user_profile")
case class UserProfile(...)
```

## 类型映射

| SQL 类型 | Scala 类型 |
| --- | --- |
| `SMALLINT` / `INTEGER` | `Int` |
| `BIGINT` | `Long` |
| `REAL` | `Float` |
| `FLOAT` / `DOUBLE` | `Double` |
| `NUMERIC` / `DECIMAL` | `BigDecimal` |
| `BOOLEAN` | `Boolean` |
| `CHAR` / `VARCHAR` / `TEXT` | `String` |
| `DATE` | `LocalDate` |
| `TIME` | `LocalTime` |
| `TIMESTAMP` / `DATETIME` | `LocalDateTime` |
| 带时区的 `TIMESTAMP` | `OffsetDateTime` |
| `JSON` / `JSONB` | `Json` |

## 不支持的类型

以下SQL类型不会被原样生成，处理方式如下：

- `BLOB` / `BINARY` / `VARBINARY`：跳过该列并警告
- 数组：跳过该列并警告
- 空间类型：跳过该列并警告
- 数据库枚举：生成 `String` 并警告
- `UUID`：生成 `String` 并警告

如果主键列被跳过，整个表都会被跳过。

### 自定义类型映射

可以通过 `sqalaTypeMappings` 覆盖 SQL 类型名对应的 Scala 类型：

```scala
sqalaTypeMappings := Map(
    "uuid" -> "java.util.UUID",
    "bytea" -> "Array[Byte]",
    "user_status" -> "com.example.UserStatus"
)
```

生成器只负责写出类型名，对应的 `JdbcEncoder`、`JdbcDecoder`、`CustomField` 或 `AsSqlExpr` 需要自行提供。

### 改成 Scala 枚举

数据库枚举默认生成 `String`。如果希望使用 Scala 枚举，有两种方式：

1. 用 `sqalaTypeMappings` 把数据库类型映射到自己的枚举类型，并在代码中提供对应的 `CustomField` / 编解码实例。
2. 将生成的实体复制到 `src/main/scala`，然后从 `sqalaTables` 中排除该表，避免下次生成时被覆盖。

生成目录的重写行为取决于输出模式：`OutputMode.Managed` 下每次执行 `sqalaGenerate` 会把整个生成目录删除并重写，直接修改生成文件不会保留；`OutputMode.Source` 下只删除并重写上次生成清单中记录的文件，同目录下的其它文件不受影响。

## 完整配置项

| 配置 | 说明 |
| --- | --- |
| `sqalaGenerate` | 读取表结构并生成实体的任务 |
| `sqalaDatabaseUrl` | JDBC URL |
| `sqalaDatabaseUser` | 数据库用户 |
| `sqalaDatabasePassword` | 数据库密码 |
| `sqalaDatabaseDriver` | 可选，驱动类名；为空时根据 URL 推断 |
| `sqalaSchema` | PostgreSQL schema，或 MySQL catalog |
| `sqalaTables` | 需要生成的表；为空表示全部 |
| `sqalaOutputPackage` | 生成代码的包名 |
| `sqalaOutputMode` | `OutputMode.Managed` 或 `OutputMode.Source` |
| `sqalaSourceDirectory` | Source 模式下 `src/main/scala` 下的子目录 |
| `sqalaTableNaming` | 数据库表名命名风格 |
| `sqalaTypeMappings` | SQL 类型名到 Scala 类型的覆盖 |

## 限制

- 只支持 PostgreSQL 和 MySQL
- 只生成基础表，不生成视图
- 不生成外键关系
- 不做增量缓存，每次执行都会重新读取数据库
- 不生成 `JdbcEncoder` / `JdbcDecoder` 实例
- 每次执行都会删除并重写 managed 目录
- 不支持 Oracle
