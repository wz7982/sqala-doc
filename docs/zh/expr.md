# 表达式

sqala包含了一个SQL表达式类型`Expr`，其封装了一个SQL的AST，为sqala带来了强大的抽象能力。下面介绍一些常用的sqala表达式。

## 字段

字段表达式是最基本的表达式之一。构建查询时，sqala会自动为实体类的伴生对象生成对应的字段表达式：比如实体类中的字段为`Int`类型，sqala会自动生成对应的`Expr[Int]`版本，其中存储了数据库的表名和列名信息：

```scala
// u.id是一个字段类型表达式
val query =
    from(User).map(u => u.id)
```

## 值

sqala内置支持的数据类型（比如`Int`、`String`等）的值，或是实现了`CustomField`的类型的值，都可以直接作为sqala的值表达式。它们可以自然地出现在查询中，无需显式转换成`Expr`，这是借助Scala 3强大的上下文抽象能力实现的：

```scala
val query =
    from(User).map(u => (u.id, 1, "a"))
```

sqala的可空值使用`Option`管理。由于`None`没有具体的类型，请在普通值位置使用`Option.empty[T]`构造空值：

```scala
val query =
    from(User).map(u => (u.id, Option.empty[String]))
```

## 转换表达式

在sqala内置的几乎全部功能中，您都可以无缝地将`Expr`、子查询、值等类型混合计算（该能力由trait AsExpr提供）；而在自定义函数、自定义运算符等场景下，为了方便使用，sqala也允许您显式地将值、子查询转换为`Expr`类型。

`asExpr`即为转换方法，上述例子也可以写成：

```scala
val query =
    from(User).map(u => (u.id, 1.asExpr, "a".asExpr))
```

### 内联表达式

`asInlinedExpr`将值直接渲染为SQL字面量，而不是生成`?`占位符。典型场景是PostgreSQL的`GROUP BY`表达式匹配：

```scala
case class T(x: Int)

val offset = 1

val query =
    from(T)
        .groupBy(t => t.x + offset.asInlinedExpr)
        .map((g, t) => (g, count()))
```

生成的SQL为：

```sql
SELECT
    "t1"."x" + 1 AS "c1",
    COUNT(*) AS "c2"
FROM
    "t" AS "t1"
GROUP BY
    "t1"."x" + 1
```

如果直接使用普通值（`t.x + offset`），PostgreSQL会收到`x + $1`和`x + $2`两个不同的参数表达式，从而认为`SELECT`中的表达式没有出现在`GROUP BY`中；`asInlinedExpr`则使两侧都成为相同的字面量`x + 1`。

同样的查询也可以改写成子查询形式，避免在`GROUP BY`中重复表达式：

```scala
val query =
    from(
        from(T).map(t => (v = t.x + offset))
    )
        .groupBy(r => r.v)
        .map((g, r) => (g, count()))
```

```sql
SELECT
    "t2"."c1" AS "c1",
    COUNT(*) AS "c2"
FROM (
    SELECT
        "t1"."x" + ? AS "c1"
    FROM
        "t" AS "t1"
) AS "t2"
GROUP BY
    "t2"."c1"
```

注意两个示例的展示口径不同：前者是`.sql(dialect)`纯文本生成的形式（值内联为字面量），后者是JDBC执行时实际发送的形式（普通值以`?`占位符传递）。两条路径的区别详见[数据库交互](./database.md)中“方言的两个层次”一节。

`asInlinedExpr`内联的值会由sqala按照当前方言和转义配置进行安全转义。普通查询仍推荐使用`asExpr`或直接书写值，由sqala通过`?`参数绑定。

更多关于JDBC参数与内联表达式的说明，请参考[数据库交互](./database.md)。

## 原生表达式

对于sqala表达式系统无法覆盖的特殊SQL语法（如MySQL的全文检索），可使用`rawExpr`插值器直接书写SQL片段，详见[自定义表达式](./expr-custom.md)。

## 关系运算

### 符号运算符

除了字段和值之外，最常见的就是关系运算表达式，它常用于查询表达式的`filter`、`on`、`having`等方法中。

sqala支持以下的符号关系运算符：

| 运算符名称 | 对应SQL运算符          |
|:---------:|:---------------------:|
| `===`      | `=`                   |
| `<>`      | `<>`                  |
| `<=>`     | `IS NOT DISTINCT FROM`|
| `>`       | `>`                   |
| `>=`      | `>=`                  |
| `<`       | `<`                   |
| `<=`      | `<=`                  |

我们可以像使用Scala自带的运算符那样使用它们：

```scala
val query =
    from(User).filter(u => u.name === "小黑")
```

由于sqala具有强大的类型兼容性，运算符的右侧不仅可以是值，也可以是其他表达式或子查询。这种情况常用于连接条件中：

```scala
val query =
    from(User).filter(u => u.id === u.id)
```

`===`等运算符不要求两侧类型一致，只需要在SQL标准中允许兼容即可。比如，数据库允许数值类型之间跨类型比较，也允许可空类型和不可空类型之间直接比较，以下SQL是合法的：

```sql
SELECT
    CAST(1 AS INTEGER) = CAST(NULL AS BIGINT)
```

因此sqala允许这种写法：

```scala
val query =
    // u.id是Expr[Int]，允许和Option[Long]直接比较
    from(User).filter(u => u.id === Option(1L))
```

数据库允许时间类型和字符串之间比较，因此sqala允许时间和字符串类型的表达式直接比较：

```scala
val query =
    // u.createTime是Expr[LocalDateTime]，允许和String直接比较
    from(Post).filter(p => p.createTime > "2020-01-01 00:00:00")
```

此处可以举一个极端但能体现sqala类型兼容性的例子。设有如下实体类：

```scala
case class Entity(x: Array[Option[Array[Int]]], y: Option[Array[Array[Option[Int]]]])
```

实体类的两个字段都是嵌套两层的`Int`数组，仅空值策略不同。sqala允许这样**层数相同**且类型兼容的两个数组字段进行比较：

```scala
val query =
    from(Entity).filter(e => e.x === e.y)
```

但如果两侧类型不兼容，sqala会在编译期严格禁止：

```scala
val query =
    // 编译错误
    from(User).filter(u => u.id === "abc")
```

类似地，如果把上面复杂例子中右侧字段的最内层改成字符串类型：

```scala
case class Entity(x: Array[Option[Array[Int]]], y: Option[Array[Array[Option[String]]]])
```

sqala同样不允许这两个字段比较：

```scala
val query =
    // 编译错误
    from(Entity).filter(e => e.x === e.y)
```

sqala的类型兼容性检查不止停留在表面一层，而是递归检查整个类型树。

sqala的关系运算符（`===`、`<>`等）左侧可以是任意可提升为表达式的值，不再依赖 Scala 的 `==`/`!=` 重载，因此不会与 Scala 的相等语义冲突（其他运算符不受此影响）：

```scala
val query =
    from(User).filter(u => "小黑" === u.name)
```

或显式使用`asExpr`将值转换为`Expr`类型：

```scala
val query =
    from(User).filter(u => "小黑".asExpr === u.name)
```

少数情况下，比较结果（`Boolean`）需要再次参与比较，此时要特别注意运算符优先级。在Scala中，`!=`的优先级低于`<`、`>`，因此`a != b < c`会被解析为`a != (b < c)`；但sqala使用的`<>`以`<`开头，优先级与`<`、`>`相同，因此`a <> b < c`会被解析为`(a <> b) < c`。这一差异在比较结果再次参与比较时可能改变语义，比如`true <> false < true`（这里的`true`、`false`可以理解为返回`Boolean`的表达式）。遇到此类情况，请手动添加括号明确分组，例如`true <> (false < true)`。

### IS NULL

`isEmpty`方法对应SQL的`IS NULL`，用于判断可空表达式是否为空：

```scala
val query =
    from(User).filter(u => u.name.isEmpty)
```

取反即可得到`IS NOT NULL`：

```scala
val query =
    from(User).filter(u => !u.name.isEmpty)
```

### IN

`in`方法对应SQL的`IN`运算符。sqala支持两种`in`用法：第一种是使用`Seq`、`List`等传入一个值的集合，这是最常见的用法：

```scala
val query =
    from(User).filter(u => u.id.in(List(1, 2, 3)))
```

**由于SQL中`IN ()`通常是语法错误，因此sqala会在传入空集合时启用优化，将该表达式改写为`1 = 0`**。

`in`方法也可以传入一个表达式元组，元组各项同时兼容`Expr`、值、子查询：

```scala
val query =
    from(User).filter(u => u.id.in(1, u.id, from(User).map(_.id).take(1)))
```

并且，sqala的运算符通常具有极强的类型兼容性，以下写法也是合法的：

```scala
val list: List[Option[Long]] = List(Some(1L), None, Some(2L))

val query =
    from(User).filter(u => u.id.in(list))
```

但当类型不符时，将会返回编译错误：

```scala
val list: List[String] = List("a", "b", "c")

val query =
    // 编译错误
    from(User).filter(u => u.id.in(list))
```

### LIKE

`like`方法对应SQL的`LIKE`运算符，右侧兼容`Expr`、值、子查询：

```scala
val query =
    from(User).filter(u => u.name.like("%小%"))
```

`contains`是`like`的简易版本，无需手动填写`%`通配符，但右侧只兼容`String`：

```scala
val query =
    from(User).filter(u => u.name.contains("小"))
```

`startsWith`和`endsWith`与`contains`类似：

```scala
val query =
    from(User).filter(u => u.name.startsWith("小"))
```

### BETWEEN

`between`是带有两个参数的方法，对应三元表达式`BETWEEN`，参数兼容`Expr`、值、子查询：

```scala
val query =
    from(User).filter(u => u.id.between(1, 10))
```

## 逻辑运算

sqala支持二元逻辑运算`&&`（对应`AND`）和`||`（对应`OR`）：

```scala
val query =
    from(User).filter(u => u.id === 1 && u.name === "小黑")
```

通常`&&`的优先级比`||`高，我们可以通过`()`控制优先级：

```scala
val query =
    from(User).filter(u => u.id < 5 && (u.name === "小黑" || u.name === "小白"))
```

一元逻辑运算`!`对应SQL的`NOT`运算符：

```scala
val query =
    from(User).filter(u => !(u.name === "小黑"))
```

当`!`的右侧是`like`、`in`、`between`等运算符时，实际生成的是`NOT LIKE`、`NOT IN`、`NOT BETWEEN`等。

## 多列比较

sqala允许多列同时参与关系运算，使用`===`/`<>`比较对应的元组：

```scala
val q1 =
    from(User).filter: u =>
        (u.id, u.name) === (1, "小黑")

val q2 =
    from(User).filter: u =>
        (u.id, u.name).in(List((1, "小黑"), (2, "小白")))

val q3 =
    from(User).filter: u =>
        (u.id, u.name).in(from(User).map(uu => (uu.id, uu.name)))
```

类型兼容的表达式、值、子查询可以在比较时任意混合：

```scala
val q4 =
    from(User).filter: u =>
        (u.id, u.name) === (Option(1L), from(User).map(uu => uu.name).take(1))
```

在上面的例子中，`u.id`和`u.name`的类型是`Expr[...]`，`Option(1L)`的类型是`Option[Long]`，子查询的类型是`Query[...]`。sqala通过统一的`trait AsExpr`为这些类型提供了兼容性保证；而传统编程语言中的“方法重载”在此类场景下会导致组合数爆炸，无法实现这样符合直觉的调用形式。

## 数值运算

sqala支持以下数值运算符：

| 运算符名称 | 对应SQL运算符 |
|:---------:|:------------:|
| `+`       | `+`          |
| `-`       | `-`          |
| `*`       | `*`          |
| `/`       | `/`          |
| 一元`+`   | `+expr`      |
| 一元`-`   | `-expr`      |

`+`和`-`也支持一元用法：

```scala
val query =
    from(User).map(u => -u.id)
```

```scala
val query =
    from(User).filter(u => u.id + 1 > 5).map(_.id * 100)
```

sqala的数值运算同样具有极强的类型兼容性：比如对`Expr[Int]`和`Option[Double]`类型的两个表达式进行数值运算，实际会返回`Expr[Option[Double]]`类型的表达式。

sqala还支持`%`运算符，但实际生成的是SQL标准的`MOD`函数。

需要特别注意的是，由于各数据库对于除法操作的处理方式不同，为保证兼容性，sqala在生成SQL时会将`/`两侧的操作数都转换为`DECIMAL(38, 10)`，以保证除法结果是精确的小数，即生成`CAST(x AS DECIMAL(38, 10)) / CAST(y AS DECIMAL(38, 10))`。因此，如果字段本身是`Double`或`Float`，这个转换可能带来精度问题，建议尽量避免在这类字段上直接使用除法，优先使用`DECIMAL`（Scala中的`BigDecimal`）等精确数值类型。

## 字符串拼接

sqala支持数据库的字符串拼接运算，我们可以使用`++`拼接字符串，生成`||`运算符：

```scala
val query =
    from(User).map(u => u.name ++ "abc")
```

在MySQL等不支持`||`运算符的数据库中，该操作会生成`CONCAT`函数表达式。

## 条件表达式

`caseWhen`/`when`/`otherwise`等方法对应SQL的`CASE WHEN THEN ELSE END`表达式，参数同样兼容`Expr`、值、子查询：

```scala
val query =
    from(User).map(u => caseWhen(u.id === 1)(1).when(u.id === 2)(u.id).otherwise(Option.empty[Int]))
```

生成的SQL表达式为：

```sql
CASE WHEN "t1"."id" = 1 THEN 1 WHEN "t1"."id" = 2 THEN "t1"."id" ELSE CAST(NULL AS INTEGER) END
```

sqala对返回值类型的推导能力极强，关系运算部分曾定义过一个极端的例子：

```scala
case class Entity(x: Array[Option[Array[Int]]], y: Option[Array[Array[Option[Int]]]])
```

如果把这两个字段分别放入条件表达式的两个分支：

```scala
val query =
    from(Entity)
        .map(e => caseWhen(e.x === e.y)(e.x).otherwise(e.y))
```

查询后，返回类型会被自动推导为：

```scala
// 返回类型为 List[Option[Array[Option[Array[Option[Int]]]]]]
val result = db.fetch(query)
```

`coalesce`对应SQL的`COALESCE`表达式，用于返回参数中第一个非空值：

```scala
val query =
    from(User).map(u => coalesce(u.id, 1))
```

sqala也支持`ifNull`作为`coalesce`的别名：

```scala
val query =
    from(User).map(u => ifNull(u.id, 1))
```

此外，`COALESCE`是一个极高频的操作，sqala也提供了符合Scala标准库习惯的`getOrElse`方法，自动映射到`COALESCE`：

```scala
val query =
    from(User).map(u => u.id.getOrElse(1))
```

`nullIf`对应SQL的`NULLIF`表达式，用于比较两个值，如果相同则返回`NULL`：

```scala
val query =
    from(User).map(u => nullIf(u.id, 1))
```

## 函数

由于各个数据库函数差异极大，sqala只内置了ISO/IEC 9075标准中定义的SQL函数。虽然这些函数是标准函数，但仍需查阅您实际使用的数据库文档，确认其是否支持这些函数；函数的具体作用也请参考数据库相关文档。不在此标准函数列表中的，您可以使用sqala提供的[自定义表达式](./expr-custom.md)功能自行创建。

函数使用示例：

```scala
val query =
    from(User).map(u => substring(u.name, 1))
```

sqala内置支持的函数如下（此处未列举聚合函数、窗口函数、时间操作函数、JSON函数等）：

|     函数           |      对应的SQL函数      |
|:-----------------:|:-----------------------:|
|`substring(a, b)`  |`SUBSTRING(a FROM b)`    |
|`substring(a, b, c)`|`SUBSTRING(a FROM b FOR c)`|
|`upper(a)`        |`UPPER(a)`                |
|`lower(a)`        |`LOWER(a)`                |
|`lpad(a, b)`      |`LPAD(a, b)`              |
|`lpad(a, b, c)`   |`LPAD(a, b, c)`           |
|`rpad(a, b)`      |`RPAD(a, b)`              |
|`rpad(a, b, c)`   |`RPAD(a, b, c)`           |
|`btrim(a)`        |`BTRIM(a)`                |
|`btrim(a, b)`     |`BTRIM(a, b)`             |
|`ltrim(a)`        |`LTRIM(a)`                |
|`ltrim(a, b)`     |`LTRIM(a, b)`             |
|`rtrim(a)`        |`RTRIM(a)`                |
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

对于字符串表达式，sqala还提供了符合Scala习惯的扩展方法：`toUpperCase`、`toLowerCase`、`trim`（无参，对应`TRIM(a)`）和`length`（对应`CHAR_LENGTH(a)`）。它们与`upper`/`lower`等标准函数生成相同的SQL，可按喜好选用：

```scala
val query =
    from(User).map(u => u.name.toUpperCase)
```

## 类型转换

`as`方法配合类型参数进行类型转换，对应SQL的`CAST`表达式：

```scala
val query =
    from(User).map(u => u.id.as[String])
```
