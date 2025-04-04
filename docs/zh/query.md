# 查询

在配置好元数据之后，我们就可以开始构建查询了，sqala使用类似Scala集合库风格的api创建查询。

以下用法均需要导入：

```scala
import sqala.static.dsl.*
```

以下示例中生成的查询均以MySQL方言为例，实际使用时sqala会根据方言配置生成合适的SQL。

## 构建查询

`from`方法用于构建查询，类型参数是实体类类型：

```scala
val q =
    from[Department]
```

生成的SQL为：

```sql
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`manager_id` AS `c2`,
    `t1`.`name` AS `c3`
FROM
    `department` AS `t1`
```

此查询的返回类型为：

![返回类型](../../images/query-result.png)

## 过滤

`filter`（或`where`）方法对应到SQL的`WHERE`子句，参数是一个`T => Expr[Boolean]`类型的函数，描述`WHERE`条件：

```scala
val id = 1

val q =
    from[Department].filter(d => d.id == id)
```

生成的SQL为：

```sql
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`manager_id` AS `c2`,
    `t1`.`name` AS `c3`
FROM
    `department` AS `t1`
WHERE
    `t1`.`id` = 1
```

**多次调用`filter`时将会使用AND来连接查询条件。**

sqala提供了`filterIf`（或`whereIf`）方法用于动态拼接条件，会在第一个参数值为`true`时使用`AND`将条件拼接到查询中：

```scala
val id = 1
val name = "IT"

val q =
    from[Department]
        .filterIf(id > 0)(_.id == id)
        .filterIf(name.nonEmpty)(_.name == name)
```

## 投影

`map`（或`select`）方法用于手动指定`SELECT`投影列表，sqala允许投影到表达式、表、和它们组成的元组或命名元组。

### 投影到表达式

```scala
val q =
    from[Department].map(d => d.id)
```

生成的SQL为：

```sql
SELECT
    `t1`.`id` AS `c1`
FROM
    `department` AS `t1`
```

查询的返回类型为：

![返回类型](../../images/map-expr.png)

### 投影到表

```scala
val q =
    from[Department].map(d => d)
```

生成的SQL为：

```sql
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`manager_id` AS `c2`,
    `t1`.`name` AS `c3`
FROM
    `department` AS `t1`
```

查询的返回类型为：

![返回类型](../../images/map-table.png)

### 投影到元组

```scala
val q =
    from[Department].map(d => (d.id, d.name))
```

生成的SQL为：

```sql
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`name` AS `c2`
FROM
    `department` AS `t1`
```

查询的返回类型为：

![返回类型](../../images/map-tuple.png)

### 投影到命名元组

命名元组（NamedTuple）是Scala 3.6版本后新增功能，但目前（截止到Scala 3.6.2），我们仍需要导入：

```scala
import scala.language.experimental.namedTuples
```

才能正常使用，命名元组预计在Scala 3.7版本转为标准特性，届时将无需导入即可使用。

利用命名元组，我们可以给投影的字段起名，并在查询后直接使用`.`来调用字段，无需对投影中间结果预先定义实体类接收：

```scala
val q =
    from[Department].map(d => (id = d.id, name = d.name))
```

![返回类型](../../images/map-namedtuple.png)

## 使用for推导式

sqala支持将只使用了`filter`和`map`的简单查询转变为`for`推导式，提高可读性：

```scala
val q =
    from[Department]
        .filter(d => d.id == 1)
        .map(d => d.name)
```

可以简写为：

```scala
val q =
    for d <- from[Department]
        if d.id == 1
    yield d.name
```

## 限制结果

`take`（或`limit`）和`drop`（或`offset`）方法对应SQL的`LIMIT`和`OFFSET`等功能，并且会在生成查询时根据方言选取合适的策略。

如果只调用其一方法，那么`LIMIT`的默认值是`Long.MaxValue`，`OFFSET`的默认值是`0`。

```scala
val q =
    from[Department].drop(100).take(10)
```

## 表连接

sqala支持`join`、`leftJoin`、`rightJoin`方法连接表，`on`添加连接条件：

```scala
val q =
    from[Employee]
        .join[Department]
        .on((e, d) => e.departmentId == d.id)
```

查询返回的类型为：

![返回类型](../../images/join-result1.png)

如果将上文中的`join`改为`leftJoin`，则返回类型为：

![返回类型](../../images/join-result2.png)

sqala会从连接路径中计算返回类型，比如我们有：

```scala
case class A(id: Int)
case class B(id: Int)
case class C(id: Int)

val q =
    from[A]
        .rightJoin[B]((a, b) => a.id == b.id)
        .leftJoin[C]((a, b, c) => a.id == c.id)
```

那么，此查询的返回类型为：

![返回类型](../../images/join-result3.png)

这是由于外连接会产生额外的空值，sqala会将可能为空的类型自动添加`Option`。

## 自连接

sqala可以很方便地处理一个表连接自身的情况，比如我们的`Department`表记录了`managerId`字段，即上级的id，我们可以使用自连接查询这样的数据：

```scala
val q =
    from[Department]
        .join[Department]((d1, d2) => d1.managerId == d2.id)
```

但是对于这样数据表存储树形数据的情况，更方便的做法是使用sqala提供的`递归查询`功能。

## 排序

在投影后，我们可以使用`sortBy`（或`orderBy`）方法进行排序，参数是表达式的排序规则或其组成的元组，多个`sortBy`（或`orderBy`）会依次拼接：

```scala
val q =
    from[Department]
        .sortBy(d => (d.id, d.name.desc))
        .sortBy(d => d.managerId.asc)
```

生成的SQL为：

```sql
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`manager_id` AS `c2`,
    `t1`.`name` AS `c3`
FROM
    `department` AS `tt1`
ORDER BY
    `t1`.`id` ASC,
    `t1`.`name` DESC,
    `t1`.`manager_id` ASC
```

支持的排序规则有：

|        排序规则     |
|:------------------:|
|`asc`               |
|`desc`              |
|`ascNullsFirst`     |
|`ascNullsLast`      |
|`descNullsFirst`    |
|`descNullsLast`     |

如果直接使用表达式，而不显式写出排序规则，sqala会使用`ASC`填充。

在生成MySQL等数据库方言时，会特殊处理含有`NULLS`的排序规则，不会生成错误的SQL。

## 分组

`groupBy`方法对应SQL的`GROUP BY`子句：

```scala
val q =
    from[Employee]
        .groupBy(e => e.departmentId)
        .map(e => (e.departmentId, count()))
```

生成的SQL为：

```sql
SELECT
    `t1`.`department_id` AS `c1`,
    COUNT(*) AS `c2`
FROM
    `employee` AS `t1`
```

如果得到未分组字段的任意值即可满足需求，可以使用`anyValue`聚合函数：

```scala
val q =
    from[Employee]
        .groupBy(e => e.departmentId)
        .map(e => (e.departmentId, anyValue(e.id)))
```

### 分组的限制

由于sqala将值表达式生成为JDBC预编译占位符`?`，在类似如下查询中：

```scala
val q = from[Department]
    .groupBy(d => d.id + 1)
    .map(d => (d.id + 1, count()))
```

会生成类似下面的SQL：

```sql
SELECT
    "t1"."id" + ? AS "c1",
    COUNT(*) AS "c2"
FROM
    "department" AS "t1"
GROUP BY
    "t1"."id" + ?
```

在使用PostgreSQL数据库时，由于驱动校验比较严格，数据库无法确定两个`?`是同一个表达式，此查询会在运行时报错。

我们可以在数据库连接中添加`?preferQueryMode=simple`来禁用预编译，或是将查询改为子查询形式：

```scala
val q = queryContext:
    val subquery =
        from[Department]
            .map(d => (x = d.id + 1))

    fromQuery(subquery).groupBy(q => q.x).map(q => (q.x, count()))
```

## 多维分组

除了普通分组外，sqala还支持`groupByCube`、`groupByRollup`、`groupBySets`多维分组，前两者使用方法与`groupBy`类似：

```scala
val q =
    from[Employee]
        .groupByCube(e => (e.departmentId, e.name))
        .map(e => (e.departmentId, e.name, count()))
```

或：

```scala
val q =
    from[Employee]
        .groupByRollup(e => (e.departmentId, e.name))
        .map(e => (e.departmentId, e.name, count()))
```

另外，`grouping`聚合函数可以配合多维分组使用（Sqlite等数据库不支持此函数）：

```scala
val q =
    from[Employee]
        .groupByCube(e => (e.departmentId, e.name))
        .map: e =>
            (grouping(e.departmentId), e.departmentId, grouping(e.name), e.name, count())
```

`groupBySets`参数是基础分组组成的分组集（空分组集使用Unit类型表示）：

```scala
val q =
    from[Employee]
        .groupBySets(e => ((e.departmentId, e.name), e.name, ()))
        .map(e => (e.departmentId, e.name, count()))
```

## 去重

使用`distinct`方法来对结果集进行去重：

```scala
val q =
    from[Department].map(d => d.name).distinct
```

## 子查询

数据库通常支持三种子查询：

    1. `WHERE`和`ON`等子句中的表达式子查询；
    2. `FROM`和`JOIN`中的表子查询；
    3. `SELECT`等子句中的标量子查询。

sqala对以上子查询均进行了支持。

### 表达式子查询

表达式中含有的子查询通常配合`IN`、`ANY`、`ALL`、`EXISTS`等操作使用：

```scala
val q1 =
    from[A].filter: a =>
        a.x.in(from[B].map(b => b.x))

val q2 =
    from[A].filter: a =>
        a.x == any(from[B].map(b => b.x))

val q3 =
    from[A].filter: a =>
        a.x != all(from[B].map(b => b.x))

val q4 =
    from[A].filter: a =>
        exists(from[B].filter(b => b.x > 0))
```

以上类型的子查询除了`exists`外，均需要投影到与外侧表达式类型相符。

表达式子查询也可以不使用以上操作，直接使用运算符：

```scala
val q1 =
    from[A].filter: a =>
        a.x == from[B].map(b => b.x).take(1)

val q2 =
    from[A].filter: a =>
        a.x > from[B].map(b => sum(b.x))
```

### 表子查询

sqala支持将子查询放入表连接中，使用表子查询的前提是子查询**投影到了命名元组**，此时我们可以使用`.`来调用子查询的字段：

```scala
val q =
    val subquery = from[B].map(b => (x = b.x, y = b.y))

    from[A].leftJoinQuery(subquery).on((a, q) => a.x == q.x)
```

`joinLateral`和`leftJoinLateral`子查询支持使用外侧表的字段：

```scala
val q =
    from[A].leftJoinLateral(a =>
        from[B].filter(b => a.z > b.z).map(b => (x = b.x, y = b.y))
    ).on((a, q) => a.x == q.x)
```

**这是使用数据库的LATERAL功能实现的，使用时请注意数据库版本是否支持此功能。**

`fromQuery`方法支持将一个返回**命名元组**的查询嵌套为子查询：

```scala
val q = fromQuery(from[A].map(a => (x = a.x, y = a.y)))
```

此方法可以将`UNION`等查询转变为子查询，从而使用`SELECT`语句独有的过滤、分组等功能。

### 标量子查询

子查询可以使用`map`放到投影结果中，前提是：

    1. 子查询至多返回一行数据；
    2. 子查询仅返回一列数据，需要使用`map`投影到单个字段。

符合以上规则的子查询可以放入`map`列表中：

```scala
val q =
    val scalarQuery = from[B].map(b => sum(b.x))
    from[A].map(a => (a.x, scalarQuery))
```

## 集合操作

sqala支持使用`union`、`unionAll`、`intersect`、`intersectAll`、`except`、`exceptAll`等方法来处理集合查询，比如：

```scala
val q =
    val q1 = from[Department]
        .filter(d => d.id == 1)
        .map(d => (id = d.id, name = d.name))

    val q2 = from[Department]
        .filter(d => d.id == 2)
        .map(d => (id = d.id, name = d.name))

    q1 unionAll q2
```

由于`UNION ALL`与集合拼接语义一致，所以上面的`unionAll`可以简写成`++`：

```scala
q1 ++ q2
```

处于集合操作两侧的查询：

    1. 如果是单表查询，两个查询的所有字段类型必须相符，返回结果以第一个实体类类型为准

    2. 如果是投影查询，其返回类型必须列数量一致，且类型一一对应，假如有两个查询，分别返回：
        
    (Option[Int], String, Option[LocalDate])

    和：

    (Int, Option[String], LocalDate)

    ，这样的两个查询调用集合操作将会返回：

    (Option[Int], Option[String], Option[LocalDate])
    。

除了第一个查询需要投影到命名元组外，后续的查询可以投影到元组，将这个查询用于子查询时，或接收数据库返回的结果时，字段名以第一个查询为准：

```scala
// 作为子查询时字段为id和name
val q =
    val q1 = from[Department].map(d => (id = d.id, name = d.name))
    val q2 = from[Department].map(d => (d.id, d.name))

    q1 union q2
```

## 从内存集合创建查询

使用`fromValues`方法从内存中的集合创建查询，此查询可以使用投影过滤等操作，并可以与其他查询进行`join`或`union`等操作：

```scala
case class Entity(id: Int, name: String)

val list = List(Entity(1, "小黑"), Entity(2, "小白"))

val q = fromValues(list).filter(e => e.id > 0)
```

**此功能使用数据库的`VALUES`语句实现，使用时请注意当前数据库版本是否支持此语法。**

## 递归查询

`department`表存储树形数据，如果我们想在`department`表查询一整个部门树，通常来说可能需要发出多次查询，但sqala借鉴了Oracle方言的`CONNECT BY`功能，使用`connectBy`方法创建递归查询，无需发出多次查询浪费数据库性能，在生成SQL时会将其转换为SQL标准的`CTE(Common Table Expression)`查询，而无需数据库本身支持`CONNECT BY`：

```scala
val q =
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name))
```

`connectBy`用于创建递归连接条件，其中的`prior`用于引用递归查询列，具体规则请参考Oracle文档。

`startWith`用于创建递归起始条件。

`sortSiblingsBy`方法用于指定**每层**的排序规则，而`sortBy`用于指定总的排序规则：

```scala
val q =
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .sortSiblingsBy(d => d.name)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name))
```

`maxDepth`用于指定最大的递归层数：

```scala
val q =
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .sortSiblingsBy(d => d.name)
        .maxDepth(5)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name))
```

查询结果和排序中可以使用`level()`伪列，用于统计层级，计数从1开始：

```scala
val q =
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .sortSiblingsBy(d => d.name)
        .maxDepth(5)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name, level = level()))
```

## 透视表

在数据分析场景中，行转列透视表通常使用聚合函数配合`CASE WHEN`表达式构建，sqala也自然支持此类写法：

```scala
case class City(population: Int, year: Int, country: String)

val q =
    from[City]
        .map: c =>
            (
                total_2000 = sum(`if` c.year == 2000 `then` c.population `else` 0),
                total_2001 = sum(`if` c.year == 2001 `then` c.population `else` 0),
                count_2000 = count(`if` c.year == 2000 `then` Some(1) `else` None),
                count_2001 = count(`if` c.year == 2001 `then` Some(1) `else` None)
            )
```

但sqala也支持`pivot`这个更简洁的写法：

```scala
val q =
    from[City]
        .pivot(c => (total = sum(c.population), count = count(1)))
        .`for`: c =>
            (
                c.year.within(`2000` = 2000, `2001` = 2001)
            )
```

在`pivot`中指定若干个聚合函数，在`for`中使用`within`指定若干个投影列，sqala将会自动将其转换为`SUM(CASE WHEN ...)`形式的查询，无需数据库本身支持`PIVOT`子句；并将`pivot`和`for`中的命名元组字段名组合作为新的返回字段名，上面查询的返回类型为：

```scala
val result:
    List[
        (
            total_2000 : Option[Int],
            total_2001 : Option[Int],
            count_2000 : Long,
            count_2001 : Long
        )
    ] =
        db.fetch(q)
```

如果`for`中指定了其他表达式：

```scala
val q =
    from[City]
        .pivot(c => (total = sum(c.population), count = count(1)))
        .`for`: c =>
            (
                c.year.within(`2000` = 2000, `2001` = 2001),
                c.country.within(cn = "CN", us = "US")
            )
```

则返回类型为：

```scala
val result:
    List[
        (
            total_2000_cn : Option[Int],
            total_2000_us : Option[Int],
            total_2001_cn : Option[Int],
            total_2001_us : Option[Int],
            count_2000_cn : Long,
            count_2000_us : Long,
            count_2001_cn : Long,
            count_2001_us : Long
        )
    ] =
        db.fetch(q)
```

<!-- ## 语义分析

sqala支持在编译期进行静态查询的语义分析，并将大多数常见的SQL语义错误转化为编译期警告，将查询放入`analysisContext`中启用语义分析（**暂不支持`pivot`和`withRecursive`的语义分析**）：

```scala
val q = analysisContext:
    from[Department]
``` -->