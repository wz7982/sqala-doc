# 动态查询

在拖拽式报表平台等场景中，往往表名、列名、查询结构都是动态的，在编译期一无所知，而且经常需要生成带有多层子查询的甚至上千行的复杂查询，而传统的静态ORM和MyBatis为代表的XML模板无法胜任此场景的动态SQL构建，实际应用中我们往往需要：要么使用非常容易出错的字符串拼接；要么接入Calcite等重量级数据库内核前端。

在这种场景下，sqala提供了一个全新的解决方案：为动态查询构建场景专门设计一套DSL，动态构建器减少了[静态查询](./query.md)场景的类型安全校验，但内部也沿用了sqala底层的SQL语法树等基础设施，因此也提供了SQL安全转义，且保证生成的SQL语法正确，调用形式既不像字符串拼接那样容易出错，也不像手动拼接语法树那样繁琐。

需要注意的是，动态查询构建场景与[静态查询](./query.md)的场景完全不同，为了区分两种使用场景，sqala采用了完全不同的DSL风格，以更好的贴合使用场景，并且作为视觉区分。

动态查询构建器可以从`import sqala.dynamic.dsl.*`导入。

动态查询构建器依然是**无副作用的**，每次调用其中方法都会生成一个新的查询，而不是修改之前的查询。

## 构建查询

`from`方法创建一个查询，其参数通常是若干个使用`table`方法生成的表：

```scala
val q =
    from(table("a"), table("b"))
```

动态查询的表名使用字符串传递，所以其可以来自外界传参，sqala会对表名进行安全转义：

```scala
val tableNames = List("a", "b")

val tables = tableNames.map(n => table(n))

val q =
    from(tables)
```

`as`方法给表起别名：

```scala
val q =
    from(table("a").as("t1"), table("b").as("t2"))
```

`from`后，需要使用`select`方法传递若干个查询列（或者一个查询列的`List`），来完成查询创建，查询字段通常使用`column`方法创建，`as`方法给表达式起别名，多次调用会依次拼接：

```scala
val q =
    from(table("a")).select(column("a", "x").as("col1"))
```

## 生成SQL

`sql`方法用于生成SQL字符串，参数是方言和转义模式（参考[数据库交互](./database.md)）:

```scala
val q =
    from(table("a")).select(column("a", "x").as("col1"))

val sql = q.sql(PostgresqlDialect, true)
```

## 获取查询树

在动态构建场景下，往往需要对生成的SQL进行一些优化或者转换工作，但这些工作是无法在SQL字符串层面展开的，此时我们可以使用`ast`方法来查看sqala生成的查询语法树，如果您有编译器和数据库内核相关领域知识，可以查看`sqala.ast`包的相关定义，就可以使用sqala生成的语法树进行查询优化或转换工作：

```scala
val q =
    from(table("a")).select(column("a", "x").as("col1"))

val queryTree: sqala.ast.statement.SqlQuery = q.ast
```

当然，表和表达式也支持`ast`方法：

```scala
val t = table("a")
val tableTree: sqala.ast.table.SqlTable = t.ast

val e = column("c") == value(1)
val exprTree: sqala.ast.expr.SqlExpr = e.ast
```

在查询树转换完毕后，我们可以这样来生成SQL：

```scala
val printer = PostgresqlDialect.printer(standardEscapeStrings)
// 或是printTable、printExpr等方法，您可以自行查看sqala.printer.SqlPrinter中的相关定义
printer.printQuery(queryTree)
val sql = printer.sql
```

## 过滤

`where`方法传递一个表达式，来过滤数据，通常使用`value`来生成值表达式，多次调用使用`AND`来拼接表达式：

```scala
val q =
    from(table("a"))
        .where(column("a", "x") == value(1))
        .select(column("a", "x").as("col1"))
```

当然，`==`等运算符右侧也支持另一个列：

```scala
val q =
    from(table("a"))
        .where(column("a", "x") == column("a", "y"))
        .select(column("a", "x").as("col1"))
```

比较运算和函数的大部分使用规则与静态查询的[静态表达式](./expr.md)相同，但条件表达式为了动态场景特化，使用`caseWhen`方法传递若干个表达式（或一个表达式的`List`），采用`CASE`和`WHEN`的顺序传递，如果表达式个数是奇数则将最后一个置入`ELSE`：

```scala
val e =
    caseWhen(
        column("a") == value(1),
        value(1),
        column("a") == value(2),
        value(2),
        value(3)
    )
```

生成的SQL为：

```sql
CASE WHEN "a" = 1 THEN 1 WHEN "a" = 2 THEN 2 ELSE 3
```

## 排序

`orderBy`方法传递若干个排序规则（或一个排序规则的`List`）生成排序，多次调用会依次拼接：

```scala
val q =
    from(table("a"))
        .where(column("a", "x") == column("a", "y"))
        .select(column("a", "x").as("col1"))
        .orderBy(column("a", "x").asc, column("a", "y").desc)
```

排序规则支持与[静态查询](./query.md)的排序规则相同。

## 分组

`groupBy`方法传递若干个表达式（或一个表达式的`List`）生成分组，多次调用会依次拼接：

```scala
from(table("a"))
    .where(column("a", "x") == column("a", "y"))
    .groupBy(column("a", "x"), column("a", "y"))
    .select(count().as("c"))
```

分组后过滤的`having`方法与`where`类似，不再赘述。

## 限制结果

`limit`和`offset`方法用来限制结果集：

```scala
from(table("a"))
    .select(column("a", "x").as("col1")).limit(10).offset(10)
```

## 关联表

`join`和`on`用来生成关联表：

```scala
val q =
    from(
        table("a").join(table("b")).on(column("a", "x") == column("b", "x"))
    )
```

支持的关联类型与[静态查询关联表](./query-join.md)相同

## 子查询

`subquery`方法用于生成子查询表达式：

```scala
val q =
    from(table("a"))
        .where(
            column("a", "x") ==
                subquery(from(table("b")).select(count().as("c")))
        )
```

`subqueryTable`用于生成子查询表：

```scala
val q =
    from(
        from(table("a")).select(count().as("c")).as("t1")
    ).select(count().as("c"))
```

`any`、`all`、`exists`用于生成带量词的子查询：

```scala
val q =
    from(table("a"))
        .where(
            column("a", "x") ==
                any(from(table("b")).select(column("x").as("x")))
        )
```

## 集合操作

`union`等方法用于集合操作：

```scala
val q1 = from(table("a")).select(column("x").as("x"))
val q2 = from(table("b")).select(column("x").as("x"))
val q = q1.union(q2)
```

支持的集合操作与[静态集合操作](./query-set.md)相同。