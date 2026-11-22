# Code Generation Plugin

sqala provides an optional sbt plugin that reads a PostgreSQL or MySQL schema and generates entity case classes.

It does not change sqala's runtime behavior; the generated code is ordinary case class source.

## Requirements

- sbt 1.x
- PostgreSQL or MySQL
- A database account that can read the schema

## Add the plugin

```scala
// project/plugins.sbt
addSbtPlugin("com.wz7982" % "sqala-sbt-codegen" % "0.1.0")
```

For local development, you can publish the plugin from the `codegen-sbt` directory in the sqala repository:

```bash
cd codegen-sbt
sbt publishLocal
```

## Configuration

```scala
// build.sbt
enablePlugins(SqalaCodegenPlugin)

sqalaDatabaseUrl := "jdbc:postgresql://localhost:5432/app"
sqalaDatabaseUser := sys.env("DB_USER")
sqalaDatabasePassword := sys.env("DB_PASSWORD")

// PostgreSQL defaults to public; MySQL uses the current database.
sqalaSchema := Some("public")

// Empty means all tables.
sqalaTables := Seq("user", "order")

sqalaOutputPackage := "com.example.domain"

// Managed (default) or Source
sqalaOutputMode := OutputMode.Managed

// Only used by OutputMode.Source:
// files are written to src/main/scala/<sqalaSourceDirectory>/...
sqalaSourceDirectory := "generated"

// Database table naming style; see below.
sqalaTableNaming := TableNaming.SnakeCase
```

The connection can also be configured through environment variables:

```text
SQALA_DATABASE_URL
SQALA_DATABASE_USER
SQALA_DATABASE_PASSWORD
```

Do not hard-code the password in `build.sbt`.

## Generate

```bash
sbt sqalaGenerate
```

Generated files depend on `sqalaOutputMode`.

## Output modes

### `OutputMode.Managed` (default)

Files are written to:

```text
target/scala-3.x/src_managed/main/sqala-codegen/
```

Note that running `sqalaGenerate` only writes files; it does **not** add them to compilation automatically. sbt does not compile files under `sourceManaged` unless they are part of the build's sources.

The recommended setup is to add the task as a source generator:

```scala
Compile / sourceGenerators += sqalaGenerate.taskValue
```

This runs generation before every `compile` and includes the returned files as sources. It also means every compile reads the database.

If you do not want every compile to connect to the database, run:

```bash
sbt sqalaGenerate
```

and add the generated directory as a source directory:

```scala
Compile / unmanagedSourceDirectories +=
    (Compile / sourceManaged).value / "sqala-codegen"
```

After that, `compile` will compile the already generated files without reconnecting. Running `sbt clean` removes them, so you need to regenerate.

### `OutputMode.Source`

Files are written to:

```text
src/main/scala/<sqalaSourceDirectory>/<package path>/
```

For example:

```scala
sqalaSourceDirectory := "generated"
sqalaOutputPackage := "com.example.domain"
```

produces:

```text
src/main/scala/generated/com/example/domain/User.scala
```

This directory is under `src/main/scala`, so it is compiled normally. No `sourceGenerators` or `unmanagedSourceDirectories` setting is required.

Source mode is intended for teams that want to commit and review generated code. A `.sqala-codegen-manifest` file records generated files. On the next run, only files tracked by the manifest are cleaned up; unrelated user files in the same directory are left alone.

Generated files are overwritten on every run. Do not edit them directly; use `sqalaTypeMappings`, or move a table out of generation and take ownership of the entity manually if you need persistent changes.

## Generated code

For a table such as:

```sql
CREATE TABLE user (
    id BIGINT PRIMARY KEY,
    name VARCHAR(64) NOT NULL,
    email VARCHAR(128),
    created_at TIMESTAMP NOT NULL
);
```

the plugin generates:

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

Rules:

- The raw table name is always written to `@table("...")`
- Nullable columns become `Option[T]`
- Primary keys use `@primaryKey`
- Auto-increment primary keys use both `@primaryKey` and `@autoInc`
- `@column("...")` is added when the database column name does not round-trip through sqala's default CamelCase to snake_case conversion
- Reserved words and SQL quoting are handled by sqala's SQL generator; the code generator preserves the raw column name

## Table naming style

`sqalaTableNaming` describes the **database table naming style**. Generated Scala class names are always PascalCase.

| Setting | Database example | Generated class |
| --- | --- | --- |
| `TableNaming.SnakeCase` (default) | `user_profile` | `UserProfile` |
| `TableNaming.CamelCase` | `userProfile` | `UserProfile` |
| `TableNaming.PascalCase` | `UserProfile` | `UserProfile` |
| `TableNaming.KebabCase` | `user-profile` | `UserProfile` |

The raw table name is preserved through `@table`:

```scala
@table("user_profile")
case class UserProfile(...)
```

## Type mapping

| SQL type | Scala type |
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
| timezone-aware `TIMESTAMP` | `OffsetDateTime` |
| `JSON` / `JSONB` | `Json` |

## Unsupported types

The generator does not generate the following automatically:

- `BLOB` / `BINARY` / `VARBINARY`: the column is skipped with a warning
- arrays: the column is skipped with a warning
- spatial types: the column is skipped with a warning
- database enums: generated as `String` with a warning
- `UUID`: generated as `String` with a warning

If a primary key column is skipped, the whole table is skipped.

### Custom type mappings

Use `sqalaTypeMappings` to override the Scala type for a SQL type name:

```scala
sqalaTypeMappings := Map(
    "uuid" -> "java.util.UUID",
    "bytea" -> "Array[Byte]",
    "user_status" -> "com.example.UserStatus"
)
```

The generator only writes the type name. You still need to provide the corresponding `JdbcEncoder`, `JdbcDecoder`, `CustomField`, or `AsSqlExpr` instances.

### Switching to a Scala enum

Database enums are generated as `String` by default. To use a Scala enum:

1. Map the database type to your enum with `sqalaTypeMappings`, and provide the corresponding `CustomField` / codec instances.
2. Or copy the generated entity into `src/main/scala` and remove that table from `sqalaTables` so it is not overwritten.

The output directory is managed source. Every `sqalaGenerate` run deletes and rewrites it, so edits to generated files are not preserved.

## Settings

| Setting | Description |
| --- | --- |
| `sqalaGenerate` | Task that reads the schema and generates entities |
| `sqalaDatabaseUrl` | JDBC URL |
| `sqalaDatabaseUser` | Database user |
| `sqalaDatabasePassword` | Database password |
| `sqalaDatabaseDriver` | Optional driver class; inferred from the URL |
| `sqalaSchema` | PostgreSQL schema, or MySQL catalog |
| `sqalaTables` | Tables to generate; empty means all |
| `sqalaOutputPackage` | Package of the generated code |
| `sqalaOutputMode` | `OutputMode.Managed` or `OutputMode.Source` |
| `sqalaSourceDirectory` | Subdirectory under `src/main/scala` for `OutputMode.Source` |
| `sqalaTableNaming` | Database table naming style |
| `sqalaTypeMappings` | SQL type name to Scala type overrides |

## Limitations

- PostgreSQL and MySQL only
- Base tables only, no views
- No foreign-key/relationship generation
- No incremental cache; every run reads the database
- No `JdbcEncoder` / `JdbcDecoder` generation
- The managed output directory is deleted and rewritten on every run
- Oracle is not supported
