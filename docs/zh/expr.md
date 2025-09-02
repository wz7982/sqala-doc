# 表达式

为了更好地使用sqala处理业务，我们最好对sqala的表达式有一些了解。

sqala中包含了一个SQL表达式类型`Expr`，而`Expr`的子项也接收`Expr`类型的参数，因此，sqala拥有强大的表达式组合能力。

## 字段

字段是最基本的表达式之一，我们在查询构建中使用的字段就是字段表达式：

```scala
// id是一个字段类型的表达式
val q = query:
    from[Department].filter(d => d.id > 1)
```

## 值

除了字段外，值表达式也是最基本的表达式，比如一些需求需要把一个固定的值作为结果的一列：

```scala
val q = query:
    from[Department].map(d => (id = d.id, c1 = 1, c2 = "a"))
```

我们也可以使用`asExpr`将值转为SQL表达式：

```scala
val q = query:
    from[Department].map(d => (id = d.id, c1 = 1.asExpr, c2 = "a".asExpr))
```

## 转换表达式

sqala在绝大部分情况下，均将值（如Int、String等类型）、表达式（Expr类型）、子查询（Query类型）、和其组成的元组视为表达式（由`trait AsExpr`接管），但我们也可以使用`asExpr`方法将非`Expr`类型的值转换为表达式：

```scala
val q = query:
    from[Department].map(d => (c1 = floor(1.asExpr)))
```

## 逻辑、关系运算

除了字段和值之外，构造查询最常用的就是逻辑运算与关系运算表达式，它常用于查询表达式的`filter`、`on`、`having`等方法中。

sqala支持以下的符号运算符：

| 运算符名称 | 对应SQL运算符 |
|:---------:|:------------:|
| `==`      | `=`          |
| `!=`      | `<>`         |
| `>`       | `>`          |
| `>=`      | `>=`         |
| `<`       | `<`          |
| `<=`      | `<=`         |
| `&&`      | `AND`        |
| `\|\|`    | `OR`         |

比如：

```scala
val id = 1
val name = "小黑"
val q = query:
    from[Department].filter(d => d.id > id && d.name == name)
```

如果`==`或`!=`的右侧值是`None`，则对应SQL的`IS NULL`和`IS NOT NULL`

```scala
// a.x IS NULL
val q1 = query:
    from[A].filter(a => a.x == None)

// a.x IS NOT NULL
val q2 = query:
    from[A].filter(a => a.x != None)
```

为了使`!=`与编程语言语义一致，sqala会进行语义优化：

```scala
// a.x <> 1 OR a.x IS NULL
val q = query:
    from[A].filter(a => a.x != 1)
```

运算符的右侧不仅可以是普通的值，也可以是另一个表达式，比如它可以放在`ON`条件里：

```scala
val q = query:
    from[A].join[B].on((a, b) => a.id == b.id)
```

值表达式也可以轻易地放在一个二元运算的左侧，但是`==`需要替换为`===`，`!=`需要替换为`<>`：

```scala
val q = query:
    from[Department].filter(d => 1 === d.id)
```

或是使用`asExpr`显式将值转为表达式：

```scala
val q = query:
    from[Department].filter(d => 1.asExpr == d.id)
```

除了这些符号组成的运算符，sqala还支持一些非符号的运算符：

| 运算符名称    | 对应SQL运算符  |
|:------------:|:-------------:|
| `in`         | `IN`          |
| `between`    | `BETWEEN`     |
| `like`       | `LIKE`        |
| `contains`   | `LIKE '%xxx%'`|
| `startsWith` | `LIKE 'xxx%'` |
| `endsWith`   | `LIKE '%xxx'` |

```scala
val ids = List(1, 2, 3)
val q = query:
    from[Department].filter(d => d.id.in(ids) && d.name.like("小%"))
```

`in`运算在传入一个空列表时，为避免生成错误SQL，此谓词会被优化成`FALSE`。

`in`运算可以也传入一个类型相符的表达式元组，而非值列表：

```scala
val q = query:
    from[Department].filter(d => d.id.in(d.id, d.id + 1, 1))
```

使用`!`创建一元逻辑运算：

```scala
val q = query:
    from[Department].filter(d => !(d.id == 1))
```

对`in`、`between`、`like`等运算符使用逻辑运算`!`，会生成对应的`NOT IN`、`NOT BETWEEN`、`NOT LIKE`运算符，而非一元运算。

## 多列比较

sqala也允许多列同时参与关系运算，与值表达式写在比较左侧类似，`==`需要替换为`===`，`!=`需要替换为`<>`：

```scala
val q1 = query:
    from[Department].filter: d =>
        (d.id, d.name) === (1, "小黑")

val q2 = query:
    from[Department].filter: d =>
        (d.id, d.name).in(List((1, "小黑"), (2, "小白")))

val q3 = query:
    from[Department].filter: d =>
        (d.id, d.name).in(from[Department].map(d => (d.id, d.name)))
```

或是使用`.asExpr`将一个表达式元组转变成一个单一的表达式：

```scala
val q1 = query:
    from[Department].filter: d =>
        (d.id, d.name).asExpr == (1, "小黑")

val q2 = query:
    from[Department].filter: d =>
        (d.id, d.name).asExpr.in(List((1, "小黑"), (2, "小白")))

val q3 = query:
    from[Department].filter: d =>
        (d.id, d.name).asExpr.in(from[Department].map(d => (d.id, d.name)))
```

## 数值运算

sqala支持以下数值运算符：

| 运算符名称 | 对应SQL运算符 |
|:---------:|:------------:|
| `+`       | `+`          |
| `-`       | `-`          |
| `*`       | `*`          |
| `/`       | `/`          |
| `%`       | `%`          |

```scala
val q = query:
    from[Department].filter(d => d.id + 1 > 5).map(_.id * 100)
```

以及一元运算`+`和`-`：

```scala
val q = query:
    from[Department].map(d => -d.id)
```

## 字符串拼接

sqala支持数据库的`||`拼接运算符，但为了不与逻辑运算`OR`冲突，sqala使用`++`来拼接字符串

```scala
val q = query:
    from[Department].map(d => d.name ++ "abc")
```

在MySQL等不支持`||`运算符的数据库中，这个操作将生成`CONCAT`函数表达式。

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

## 条件表达式

sqala使用`if`方法创建`CASE WHEN`表达式：

```scala
val q = query:
    from[Employee].map: e =>
        `if` (e.state == EmployeeState.Active) `then` 1
        `else` 0
```

可以在`then`中返回`Option`类型的值：

```scala
val q = query:
    from[Employee].map: e =>
        `if` (e.state == EmployeeState.Active) `then` Some(1)
        `else` None
```

条件表达式也可以和其他表达式组合：

```scala
val q = query:
    from[Employee].map: e =>
        sum(`if` (e.state == EmployeeState.Active) `then` 1 `else` 0)
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

## 类型转换

我们可以使用`as`方法将表达式转换类型：

```scala
val q = query:
    from[A].map: a =>
        a.x.as[String]
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
```
