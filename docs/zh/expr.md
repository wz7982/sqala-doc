# 表达式

sqala包含了一个SQL表达式类型`Expr`，其包装了一个SQL的AST，为sqala带来了无与伦比的抽象能力。下面我们将来介绍一些常用的sqala表达式。

## 字段

字段表达式是最基本的表达式之一，sqala会在查询构建时自动为实体类的伴生对象生成对应的字段表达式，比如实体类中的字段为`Int`类型，sqala会自动生成对应的`Expr[Int]`版本，存储数据库的表名和列名信息：

```scala
// u.id是一个字段类型表达式
val q = query:
    from(User).map(u => u.id)
```

## 值

在sqala内置支持的数据类型，比如`Int`、`String`等，或是实现了`CustomField`的类型的值，都可以作为sqala的值表达式，它们可以很自然地出现在查询中，而不需要显式转换成`Expr`，这是使用Scala3强大的上下文抽象能力实现的：

```scala
val q = query:
    from(User).map(u => (u.id, 1, "a"))
```

sqala的可空值使用`Option`来管理，但由于`None`没有实际的类型，会破坏sqala的类型安全性，所以我们不支持`None`，而空值需要使用`Option.empty[T]`来构建：

```scala
val q = query:
    from(User).map(u => (u.id, Option.empty[String]))
```

## 转换表达式

在sqala内置的几乎全部功能中，您都可以无缝将`Expr`、子查询、值等类型混合计算（这个能力是由trait AsExpr接管的），但在某些自定义功能比如自定义函数，自定义运算符等场景，为了方便使用，sqala允许您显式地将值、子查询转为`Expr`类型。

`asExpr`就是转换方法，上面的例子也可以写成：

```scala
val q = query:
    from(User).map(u => (u.id, 1.asExpr, "a".asExpr))
```

## 关系运算

### 符号运算符

除了字段和值之外，最常见的就是关系运算表达式，它常用于查询表达式的`filter`、`on`、`having`等方法中。

sqala支持一下的符号关系运算符：

| 运算符名称 | 对应SQL运算符          |
|:---------:|:---------------------:|
| `==`      | `=`                   |
| `!=`      | `<>`                  |
| `<=>`     | `IS NOT DISTINCT FROM`|
| `>`       | `>`                   |
| `>=`      | `>=`                  |
| `<`       | `<`                   |
| `<=`      | `<=`                  |

我们可以像使用Scala自带的运算符那样使用它们：

```scala
val q = query:
    from(User).filter(u => u.id == "小黑")
```

由于sqala有强大的类型兼容性，因此运算符的右侧不仅可以是值，也可以是其他表达式或子查询，这种情况常用于连接条件中：

```scala
val q = query:
    from(User).filter(u => u.id == u.id)
```

由于Scala的限制，`==`和`!=`左侧如果不是`Expr`类型，则会产生编译错误，所以sqala提供了`===`和`<>`应对此类情况（其他运算符不受此影响）：

```scala
val q = query:
    from(User).filter(u => "小黑" === u.id)
```

或是显式使用`asExpr`将值转为`Expr`类型：

```scala
val q = query:
    from(User).filter(u => "小黑".asExpr == u.id)
```

### IS NULL

`isNull`方法对应SQL的`IS NULL`，用于探测值是否为空：

```scala
val q = query:
    from(User).filter(u => u.id.isNull)
```

### IN

`in`方法对应SQL的`IN`运算符，sqala支持两种`in`模式，第一种是传入一个值的集合，这是最常见的用法：

```scala
val q = query:
    from(User).filter(u => u.id.in(List(1, 2, 3)))
```

**由于SQL中`IN ()`通常是语法错误，因此sqala会在空集合时开启优化，将此段表达式优化成`FALSE`**。

`in`方法也可以传入一个表达式元组，此元组兼容`Expr`、值、子查询：

```scala
val q = query:
    from(User).filter(u => u.id.in(1, u.id, from(User).map(_.id).take(1)))
```

并且，sqala的运算符通常有着极强的类型兼容性，比如以下写法也是合法的：

```scala
val list: List[Option[Long]] = List(Some(1L), None, Some(2L))

val q = query:
    from(User).filter(u => u.id.in(list))
```

但当类型不符时：

```scala
val list: List[String] = List("a", "b", "c")

val q = query:
    from(User).filter(u => u.id.in(list))
```

将会返回编译错误。

### LIKE

`like`方法对应SQL的`LIKE`运算符，右侧兼容`Expr`、值、子查询：

```scala
val q = query:
    from(User).filter(u => u.name.like("%小%"))
```

`contains`是一个`like`的简易版本，不需要手动填写`%%`，但右侧只兼容`String`：

```scala
val q = query:
    from(User).filter(u => u.name.contains("小"))
```

`startsWith`和`endsWith`与`contains`类似：

```scala
val q = query:
    from(User).filter(u => u.name.startsWith("小"))
```

### BETWEEN

`between`是一个有两个参数的方法，对应三元表达式`BETWEEN`，参数兼容`Expr`、值、子查询：

```scala
val q = query:
    from(User).filter(u => u.id.between(1, 10))
```

## 逻辑运算

sqala支持二元逻辑运算`&&`（对应`AND`）和`||`（对应`OR`）：

```scala
val q = query:
    from(User).filter(u => u.id == 1 && u.name == "小黑")
```

通常来说`&&`的优先级比`||`高，我们也可以通过`()`控制优先级：

```scala
val q = query:
    from(User).filter(u => u.id < 5 && (u.name == "小黑" || u.name == "小白"))
```

一元逻辑运算`!`对应SQL的`NOT`运算符：

```scala
val q = query:
    from(User).filter(u => !(u.name == "小黑"))
```

在`!`的右侧是`like`、`in`、`between`等运算符时，实际生成的是`NOT LIKE`、`NOT IN`、`NOT BETWEEN`等。

## 多列比较

sqala允许多列同时参与关系运算，但`==`需要替换为`===`，`!=`需要替换为`<>`：

```scala
val q1 = query:
    from(User).filter: u =>
        (u.id, u.name) === (1, "小黑")

val q2 = query:
    from(User).filter: u =>
        (u.id, u.name).in(List((1, "小黑"), (2, "小白")))

val q3 = query:
    from(User).filter: u =>
        (u.id, u.name).in(from(User).map(uu => (uu.id, uu.name)))
```

## 数值运算

sqala支持以下数值运算符：

| 运算符名称 | 对应SQL运算符 |
|:---------:|:------------:|
| `+`       | `+`          |
| `-`       | `-`          |
| `*`       | `*`          |
| `/`       | `/`          |

```scala
val q = query:
    from(User).filter(u => u.id + 1 > 5).map(_.id * 100)
```

sqala的数值运算依然有极其强大的类型兼容性，比如`Expr[Int]`和`Option[Double]`类型的两个表达式进行数值运算，实际上会返回`Expr[Option[Double]]`类型的表达式。

sqala还支持`%`运算符，但实际会生成SQL标准的`MOD`函数。

## 字符串拼接

sqala支持数据库的`||`拼接运算符，我们可以使用`+`来拼接字符串，sqala会自动识别两侧的表达式类型，如果是数值则生成`+`运算符，如果是字符串则生成`||`运算符：

```scala
val q = query:
    from(User).map(u => u.name + "abc")
```

在MySQL等不支持`||`运算符的数据库中，这个操作将生成`CONCAT`函数表达式。

## 条件表达式

`if`/`then`/`else`等方法对应SQL的`CASE WHEN THEN ELSE END`表达式，由于这些都是Scala的关键字，因此需要使用反引号括起来，参数同样兼容`Expr`、值、子查询：

```scala
val q = query:
    from(User).map(u => `if` (u.id == 1) `then` 1 `else if` (u.id == 2) `then` u.id `else` Option.empty[Int])
```

`coalesce`对应SQL的`COALESCE`表达式，用于返回参数中第一个非空值，但为了易用性，sqala也支持`ifNull`作为同义词：

```scala
val q = query:
    from(User).map(u => coalesce(u.id, 1))
```

`nullIf`对应SQL的`NULLIF`表达式用于匹配两个值，如果相同则返回`NULL`：

```scala
val q = query:
    from(User).map(u => nullIf(u.id, 1))
```

## 函数

由于各个数据库函数差异极大，因此sqala只内置了ISO 9075标准中定义的SQL函数，虽然这些函数是标准函数，但仍要参考您实际使用的数据库文档是否支持这些函数，这些函数的作用也请参考数据库相关文档，不在此标准函数列表中的，您可以使用sqala提供的[自定义表达式](./expr-custom.md)功能自行创建。

函数使用示例：

```scala
val q = query:
    from(User).map(u => substring(u.name, 1))
```

sqala内置支持的函数如下（此处没有列举聚合函数、窗口函数、时间操作函数、JSON函数等）：

|     函数           |      对应的SQL函数      |
|:-----------------:|:-----------------------:|
|`substring(a, b)`  |`SUBSTRING(a FROM b)`    |
|`substring(a, b, c)`|`SUBSTRING(a FROM b FOR c)`|
|`upper(a)`        |`UPPER(a)`                |
|`lower(a)`        |`LOWER(a)`                |
|`lpad(a, b, c)`   |`LPAD(a, b, c)`           |
|`rpad(a, b, c)`   |`RPAD(a, b, c)`           |
|`btrim(a, b)`     |`BTRIM(a, b)`             |
|`ltrim(a, b)`     |`LTRIM(a, b)`             |
|`rtrim(a, b)`     |`RTRIM(a, b)`             |
|`overlay(a, b, c)`|`OVERLAY(a PLACING b FROM c)`|
|`overlay(a, b, c, d)`|`OVERLAY(a PLACING b FROM c FOR d)`|
|`regexpLike(a, b)`|`REGEXP_LIKE(a, b)`      |
|`position(a, b)` |`POSITION(a IN b)`         |
|`charLength(a)`   |`CHAR_LENGTH(a)`          |
|`octetLength(a)`  |`OCTET_LENGTH(a)`         |
|`abs(a)`           |`ABS(a)`                  |
|`mod(a, b)`        |`MOD(a, b)`               |
|`sin(a)`         |`SIN(a)`                 |
|`cos(a)`         |`COS(a)`                 |
|`tan(a)`         |`TAN(a)`                 |
|`asin(a)`         |`ASIN(a)`                 |
|`acos(a)`         |`ACOS(a)`                 |
|`atan(a)`         |`ATAN(a)`                 |
|`sinh(a)`         |`SINH(a)`                 |
|`cosh(a)`         |`COSH(a)`                 |
|`tanh(a)`         |`TANH(a)`                 |
|`log(a, b)`       |`LOG(a, b)`                 |
|`log10(a)`       |`LOG10(a)`                 |
|`ln(a)`         |`LN(a)`                 |
|`exp(a)`         |`EXP(a)`                 |
|`sqrt(a)`         |`SQRT(a)`                 |
|`power(a, b)`     |`POWER(a, b)`             |
|`ceil(a)`         |`CEIL(a)`                 |
|`floor(a)`       |`FLOOR(a)`                 |
|`round(a, b)`     |`ROUND(a, b)`              |
|`widthBucket(a, b, c, d)`|`WIDTH_BUCKET(a, b, c, d)`|
|`currentDate()`   |`CURRENT_DATE`          |
|`currentTime()`   |`CURRENT_TIME`          |
|`currentTimestamp()`|`CURRENT_TIMESTAMP`    |
|`localTime()`     |`LOCALTIME`             |
|`localTimestamp()`|`LOCALTIMESTAMP`        |

## 类型转换

`as`方法配合类型参数进行类型转换，对应SQL的`CAST`表达式：

```scala
val q = query:
    from(User).map(u => u.id.as[String])
```

<!-- # 表达式

## 向量运算

随着AI应用日渐火热，各种关系型数据库也陆续推出了向量运算功能，sqala也支持了向量运算符并做了一些数据库兼容工作，将字段类型设置成`sqala.metadata.Vector`即可应用此类运算符，运算符和转换规则如下：

| 运算符 | 含义    | PostgreSQL(pgvector插件) | Oracle 23ai | SQLServer 2025 | MySQL 9.0(HeatWave) |
|:-----:|:-------:|:------------------------:|:-----------:|:--------------:|:---------:|
|`<->`    |欧氏距离  |`a <-> b`     |`L2_DISTANCE(a, b)` | `VECTOR_DISTANCE('euclidean', a, b)` | `DISTANCE(a, b, 'EUCLIDEAN')`|
|`<=>`    |余弦距离| `a <=> b`     |`COSINE_DISTANCE(a, b)`|`VECTOR_DISTANCE('cosine', a, b)`|`DISTANCE(a, b, 'COSINE')`|
|`<#>`   | 负内积| `a <#> b`     |`INNER_PRODUCT(a, b) * -1`|`VECTOR_DISTANCE('dot', a, b)`|`DISTANCE(a, b, 'DOT')`|


```scala
val q = query:
    from[Test].map(d => d <-> "[0.1, 0.2]")
```

**由于MySQL的JDBC驱动原因，sqala暂不支持在MySQL环境下反序列化Vector类型，请手动添加VECTOR_TO_STRING函数转为字符串接收**。

## 函数

sqala内置了一些常用函数

| 函数名称 | 对应SQL函数 |
|:--------:|:----------:|
|`coalesce`|`COALESCE`  |
|`ifNull`  |`COALESCE`  |
|`nullIf`  |`NULLIF`    |
|`abs`     |`ABS`       |
|`ceil`    |`CEIL`      |
|`floor`   |`FLOOR`     |
|`round`   |`ROUND`     |
|`power`   |`POWER`     |
|`concat`  |`CONCAT`    |
|`substring`|`SUBSTRING`|
|`replace` |`REPLACE`   |
|`trim`    |`TRIM`      |
|`upper`   |`UPPER`     |
|`lower`   |`LOWER`     |
|`now`     |`NOW`       |

由于各种数据库的函数的差异极大，sqala没有内置其他的SQL函数，但我们可以使用`Expr.Func`创建函数。

我们以MySQL的`LEFT`函数为例：

```scala
def left(x: Expr[String], n: Int): Expr[String] =
    Expr.Func("LEFT", x :: n.asExpr :: Nil)
```

这样我们就可以使用它构建查询了：

```scala
val q = query:
    from[Department].map(d => left(d.name, 2))
```

函数类型的表达式当然也可以嵌套调用：

```scala
val q = query:
    from[Department].map(d => left(left(d.name, 2), 1))
```

## 聚合函数

sqala内置了几个常用的SQL标准聚合函数：

| 函数名称              | 对应SQL函数        |
|:--------------------:|:------------------:|
| `count()`            | `COUNT(*)`         |
| `count(expr)`        | `COUNT(x)`         |
| `sum(expr)`          | `SUM(x)`           |
| `max(expr)`          | `MAX(x)`           |
| `min(expr)`          | `MIN(x)`           |
| `avg(expr)`          | `AVG(x)`           |
| `anyValue(expr)`     | `ANY_VALUE(x)`     |

```scala
val q = query:
    from[Department].map(d => (c = count(), s = sum(d.id)))
```

聚合函数也可以和其他表达式组合：

```scala
val q = query:
    from[Department].map(d => (c = count() + sum(d.id * 100)))
```

### 特殊聚合函数

#### percentileDisc和percentileCont

sqala支持两个特殊的数值聚合函数`percentileDisc`和`percentileCont`，对应到数据库的`PERCENTILE_DIST`和`PERCENTILE_CONT`函数。

用法如下：

```scala
val q = query:
    from[Department]
        .map: d =>
            percentileDisc(0.5, withinGroup = d.id.asc)
```

第一个参数接收一个`Double`值；

第二个参数`withinGroup`接收一个排序规则，排序字段必须是数值类型。

**MySQL、SQLite等数据库暂不支持此函数。**

#### stringAgg

sqala支持特殊的字符串聚合函数`stringAgg`、`groupConcat`和`listAgg`，三个方法的实质内容完全一致，作用是拼接字符串，用法如下：

```scala
val q = query:
    from[Department]
        .map: d =>
            stringAgg(d.name, ",", d.id.asc)
```

第一个参数是一个字符串表达式；

第二个参数是`String`值，为分隔符；

后续是若干个排序规则，可省略。

sqala对此函数进行了特殊方言适配，规则如下：

在PostgreSQL或SQLServer中，生成`STRING_AGG`函数；

在MySQL中，生成`GROUP_CONCAT`函数，并将分隔符置于`SEPARATOR`关键字之后；

在SQLite中，生成`GROUP_CONCAT`函数；

在Oracle或DB2中，生成`LISTAGG`函数，并将排序规则放入`WITHIN GROUP`子句中。

#### grouping

sqala支持`grouping`聚合函数，对应到数据库的`GROUPING`函数，用于区分哪些表达式参与了当前分组，在`GROUP BY CUBE`等复杂分组下且被分组表达式可能有空值的场景十分有用，其参数为若干个分组表达式：

```scala
val q = query:
    from[Department]
        .groupBy d =>
            (name = d.name)
        .map: (g, _) =>
            grouping(g.name)
```

**请注意：对于`GROUPING`函数，MySQL数据库限制其必须在`GROUP BY ROLLUP`或`GROUP BY GROUPING SETS`的查询中使用；SQLite数据库不支持此函数，sqala不对以上情况进行编译期检查。**

### 自定义聚合函数

除了sqala内置的聚合函数外，我们也可以使用`Expr.Func`轻易自定义聚合函数。

除了函数都具有的函数名、参数列表等字段，聚合函数可以使用`Expr.Func`的：

    1. 字段名为`sortBy`，生成聚合函数的`ORDER BY`子句。
    2. 字段名为`withinGroup`，会生成聚合函数的`WITHIN GROUP`子句。
    3. 字段名为`filter`，会生成聚合函数的`FILTER`子句。
    4. 字段名为`distinct`，值为`true`时对应到`DISTINCT`的聚合函数。

## 窗口函数

sqala支持下面几个分析函数：

| 函数名称           | 对应SQL函数          |
|:-----------------:|:--------------------:|
| `rank()`          | `RANK()`             |
| `denseRank()`     | `DENSE_RANK()`       |
| `percentRank()`   | `PERCENT_RANK()`     |
| `rowNumber()`     | `ROW_NUMBER()`       |
| `lag`             | `LAG(x, n, default)` |
| `lead`            | `LEAD(x, n, default)`|
| `ntile(n)`        | `NTILE(n)`           |
| `firstValue`      | `FIRST_VALUE(x)`     |
| `lastValue`       | `LAST_VALUE(x)`      |
| `nthValue`        | `NTH_VALUE(x)`       |
| `cumeDist()`      | `CUME_DIST()`        |

在分析函数或聚合函数之后调用`over`，可以生成窗口函数表达式，可以使用`partitionBy`及`sortBy`（或`orderBy`），`partitionBy`的参数是若干表达式，`sortBy`的参数是若干表达式生成的排序规则：

```scala
val q = query:
    from[Department].map: d =>
        rank() over (partitionBy (d.birthday) sortBy (d.name.asc))
```

窗口函数的参数可以为空：

```scala
val q = query:
    from[Department].map: d =>
        rank() over ()
```

窗口函数的参数可以仅有`sortBy`（或`orderBy`）：

```scala
val q = query:
    from[Department].map: d =>
        rank() over (sortBy (d.name.asc))
```

sqala支持窗口函数的框架，使用`rowsBetween`、`rangeBetween`、`groupsBetween`生成一个框架，以上方法均有两个参数，可能为：

|        参数        |
|:------------------:|
|`currentRow`        |
|`unboundedPreceding`|
|`unboundedFollowing`|
|`n.preceding`       |
|`n.following`       |

比如：

```scala
import scala.language.postfixOps

val q = query:
    from[Department].map: d =>
        rank() over (partitionBy (d.birthday) sortBy (d.name.asc) rowsBetween (currentRow, 1 preceding))
```

窗口函数也支持单参数的框架`rows`、`range`、`groups`：

```scala
import scala.language.postfixOps

val q = query:
    from[Department].map: d =>
        rank() over (partitionBy (d.birthday) sortBy (d.name.asc) rows currentRow)
```

## JSON操作

sqala支持`->`和`->>`两个JSON操作符，语义与MySQL和PostgreSQL一致：

```scala
val q = query:
    from[A].map: a =>
        a.x -> 0 ->> "a"
```

对于JSON操作，需要将字段类型指定为`sqala.metadata.Json`：

```scala
import sqala.metadata.Json

case class A(x: Json)
```

其定义为`opaque type Json = String`。我们可以使用其`toString`方法转换为字符串。

## 时间操作

我们可以使用`interval`方法来对时间进行操作：

```scala
import scala.language.postfixOps

val q = query:
    from[A].map: a =>
        a.date + interval(1 day) + interval(1 month)
```

`interval`的第一个参数是`Double`类型，第二个参数是时间单位，sqala支持以下时间单位：

| 单位 | 含义 |
|:----:|:----:|
| year |  年  |
| month|  月  |
| week |  周  |
| day  |  日  |
| hour |  时  |
|minute|  分  |
|second|  秒  |

sqala会在生成SQL时自动进行方言转换，比如在SQLServer中会将其转换成`DATEADD`函数，在SQLite中会将其转换成`DATETIME`函数，其他数据库将会生成不同的`INTERVAL`表达式方言。

sqala支持`timestamp`和`date`方法，将字符串转变为数据库的时间字面量表达式，对应的类型分别为`Expr[LocalDateTime]`和`Expr[LocalDate]`：

```scala
val time1 = timestamp("2020-01-01 00:00:00")

val time2 = date("2020-01-01")

val q = query:
    from[A].filter(a => a.date1 == time1 && a.date2 == time2)
```

在Sqlite和SQLServer中会分别转变为日期函数和`CAST`表达式，其他数据库则会生成时间字面量。

我们可以使用`extract`取出时间的某个部分：

```scala
val q = query:
    from[A].map: a =>
        extract(year from a.date)
```

SQLServer中会将其转换成`DATEPART`函数，其他的数据库会生成`EXTRACT`表达式。

可以使用`extract`操作取出时间差值的某个部分：

```scala
val q = query:
    from[A].map: a =>
        extract(day from (a.date1 - a.date2))
```

sqala会自动进行数据库方言适配。

## 自定义二元运算符

sqala支持自定义非标准二元运算符，以MySQL的`RLIKE`为例：

```scala
extension (x: Expr[String])
    def rlike(y: String): Expr[Boolean] =
        Expr(SqlExpr(x, SqlBinaryOperator.Custom("RLIKE"), y.asExpr.asSqlExpr))

val q = query:
    from[A].filter(a => a.x.rlike("..."))
``` -->
