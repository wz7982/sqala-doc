# Introduction to sqala

sqala is a type-safe SQL query library designed for Scala 3. It combines the expressiveness of Scala with the power of SQL, and uses Scala 3's powerful type system to ensure that database operations are efficient and safe. Its name comes from the combination of Scala and SQL.

With sqala, you can:

1. **Build queries in an object-oriented way similar to collection libraries**: The type-safe query builder filters out most incorrect SQL at compile time and automatically infers the return data type:

    ```scala
    case class User(id: Int, name: String)

    val query =
        from(User)
            .filter(u => u.id === 1)
            .map(u => u.name)

    // Return type: List[String]
    val result = db.fetch(query)
    ```

2. **Manage queries with Scala 3's new named tuples**: There is no need to pre-create DTOs for projections or join results, and no need for `Map[String, Any]`; access returned fields with `.` while staying type-safe:

    ```scala
    val query =
        from(User).map(u => (id = u.id))

    // Return type: List[(id: Int)]
    val result = db.fetch(query)

    for r <- result do
        println(r.id)
    ```

3. **Support type-safe primary key queries**: Querying data by primary key requires no DSL; read the primary key type directly from the entity class configuration, use it as the parameter type, and create the query:

    ```scala
    // Return type: Option[User]
    val result = db.findByPrimaryKey[User](1)
    ```

4. **Extreme type safety**: sqala uses the type system to model SQL semantics, so its type checking not only intercepts simple errors such as "the field does not exist" and "the types on both sides of a comparison operator are incompatible", but also intercepts more semantic errors:

    ```scala
    val q1 =
        // Compile error: the WHERE clause cannot contain aggregate functions
        from(A).filter(a => a.x > count())

    val q2 =
        // Compile error: a.x must be in the grouping or appear in an aggregate function
        from(A).map(a => (a.x, count()))

    val q3 =
        // Compile error: the subquery used as an expression returns multiple rows
        from(A).map(a => from(A).map(_.a))

    val q4 =
        // Compile error: aggregate functions cannot be nested
        from(A).map(a => count(sum(a.x)))

    // and so on
    ```

5. **Dynamic queries**: In scenarios such as drag-and-drop report platforms, sqala provides dynamic query capabilities:

    ```scala
    val query =
        select(column("b").as("col1"), column("c").as("col2"))
            .from(table("t"))
            .where(column("a") === value(1))
    ```

6. **SQL parser**: The `dynamic` module includes a hand-written recursive descent SQL parser with no third-party parser dependency. It can parse SQL snippets into expressions through `unsafeExpr`, making it easy to migrate existing SQL or handle dynamic query snippets (note: it only validates syntax, not semantics, and untrusted input must not be concatenated).

7. **Extreme performance**: It uses Scala 3's `inline` capability to generate high-performance deserialization code, and its deserialization speed is usually several times that of mainstream reflection-based Java query libraries.

8. **Transparency**: sqala is not a traditional ORM; the query DSL generates queries almost 1:1, without black-box operations such as N + 1, so performance is predictable.

9.  **Multi-dialect support**: Supports multiple dialects including PostgreSQL, MySQL, Oracle, and SQLServer. Passing different dialect parameters for the same query expression generates different SQL. The query documentation lists in detail the measured support level of the latest version of each database.

10. **Powerful query features**: Beyond CRUD, sqala also supports multidimensional grouping, `LATERAL` subqueries, recursive queries, row pattern recognition, JSON tables, property graph queries, and other advanced features. From simple scenarios to complex data analysis, sqala provides an all-in-one solution.

11. **Professional scenario support**: Supports spatial operations defined by the `ISO/IEC 13249` standard, providing professional support for geographic information computing scenarios.

12. **Standards compatibility**: Built-in abstract syntax tree and generic SQL generator compatible with `ISO/IEC 9075` SQL 2023 and the `ISO/IEC 13249` SQL spatial extension; only a small amount of code is needed to support more database dialects.

13. **0 dependencies**: sqala depends only on Scala and the Java standard library, with no third-party dependencies.

## Notes

1. sqala is built on the Scala 3.9.0 LTS version; make sure the Scala version is `3.9.0` or higher.

2. It is recommended to use the official Scala Metals plugin with tools such as VSCode and Vim for a better writing experience.

## Concurrency Model and Error Handling

sqala uses synchronous JDBC, and it is recommended to use it with virtual threads on JVM 21+.

Virtual threads give synchronous code asynchronous-level concurrency performance without introducing the complexity of an effect system.

sqala currently uses exceptions to handle database errors.

Once the experimental Scala 3 feature [CanThrow Capabilities](https://nightly.scala-lang.org/docs/reference/experimental/canthrow.html) matures, it will be upgraded to compile-time traceable error types.

By then, synchronous code will have all three at once: concise syntax, high concurrency with virtual threads, and type-safe error management.

## When to Use Which Style

sqala supports both the query DSL and native SQL. The recommendations are as follows:

| Scenario | Query DSL | Native SQL |
|----------|-----------|------------|
| Simple conditional queries | ✅ Recommended | ⚠️ Usable |
| Complex queries | ✅ Recommended | ⚠️ Usable |
| Type safety | ✅ Compile-time checks | ⚠️ Compile-time checks for static queries |
| Development efficiency | ✅ High | ⚠️ Medium |
