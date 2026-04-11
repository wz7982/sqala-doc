# 表达式

sqala包含了一个SQL表达式类型`Expr`，其包装了一个SQL的AST，为sqala带来了强大的抽象能力。下面我们将来介绍一些常用的sqala表达式。

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

sqala的可空值使用`Option`来管理，但由于`None`没有实际的类型，会破坏sqala的类型安全性，所以sqala不支持`None`，而空值需要使用`Option.empty[T]`来构建：

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

sqala支持以下的符号关系运算符：

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

但由于Scala的限制，`==`和`!=`左侧如果不是`Expr`类型，则会产生编译错误，所以sqala提供了`===`和`<>`应对此类情况（其他运算符不受此影响）：

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

`in`方法对应SQL的`IN`运算符，sqala支持两种`in`模式，第一种是使用`Seq`、`List`等传入一个值的集合，这是最常见的用法：

```scala
val q = query:
    from(User).filter(u => u.id.in(List(1, 2, 3)))
```

**由于SQL中`IN ()`通常是语法错误，因此sqala会在空集合时开启优化，将此段表达式优化成`FALSE`**。

`in`方法也可以传入一个表达式元组，此元组同时兼容`Expr`、值、子查询：

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

通常来说`&&`的优先级比`||`高，我们可以通过`()`控制优先级：

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

sqala支持数据库的字符串拼接运算，我们可以使用`+`来拼接字符串，sqala会自动识别两侧的表达式类型，如果是数值则生成`+`运算符，如果是字符串则生成`||`运算符：

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

由于各个数据库函数差异极大，因此sqala只内置了ISO/IEC 9075标准中定义的SQL函数，虽然这些函数是标准函数，但仍要参考您实际使用的数据库文档是否支持这些函数，这些函数的作用也请参考数据库相关文档，不在此标准函数列表中的，您可以使用sqala提供的[自定义表达式](./expr-custom.md)功能自行创建。

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