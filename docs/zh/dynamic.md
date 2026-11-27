# 动态查询

在拖拽式报表平台等场景中，表名、列名、查询结构往往都是动态的，编译期一无所知，而且经常需要生成包含多层子查询、甚至上千行的复杂查询。传统的静态 ORM 以及以 MyBatis 为代表的 XML 模板都无法胜任这种场景下的动态 SQL 构建，实际应用中我们往往只能二选一：要么使用极易出错的字符串拼接，要么接入 Calcite 等重量级数据库内核前端。

针对这种场景，sqala 提供了一个全新的解决方案：为动态查询构建专门设计的一套 DSL。动态构建器减少了[静态查询](./query.md)中的类型安全校验，但内部沿用了 sqala 底层的 SQL 语法树等基础设施，因此同样提供 SQL 安全转义，并保证生成的 SQL 语法正确。其调用形式既不像字符串拼接那样容易出错，也不像手动拼接语法树那样繁琐。

需要注意的是，动态查询构建与[静态查询](./query.md)的使用场景完全不同。为了区分两者，sqala 采用了截然不同的 DSL 风格，既更好地贴合使用场景，也起到视觉区分的作用。

动态查询构建器通过 `import sqala.dynamic.dsl.*` 导入。

动态查询构建器依然是**无副作用的**：每次调用其中的方法都会生成一个新的查询，而不是修改原有查询。

## 构建查询

`select` 方法用于创建查询，其参数通常是若干由 `column`、`value` 等方法生成的查询列：

```scala
val query =
    select(column("a", "x"), column("b", "y"))
```

表通过 `from` 方法传入，参数通常是若干由 `table` 方法生成的表：

```scala
val query =
    select(column("a", "x"))
        .from(table("a"), table("b"))
```

动态查询的表名以字符串形式传递，因此可以来自外部参数，sqala 会对表名进行安全转义：

```scala
val tableNames = List("a", "b")

val tables = tableNames.map(n => table(n))

val query =
    select(column("a", "x"))
        .from(tables)
```

`as` 方法用于给表或表达式设置别名：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a").as("t1"), table("b").as("t2"))
```

`select` 和 `from` 均支持多次调用，结果依次拼接。

## 生成SQL

`sql` 方法用于生成 SQL 字符串，参数为方言和转义模式（参考[数据库交互](./database.md)）：

```scala
import sqala.dialect.PostgresqlDialect

val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))

val sql = query.sql(PostgresqlDialect, true)
```

## 获取查询树

在动态构建场景下，我们往往需要对生成的 SQL 进行优化或转换，但这些工作无法在 SQL 字符串层面展开。此时可以使用 `ast` 方法查看 sqala 生成的查询语法树。如果您具备编译器和数据库内核方面的领域知识，可以查阅 `sqala.ast` 包的相关定义，基于 sqala 生成的语法树进行查询优化或转换：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))

val queryTree: sqala.ast.statement.SqlQuery = query.ast
```

当然，表和表达式也支持 `ast` 方法：

```scala
val t = table("a")
val tableTree: sqala.ast.table.SqlTable = t.ast

val e = column("c") === value(1)
val exprTree: sqala.ast.expr.SqlExpr = e.ast
```

查询树转换完毕后，可以这样生成 SQL：

```scala
import sqala.dialect.PostgresqlDialect

val printer = PostgresqlDialect.printer(standardEscapeStrings)
// 或是printTable、printExpr等方法，您可以自行查看sqala.printer.StandardSqlPrinter中的相关定义
printer.printQuery(queryTree)
val sql = printer.sql
```

其中`standardEscapeStrings`是`Boolean`值，决定内联到SQL文本中的字符串字面量如何转义，与`JdbcContext`同名构造参数的含义一致，详见[数据库交互](./database.md)。

## 解析SQL片段

动态查询除了使用 DSL 构建，也可以把一段 SQL 片段交给 sqala 内置的解析器生成表达式：

```scala
val query =
    select(unsafeExpr("""lower("u"."name") || '!'""").as("name"))
        .from(table("user").as("u"))
```

`unsafeExpr` 只校验 SQL 语法，不做语义或类型检查，也不校验表、列、函数是否存在。**顾名思义，该方法是“不安全”的**：输入应当是可信的 SQL 片段，绝不能直接拼接用户输入，否则仍然存在 SQL 注入风险。需要拼接用户值时，请使用 `value(...)` 或常规 DSL 构建。

## 过滤

`where` 方法接收一个表达式来过滤数据，通常使用 `value` 生成值表达式；多次调用时，各表达式之间使用 `AND` 拼接：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))
        .where(column("a", "x") === value(1))
```

当然，`===` 等运算符右侧也支持另一个列：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))
        .where(column("a", "x") === column("a", "y"))
```

比较运算和函数的大部分使用规则与静态查询的[静态表达式](./expr.md)相同；条件表达式则针对动态场景做了特化：使用 `caseWhen` 方法传入若干组条件和结果，最后通过 `otherwise` 指定默认值：

```scala
val e =
    caseWhen(
        (column("a") === value(1), value(1)),
        (column("a") === value(2), value(2))
    ).otherwise(value(3))
```

生成的SQL为：

```sql
CASE WHEN "a" = 1 THEN 1 WHEN "a" = 2 THEN 2 ELSE 3 END
```

## 排序

`orderBy` 方法接收若干排序规则（或排序规则的 `List`）生成排序；多次调用会依次拼接：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))
        .where(column("a", "x") === column("a", "y"))
        .orderBy(column("a", "x").asc, column("a", "y").desc)
```

支持的排序规则与[静态查询](./query.md)相同。

## 分组

`groupBy` 方法接收若干表达式（或表达式的 `List`）生成分组；多次调用会依次拼接：

```scala
val query =
    select(count().as("c"))
        .from(table("a"))
        .where(column("a", "x") === column("a", "y"))
        .groupBy(column("a", "x"), column("a", "y"))
```

分组后过滤的 `having` 方法与 `where` 类似，不再赘述。

## 限制结果

`limit` 和 `offset` 方法用于限制结果集：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))
        .limit(10)
        .offset(10)
```

## 关联表

`join` 和 `on` 用于生成关联表：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(
            table("a").join(table("b")).on(column("a", "x") === column("b", "x"))
        )
```

支持的关联类型与[静态查询关联表](./query-join.md)相同。

## 子查询

`subquery` 方法用于生成子查询表达式：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))
        .where(
            column("a", "x") ===
                subquery(select(count().as("c")).from(table("b")))
        )
```

把子查询传给 `table` 方法，再对返回的 `SubqueryTable` 调用 `as` 方法指定别名，即可生成子查询表：

```scala
val query =
    select(count().as("c"))
        .from(
            table(
                select(count().as("c"))
                    .from(table("a"))
            ).as("t1")
        )
```

`any`、`all`、`exists` 用于生成带量词的子查询：

```scala
val query =
    select(column("a", "x").as("col1"))
        .from(table("a"))
        .where(
            column("a", "x") ===
                any(select(column("x").as("x")).from(table("b")))
        )
```

## 集合操作

`union` 等方法用于集合操作：

```scala
val q1 = select(column("x").as("x")).from(table("a"))
val q2 = select(column("x").as("x")).from(table("b"))
val query = q1.union(q2)
```

支持的集合操作与[静态集合操作](./query-set.md)相同。
