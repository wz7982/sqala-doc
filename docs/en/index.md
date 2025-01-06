# Introduction to sqala

sqala is an SQL query library based on Scala 3.6, named after the combination of Scala and SQL. It is a lightweight query library with no third-party dependencies other than the official Scala and Java libraries.

Benefiting from Scala 3's powerful type system, sqala supports type-safe query construction. It allows for the safe building of complex queries in an object-oriented manner using Scala 3 code (supporting joins, subqueries, interoperability with in-memory collections, recursive queries, and complex projection operations). It also enables the safe deserialization of query results back into objects using JDBC.

sqala facilitates the conversion of data objects into UPDATE, INSERT, DELETE operations without the need for writing boilerplate code.

Additionally, sqala has built-in support for Data Integration and Analytics Scenarios. Based on the SQL AST (Abstract Syntax Tree) and SQL Parser provided by sqala, it can flexibly construct complex queries dynamically according to runtime information, providing a solid foundation for scenarios such as dynamically building data reports, without the need for unsafe and complex sql string concatenation.

sqala supports the generation of multiple database dialects, including MySQL, PostgreSQL, Oracle, MSSQL, Sqlite, DB2, etc. By simply passing in different database types, the same query can be converted into different dialects (with MySQL and PostgreSQL being the first-priority support).


## Notes

Since sqala currently uses experimental features of Scala 3 and is not built based on the Scala 3 LTS version, caution is advised when using it in production environments until the next LTS version of Scala 3 is released.

Ensure that the Scala version is `3.6.2` or higher and enable the experimental feature compilation option `-experimental`.

It is recommended to use the official Scala metals plugin with tools like VSCode or Vim. The IDEA series currently does not provide writing hints or correctly display the data types returned by queries.

