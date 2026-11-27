# Queries

After configuring the metadata and the database connection context, we can start building queries. sqala uses a DSL styled after the Scala collections library, aiming to keep the learning cost low.

Using sqala's query features requires `import sqala.static.dsl.*`, which will not be repeated below.

All query features provided by `sqala` are **side-effect free**: each operation does not modify the existing query object but returns a new one, avoiding unexpected behavior when building complex queries.

Unless otherwise specified, the SQL generated in the examples is for PostgreSQL, which has the most comprehensive support for the SQL standard.

The comments marked as "compile error" in the examples below are the actual error messages output by the sqala compiler.

## Building Queries

sqala's query building manages table aliases automatically (you don't need to handle tedious alias management yourself) and isolates the scope of the operators, functions, and other features it provides, to avoid abstraction leaks.

The `from` method creates a basic `SELECT` query. Pass the **companion object** of the entity class to it, and it automatically provides the query context:

```scala
val query =
    from(User)
```

sqala automatically generates table and column aliases to avoid conflicts, and quotes identifiers with the corresponding database's quoting style, preventing issues such as field names clashing with database keywords. sqala also formats the generated queries automatically for easier debugging.

The generated SQL is:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
```

Calling `db.fetch` automatically returns a result of type `List[User]`.

The identifier quotes used by each database dialect are:

| Database Type | Quotes      |
|---------------|-------------|
| PostgreSQL    | `""`        |
| MySQL         | ` `` `      |
| Oracle        | `""`        |

## Generating SQL

The `sql` method is used to generate the SQL string; its parameters are the dialect and the escaping mode (see [Database Interaction](./database.md)):

```scala
import sqala.dialect.PostgresqlDialect

val query =
    from(User)

val sql = query.sql(PostgresqlDialect, true)
```

## Excluding Columns

In some business scenarios, certain table fields (usually long-text fields) are rarely queried while the table has many other fields, and listing the queried fields explicitly with `.map` becomes tedious. In such scenarios, you can use the `exclude` method on the table to exclude specific fields:

```scala
val query =
    from(Post).map(p => p.exclude("title", "createTime"))
```

`exclude` takes string literals as parameters, and multiple values can be passed; sqala validates the field names at compile time:

```scala
val query =
    // Compile error: Unknown fields: titel
    from(Post).map(p => p.exclude("titel"))
```

The generated SQL is:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."author_id" AS "c2",
    "t1"."channel_id" AS "c3",
    "t1"."view_count" AS "c4",
    "t1"."like_count" AS "c5",
    "t1"."state" AS "c6"
FROM
    "post" AS "t1"
```

As you can see, the excluded fields do not appear in the query.

The `exclude` method also affects the return type: sqala computes a named tuple type from the existing and excluded fields, so the `exclude` operation is type-safe as well. After `db.fetch`, the return type inferred by sqala is `List[(id: Int, authorId: Int, channelId: Int, viewCount: Int, likeCount: Int, state: DataState)]`

## Filtering

The `filter` method filters data and corresponds to the SQL `WHERE` clause. You can use sqala's filtering methods just as you would use the collections library:

```scala
val id = 4

val query =
    from(User).filter(u => u.id > id)
```

The generated SQL is:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
WHERE
    "t1"."id" > 4
```

sqala handles the passed strings automatically and **prevents SQL injection**.

The `filter` method does not change the return type of the query.

Multiple `filter` calls connect the conditions with `AND`:

```scala
val id = 4

val query =
    from(User).filter(u => u.id > id).filter(u => u.name.startsWith("A"))
```

The generated SQL is:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
WHERE
    "t1"."id" > 4 AND "t1"."name" LIKE 'A%'
```

Of course, the example above can also use the `&&` operator directly (for more operators and expressions, see [Expressions](./expr.md)):

```scala
val id = 4

val query =
    from(User).filter(u => u.id > id && u.name.startsWith("A"))
```

The `filterIf` method composes a condition only when its first parameter is `true`, which makes it convenient to handle dynamic query conditions:

```scala
val name: Option[String] = None

val query =
    from(User).filterIf(name.isDefined)(u => u.name === name)
```

Because sqala manages SQL statements with a built-in SQL syntax tree, you don't need to manually concatenate `WHERE TRUE` or `WHERE 1 = 1` as in some query libraries; sqala always generates syntactically correct SQL.

### Semantic Checks

If a filter condition contains expressions that cannot appear in a `WHERE` clause, such as aggregate functions or window functions, sqala reports a compile error:

```scala
val query =
    // Compile error: Aggregate functions are not allowed in filter.
    from(User).filter(u => u.id > count())

val q2 =
    // Compile error: Window functions are not allowed in filter.
    from(User).filter(u => rowNumber().over() > 1)
```

## Projection

The `map` method specifies the projection list and corresponds to the SQL `SELECT` clause. sqala allows projecting to [expressions](./expr.md), tables, and tuples or named tuples composed of them, and correctly infers the return type even for complex projections and table joins. You only need to focus on implementing business logic.

### Projecting to Expressions

```scala
val query =
    from(User).map(u => u.name)
```

The generated SQL is:

```sql
SELECT
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
```

Here the return type is automatically inferred as `List[String]`.

Like a database, sqala allows mixing nullable and non-nullable types and mixing numeric types in operations, so the following code:

```scala
val query =
    from(User).map(u => u.id + Option.empty[Long])
```

The generated SQL is:

```sql
SELECT
    "t1"."id" + CAST(NULL AS BIGINT) AS "c1"
FROM
    "user" AS "t1"
```

The return type is automatically inferred as `List[Option[Long]]`: a safe type is inferred automatically, and you also don't need to deal with the tedious interoperability between `Option` types and non-nullable types.

### Projecting to Tables

```scala
val query =
    from(User).map(u => u)
```

The generated SQL is:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
```

Here the return type is automatically inferred as `List[User]`.

Projecting to a table is useful in some scenarios. For example, when one table in a join result only needs some fields while another needs all fields, you can project to a table to handle it.

### Projecting to Tuples

```scala
val query =
    from(User).map(u => (u.id, u.name))
```

The generated SQL is:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
```

Here the return type is automatically inferred as `List[(Int, String)]`.

### Projecting to Named Tuples

sqala makes full use of Scala 3 named tuples. In more complex scenarios (such as join results where only some fields are needed), you can manage projections directly with named tuples, without creating data-receiving DTOs in advance, which avoids a large amount of boilerplate. Returned fields can also be referenced type-safely by name, and good field naming serves as self-explanatory documentation in the code:

```scala
val query =
    from(User).map(u => (name = u.name))
```

Here the return type is automatically inferred as `List[(name: String)]`, and you can use the field names directly to process the results:

```scala
val result = db.fetch(query)

for r <- result do
    println(r.name)
```

### Semantic Checks

If the projection contains both columns and incompatible expressions such as aggregate functions, sqala returns a compile error:

```scala
val query =
    // Compile error: Ungrouped column references must appear in the groupBy clause or be used in an aggregate function.
    from(User).map(u => (name = u.name, count = count()))
```

## Using For Comprehensions

sqala supports writing simple queries that only use `filter` and `map` as `for` comprehensions: the query parameter name is bound only once, which improves readability:

```scala
val query =
    from(User).filter(u => u.id > 1).map(u => u.name)
```

This can be simplified to:

```scala
val query =
    for u <- from(User) if u.id > 1 yield u.name
```

## Limiting the Result Set

`take` and `drop` correspond to SQL operations such as `LIMIT` and `OFFSET`, with automatic dialect adaptation.

```scala
val query =
    from(User).drop(2).take(3)
```

In addition, sqala supports the standard SQL `FETCH n ROWS WITH TIES` clause via `takeWithTies`. Since "tied rows" only make sense relative to a sort key, `takeWithTies` can only be called after `sortBy`; otherwise compilation fails:

```scala
val query =
    from(User).sortBy(u => u.name).takeWithTies(5)
```

Limiting the result set differs considerably across database dialects. The table below lists the adaptation for each major dialect; entries marked ❌ mean the database itself does not support the operation. Since MySQL does not allow the `OFFSET` clause on its own, when `drop` is called alone, the `LIMIT` value is `Long.MaxValue`:

| Method | PostgreSQL | MySQL | Oracle |
| -------- | ------------ | ------- | -------- |
| `drop(m)` | `OFFSET m` | `LIMIT m, 9223372036854775807` | `OFFSET m ROWS` |
| `take(n)` | `LIMIT n` | `LIMIT 0, n` | `FETCH NEXT n ROWS ONLY` |
| `drop(m).take(n)` | `LIMIT n OFFSET m` | `LIMIT m, n` | `OFFSET m ROWS FETCH NEXT n ROWS ONLY` |
| `takeWithTies(n)` | `FETCH NEXT n ROWS WITH TIES` | `❌` | `FETCH NEXT n ROWS WITH TIES` |
| `drop(m).takeWithTies(n)` | `OFFSET m ROWS FETCH NEXT n ROWS WITH TIES` | `❌` | `OFFSET m ROWS FETCH NEXT n ROWS WITH TIES` |

## Distinct

`mapDistinct` is used to query a distinct result set. Since sqala needs a unified style when quantifiers such as `ALL` and `DISTINCT` are required, it does not adopt the `.map.distinct` call style of the Scala collections library:

```scala
val query =
    from(User).mapDistinct(u => u.name)
```

The generated SQL is:

```sql
SELECT DISTINCT
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
```

## Sorting

The `sortBy` method is used to sort data and corresponds to the SQL `ORDER BY` clause.

The parameters of `sortBy` are [expressions](./expr.md) combined with ordering rules. If no ordering rule is specified explicitly, sqala treats it as `ASC`:

```scala
val query =
    from(User).sortBy(u => (u.name, u.id.desc))
```

The generated SQL is as follows:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
ORDER BY
    "t1"."name" ASC,
    "t1"."id" DESC
```

The `sortBy` method does not change the return type of the query.

Multiple `sortBy` calls are concatenated in order, so the code above is equivalent to:

```scala
val query =
    from(User).sortBy(u => u.name).sortBy(u => u.id.desc)
```

The ordering rules supported by sqala and the support level of each major database are as follows:

| Method | PostgreSQL | MySQL | Oracle |
| -------- | ------------ | ------- | -------- |
| `x.asc` | `x ASC` | `x ASC` | `x ASC` |
| `x.ascNullsFirst` | `x ASC NULLS FIRST` | `x ASC` | `x ASC NULLS FIRST` |
| `x.ascNullsLast` | `x ASC NULLS LAST` | `CASE WHEN x IS NULL THEN 1 ELSE 0 END ASC, x ASC` | `x ASC NULLS LAST` |
| `x.desc` | `x DESC` | `x DESC` | `x DESC` |
| `x.descNullsFirst` | `x DESC NULLS FIRST` | `CASE WHEN x IS NULL THEN 1 ELSE 0 END DESC, x DESC` | `x DESC NULLS FIRST` |
| `x.descNullsLast` | `x DESC NULLS LAST` | `x DESC` | `x DESC NULLS LAST` |

### Sorting After Projection

You can sort after calling the `map` projection:

```scala
val query =
    from(User).map(u => u.name).sortBy(u => u.id.desc)
```

At this point, the lambda parameter of `sortBy` still represents the table of the current operation.

With `mapDistinct`, however, the situation is different: since SQL does not allow the `ORDER BY` following `SELECT DISTINCT` to contain expressions that do not appear in the `SELECT`, the following SQL is invalid:

```sql
SELECT DISTINCT
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
ORDER BY
    "t1"."id" DESC
```

Therefore, in `sortBy` after `mapDistinct`, the type of the lambda parameter actually represents the projected type:

```scala
val query =
    from(User)
        .mapDistinct(u => (mappedId = u.id, mappedName = u.name))
        .sortBy(u => u.mappedName.desc)
```

sqala checks this at compile time: if an ordering expression in `sortBy` does not appear in the projection of `mapDistinct`, compilation fails directly:

```scala
val query =
    from(User)
        .mapDistinct(u => u.name)
        // Compile error: For mapDistinct, sortBy expressions must appear in map.
        .sortBy(u => 1)
```

## Building Queries from In-Memory Collections

sqala supports creating queries from collections in memory, which can then be used as subqueries and joined tables:

```scala
val users = List(User(1, "Alice"), User(2, "Bob"))

val query =
    from(users)
```

The generated SQL is:

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    (
        VALUES (1, 'Alice'), (2, 'Bob')
    ) AS "t1"("id", "name")
```

This feature is implemented with the database's `VALUES` query. Measured support in the latest versions of the major databases is as follows:

| Database Type | VALUES Support |
|---------------|----------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |

## Query Locking

sqala supports locking queries with methods such as `forUpdate`, corresponding to the relevant locking clauses of the database:

```scala
val query =
    from(User).forShareSkipLocked
```

Query locking is not part of the SQL standard, but most databases use similar syntax, so sqala supports it based on the features of PostgreSQL and MySQL. The locking methods and their measured support in the latest versions of the major databases are as follows:

| Method | PostgreSQL | MySQL | Oracle |
| -------- | ------------ | ------- | -------- |
| `forUpdate` | `FOR UPDATE` | `FOR UPDATE` | `FOR UPDATE` |
| `forUpdateNoWait` | `FOR UPDATE NOWAIT` | `FOR UPDATE NOWAIT` | `FOR UPDATE NOWAIT` |
| `forUpdateSkipLocked` | `FOR UPDATE SKIP LOCKED` | `FOR UPDATE SKIP LOCKED` | `FOR UPDATE SKIP LOCKED` |
| `forShare` | `FOR SHARE` | `FOR SHARE` | ❌ |
| `forShareNoWait` | `FOR SHARE NOWAIT` | `FOR SHARE NOWAIT` | ❌ |
| `forShareSkipLocked` | `FOR SHARE SKIP LOCKED` | `FOR SHARE SKIP LOCKED` | ❌ |
