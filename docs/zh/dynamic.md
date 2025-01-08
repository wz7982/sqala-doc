# 动态查询

之前介绍的都是偏向于编译期确定的查询构造，sqala可以提供类型安全以及自动反序列化的能力，但是在某些应用里（比如用户可定制的报表系统），执行的查询并不能在编译期事先知道，我们甚至在编译期不知道数据中有什么表，表中有什么字段，为了应对这种场景，sqala提供了一套动态查询DSL。

首先添加依赖：

```scala
libraryDependencies += "com.wz7982" % "sqala-dynamic_3" % "latest.integration"
```

既然编译期不知道有什么样的表，自然也不可能编写出对应的实体类，所以我们使用`table`、`column`两个方法来动态创建表和字段，并且带入到查询里，动态查询DSL需要`import sqala.dynamic.*`：

```scala
import sqala.dynamic.*

val q = select (List(column("a"), column("b"))) from table("t") where column("a") == 1
```

sqala的动态查询不仅可以填写简单的字符串，我们可以传进一个SQL片段，`unsafeExpr`方法会启用一个SQL解析器，并将其转换成SQL的语法树：

```scala
val q = select (List(unsafeExpr("a"), unsafeExpr("b"))) from table("t") where unsafeExpr("a = 1") && unsafeExpr("b") == 1
```

**顾名思义，unsafeExpr方法是不安全的，其可能有SQL注入风险，请慎用！**

下面我们来详细了解sqala的动态查询构造器。

## SELECT

使用`select`方法创建一个`SELECT`语句：

```scala
val s = select(List(column("a"), column("b") as "column"))
```

链式调用`select`会在生成SQL时依次拼接。

假设我们有一个运行时获取的字段列表，需要放入查询中，可以这样来编写：

```scala
// 假设列表是运行时获取的
val columnList: List[String] = List("a", "b")

val s = select(columnList.map(column(_)))
```

## FROM

使用`from`方法配合`table`生成`FROM`子句：

```scala
val s = select (column("a"), column("b")) from table("t")
```

## WHERE

使用`where`方法生成`WHERE`子句：

```scala
val s = select (column("a"), column("b")) from table("t") where column("a") == 1
```

假设我们有一个运行时确定的值列表，我们需要在查询中使用`OR`拼接，可以这样编写：

```scala
// 假设列表是运行时获取的
val values = List("x", "y", "z")
val condition = values.map(v => column("a") == v).reduce((x, y) => x || y)
val s = select (column("a")) from table("t") where condition
```

生成的SQL形如：

```sql
SELECT a FROM t WHERE a = 'x' OR a = 'y' OR a = 'z'
```

链式调用`where`会使用`AND`拼接条件。

## JOIN

使用`join`、`leftJoin`、`rightJoin`、`fullJoin`配合`on`方法，生成一个`JOIN`表，然后放入`from`中：

```scala
val t = table("a") join table("b") on column("a.x") == column("b.y")
val s = select (column("*")) from t
```

## GROUP BY

使用`groupBy`方法生成`GROUP BY`子句：

```scala
val s = select (List(column("a"), sum(column("b")))) from table("t") groupBy List(column("a"))
```

链式调用`groupBy`会依次拼接。

使用`having`方法生成`HAVING`子句：

```scala
val s = select (List(column("a"), sum(column("b")))) from table("t") groupBy List(column("a")) having sum(column("b")) > 1
```

## ORDER BY

使用`orderBy`方法生成`GROUP BY`子句，配合表达式的`asc`、`desc`方法使用：

```scala
val s = select (List(column("a"), column("b"))) from table("t") orderBy List(column("a").asc, column("b").desc)
```

链式调用`orderBy`会依次拼接。

## LIMIT

使用`limit`和`offset`方法创建`LIMIT`子句：

```scala
val s = select (List(column("a"), column("b"))) from table("t") limit 10 offset 10
```

生成SQL时会根据数据库方言分别生成不同的SQL。

## UNION

使用`union`、`unionAll`、`except`、`exceptAll`、`intersect`、`intersectAll`方法生成集合查询：

```scala
val s1 = select (column("a")) from table("t1")
val s2 = select (column("b")) from table("t2")
val s = s1 union s2
```

## 子查询

子查询可以作为表达式的一部分出现，比如：

```scala
val subQuery = select (max(column("a"))) from table("t")

val s = select (List(column("a"))) from table("t") where column("a") < subQuery
```

此外也支持`IN`、`ANY`、`SOME`、`ALL`、`EXISTS`等子查询相关谓词。

`FROM`中的子查询，需要我们使用`as`方法给字段和查询起别名，然后再次引用：

```scala
val subQuery = select (List(column("x"), column("y"))) from table("t1") as "q1"

val q = select (List(column("q1.x"), column("q1.y"))) from subQuery
```

## 表达式

动态查询构造器的表达式，大部分的用法都与静态查询的[表达式](https://wz7982.github.io/sqala-doc/expr/)部分类似，可以参照其中的说明，不同的是`CASE`表达式的用法，其是为了方便运行时动态构建`CASE`：

```scala
val caseExpr = `case`(List(column("a") == 1 -> 1, column("a") == 2 -> 2), 0)
```

为了在高度动态的查询构造场景中保持易用性，动态查询的表达式并没有采用严格的类型安全设计。

## 生成SQL

在创建好查询之后，如果我们要发送给JDBC处理，还需要获取生成的SQL，我们可以使用`sql`方法配合`sqala.printer`中的`Dialect`生成SQL：

```scala
import sqala.printer.Dialect

val s = select (List(column("a"), column("b"))) from table("t")
val sql: (String, Array[Any]) = s.sql(MySqlDialect)
```

`sql`方法返回一个二元组，第一项是生成的SQL语句，第二个参数是其中的参数。