# 基础查询

在配置好元数据和数据库连接上下文后，我们可以开始介绍查询构建了，sqala使用了类似Scala集合库风格的DSL来创建查询，力求降低学习成本。

sqala的查询功能需要导入`import sqala.static.dsl.*`，下文中不再重复说明。

**推荐将查询构建代码使用单独文件存放，因为sqala为SQL构造扩展了很多运算符、函数等，其可能与您使用的其他库的扩展方法冲突**。

以下所有`sqala`提供的查询功能，都是**无副作用的**，也就是说，每一个操作都不会改变之前的查询对象，而是会返回一个新的查询对象，避免复杂查询构建时产生不符合预期的情况。

如无特殊说明，以下示例中生成的SQL均以PostgreSQL为例（因为此数据库支持的SQL标准功能最全面）。

## 构建查询

sqala的查询构建需要一个上下文，用于自动管理表别名（您无需手动处理繁琐的别名管理），以及隔离sqala提供的运算符、函数等功能的作用域，避免抽象泄露。

`query`方法提供了这个查询构建上下文，因此sqala的所有查询构建操作都可以在`query`上下文中完成。

`from`方法用于创建一个基础的`SELECT`查询，我们可以将实体类的**伴生对象**传入其中：

```scala
val q = query:
    from(User)
```

sqala会自动生成表别名和列别名，避免冲突，并自动为标识符添加对应数据库的引号，避免字段名等信息与数据库关键字冲突等恼人的情况。并且，sqala会自动格式化生成的查询语句，方便调试。

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
```

在`db.fetch`之后会自动返回`List[User]`类型的结果。

## 过滤

`filter`/`where`方法用于过滤数据，其对应到SQL的`WHERE`子句，您可以像使用集合库一样使用sqala的过滤方法：

```scala
val id = 4

val q = query:
    from(User).filter(u => u.id > id)
```

其生成的SQL语句为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
WHERE
    "t1"."id" > ?
```

sqala会自动将值参数处理成JDBC预编译占位符，避免SQL注入。

`filter`/`where`方法不会改变查询的返回类型。

多次调用`filter`/`where`方法将会使用`AND`连接各个条件：

```scala
val id = 4

val q = query:
    from(User).filter(u => u.id > id).filter(u => u.name.startsWith("小"))
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
WHERE
    "t1"."id" > ? AND "t1"."name" LIKE ?
```

当然，上面的例子也可以直接使用`&&`运算符（更多运算符和表达式请参考[表达式](./expr.md)部分）：

```scala
val id = 4

val q = query:
    from(User).filter(u => u.id > id && u.name.startsWith("小"))
```

`filterIf`/`whereIf`方法用于条件拼接，只有第一个参数为`true`时才会拼接此条件，此方法方便您处理动态查询条件：

```scala
val name: Option[String] = None

val q = query:
    from(User).filterIf(name.isDefined)(u => u.name == name)
```

由于sqala使用内置SQL语法树来管理SQL语句，所以您无需像某些查询库那样手动拼接`WHERE TRUE`或`WHERE 1 = 1`，sqala总是会为您生成语法正确的SQL。

## 排序

`sortBy`/`orderBy`方法用于过滤数据，其对应到SQL的`ORDER BY`子句。

[表达式](./expr.md)配合排序规则作为`sortBy`/`orderBy`的参数，如无显式指定排序规则，sqala会将其处理成`ASC`：

```scala
val q = query:
    from(User).sortBy(u => (u.name, u.id.desc))
```

生成的SQL如下：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
ORDER BY
    "t1"."name" ASC,
    "t1"."id" DESC
```

`sortBy`/`orderBy`方法不会改变查询的返回类型。

多个`sortBy`/`orderBy`方法调用会依次拼接，因此以上写法等价于：

```scala
val q = query:
    from(User).sortBy(u => u.name).sortBy(u => u.id.desc)
```

sqala支持的排序规则有：

| 排序规则        | 对应SQL          |
|:--------------:|:----------------:|
|`asc`           |`ASC`             |
|`ascNullsFirst` |`ASC NULLS FIRST` |
|`ascNullsLast`  |`ASC NULLS LAST`  |
|`desc`          |`DESC`            |
|`descNullsFirst`|`DESC NULLS FIRST`|
|`descNullsLast` |`DESC NULLS LAST` |

对于MySQL数据库这样不支持`ASC NULLS LAST`语义的数据库方言，sqala会生成这样的SQL：

```sql
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`name` AS `c2`
FROM
    `user` AS `t1`
ORDER BY
    `t1`.`name` ASC,
    CASE WHEN `t1`.`id` IS NULL THEN 1 ELSE 0 END ASC,
    `t1`.`id` ASC
```

`sortByIf`/`orderByIf`用于处理条件拼接排序规则，使用方式类似`filterIf`/`whereIf`，此处不赘述。

## 投影

`map`/`select`方法用于指定投影列表，其对应到SQL的`SELECT`子句，sqala允许投影到[表达式](./expr.md)，和其组成的元组或命名元组，并能够正确推导包括复杂投影和表连接在内的返回类型。您只需专注于业务逻辑的实现即可。

### 投影到表达式

```scala
val q = query:
    from(User).map(u => u.name)
```

生成的SQL为：

```sql
SELECT
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
```

此处返回类型会自动推导为`List[String]`。

sqala允许像数据库一样，可空类型和非空类型混合运算，数值类型混合运算等，因此以下写法：

```scala
val q = query:
    from(User).map(u => u.id + Option.empty[Long])
```

生成的SQL为：

```sql
SELECT
    "t1"."id" + CAST(NULL AS BIGINT) AS "c1"
FROM
    "user" AS "t1"
```

返回类型会自动推导为`List[Option[Long]]`，在自动推导出安全类型的同时，您也无需关心`Option`类型和非空类型繁琐的互操作问题。

### 投影到元组

```scala
val q = query:
    from(User).map(u => (u.id, u.name))
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1"
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
```

此处返回类型会自动推导为`List[(Int, String)]`。

### 投影到命名元组

命名元组是Scala 3.7版本新特性，sqala充分利用了该特性，在较复杂的场景下（比如关联结果和只需要部分字段的情况），您可以直接使用命名元组管理投影，而无需预先创建数据接收DTO，避免大量的样板代码，并可以直接使用字段名来类型安全地引用返回字段，良好的字段命名也可以充当代码中的自解释文档：

```scala
val q = query:
    from(User).map(u => (name = u.name))
```

此处返回类型会自动推导为`List[(name: String)]`，我们可以直接使用字段名处理结果：

```scala
val result = db.fetch(q)

for r <- result do
    println(r.name)
```

## 使用for推导式

sqala支持将只使用了`filter`和`map`操作的简单查询写成`for`推导式，您只需要绑定一次查询参数名，以提高可读性：

```scala
val q = query:
    from(User).filter(u => u.id > 1).map(u => u.name)
```

可以简写成：

```scala
val q = query:
    for u <- from(User) if u.id > 1 yield u.name
```

## 限制结果集

`take`/`limit`和`drop`/`offset`对应SQL的`LIMIT`、`OFFSET`等操作，并自动进行了方言适配。

由于`MySQL`不允许单独使用`OFFSET`子句，因此在单独调用`drop`/`offset`时，`LIMIT`值为`Long.MaxValue`。

```scala
val q = query:
    from(User).drop(2).take(3)
```

此操作不同方言下差异较大，因此我们不单独使用PostgreSQL为例，而是列出各种方言生成情况。

::: code-group

```sql [PostgreSQL]
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" AS "t1"
LIMIT ? OFFSET ?
```

```sql [MySQL]
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`name` AS `c2`
FROM
    `user` AS `t1`
LIMIT ?, ?
```

```sql [Oracle]
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" "t1"
OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
```

:::

除了简单的`take`外，sqala支持SQL标准的`FETCH`子句，其方法转换规则和经实测的各数据库支持程度如下：

|方法名     |SQL语句                |MySQL |PostgreSQL|Oracle|H2|
|:---------:|:--------------------:|:------:|:------:|:------:|:------:|
|`takeWithTies`|`FETCH NEXT n ROWS WITH TIES`|❌|✅     |✅      |✅ |
|`takePercent`|`FETCH NEXT n PERCENT ROWS ONLY`|❌|❌  |✅      |✅ |
|`takePercentWithTies`|`FETCH NEXT n PERCENT ROWS WITH TIES`|❌|❌  |✅ |✅ |

## 去重

`mapDistinct`/`selectDistinct`用于统计去重后的结果集，由于sqala需要在需要`ALL`、`DISTINCT`等量词的情况下统一风格，因此没有采用类似Scala集合库的`.map.distinct`调用形式：

```scala
val q = query:
    from(User).mapDistinct(u => u.name)
```

生成的SQL为：

```sql
SELECT DISTINCT
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
```

## 使用内存集合创建查询

sqala支持使用内存中的集合创建查询，后续作为子查询、和连接表使用：

```scala
val users = List(User(1, "小黑"), User(2, "小白"))

val q = query:
    from(users)
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    (
        VALUES (?, ?), (?, ?)
    ) AS "t1"("id", "name")
```

**请注意你使用的数据库版本是否支持`VALUES`查询功能**。

## 查询锁

sqala支持`forUpdate`、`forUpdateNoWait`、`forUpdateSkipLocked`、`forShare`、`forShareNoWait`、`forShareSkipLocked`等方法给查询加锁，对应数据库的相应加锁子句，但某些数据库可能未支持此操作，请确认后使用：

```scala
val q = query:
    from(users).forShareSkipLocked
```

<!-- 在配置好元数据之后，我们就可以开始构建查询了，sqala使用类似Scala集合库风格的api创建查询。

## 表连接

sqala支持`join`、`leftJoin`、`rightJoin`方法连接表，`on`添加连接条件：

```scala
val q = query:
    from[Employee]
        .join[Department]
        .on((e, d) => e.departmentId == d.id)
```

查询返回的类型为：

![返回类型](../../images/join-result1.png)

sqala会从连接路径中计算返回类型，比如我们有：

```scala
case class A(id: Int)
case class B(id: Int)
case class C(id: Int)

val q = query:
    from[A]
        .rightJoin[B].on((a, b) => a.id == b.id)
        .leftJoin[C].on((a, b, c) => a.id == c.id)
```

那么，此查询的返回类型为：

![返回类型](../../images/join-result2.png)

这是由于外连接会产生额外的空值，sqala会将可能为空的类型自动添加`Option`。

## 自连接

sqala可以很方便地处理一个表连接自身的情况，比如我们的`Department`表记录了`managerId`字段，即上级的id，我们可以使用自连接查询这样的数据：

```scala
val q = query:
    from[Department]
        .join[Department]((d1, d2) => d1.managerId == d2.id)
```

但是对于这样数据表存储树形数据的情况，更方便的做法是使用sqala提供的`递归查询`功能。

## 排序

在投影后，我们可以使用`sortBy`（或`orderBy`）方法进行排序，参数是表达式的排序规则或其组成的元组，多个`sortBy`（或`orderBy`）会依次拼接：

```scala
val q = query:
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

`sortByIf`（或`orderByIf`）方法用于条件拼接：

```scala
val q = query:
    from[Department]
        .sortByIf(true)(d => (d.id, d.name.desc))
        .sortByIf(true)(d => d.managerId.asc)
```

## 分组

`groupBy`方法对应SQL的`GROUP BY`子句：

```scala
val q = query:
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
val q = query:
    from[Employee]
        .groupBy(e => e.departmentId)
        .map(e => (e.departmentId, anyValue(e.id)))
```

### 分组的限制

由于sqala将值表达式生成为JDBC预编译占位符`?`，在类似如下查询中：

```scala
val q = query:
    from[Department]
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
val q = query:
    val subquery =
        from[Department]
            .map(d => (x = d.id + 1))

    from(subquery).groupBy(q => q.x).map(q => (q.x, count()))
```

## 多维分组

除了普通分组外，sqala还支持`groupByCube`、`groupByRollup`、`groupBySets`多维分组，前两者使用方法与`groupBy`类似：

```scala
val q = query:
    from[Employee]
        .groupByCube(e => (e.departmentId, e.name))
        .map(e => (e.departmentId, e.name, count()))
```

或：

```scala
val q = query:
    from[Employee]
        .groupByRollup(e => (e.departmentId, e.name))
        .map(e => (e.departmentId, e.name, count()))
```

另外，`grouping`聚合函数可以配合多维分组使用（Sqlite等数据库不支持此函数）：

```scala
val q = query:
    from[Employee]
        .groupByCube(e => (e.departmentId, e.name))
        .map: e =>
            (grouping(e.departmentId), e.departmentId, grouping(e.name), e.name, count())
```

`groupBySets`参数是基础分组组成的分组集（空分组集使用Unit类型表示）：

```scala
val q = query:
    from[Employee]
        .groupBySets(e => ((e.departmentId, e.name), e.name, ()))
        .map(e => (e.departmentId, e.name, count()))
```

## 去重

使用`distinct`方法来对结果集进行去重：

```scala
val q = query:
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
val q1 = query:
    from[A].filter: a =>
        a.x.in(from[B].map(b => b.x))

val q2 = query:
    from[A].filter: a =>
        a.x == any(from[B].map(b => b.x))

val q3 = query:
    from[A].filter: a =>
        a.x != all(from[B].map(b => b.x))

val q4 = query:
    from[A].filter: a =>
        exists(from[B].filter(b => b.x > 0))
```

以上类型的子查询除了`exists`外，均需要投影到与外侧表达式类型相符。

表达式子查询也可以直接使用运算符：

```scala
val q1 = query:
    from[A].filter: a =>
        a.x == from[B].map(b => b.x).take(1)

val q2 = query:
    from[A].filter: a =>
        a.x > from[B].map(b => sum(b.x))
```

### 表子查询

sqala支持将子查询放入表连接中，使用表子查询的前提是子查询**投影到了命名元组**，此时我们可以使用`.`来调用子查询的字段：

```scala
val q = query:
    val subquery = from[B].map(b => (x = b.x, y = b.y))

    from[A].leftJoin(subquery).on((a, q) => a.x == q.x)
```

`joinLateral`和`leftJoinLateral`子查询支持使用外侧表的字段：

```scala
val q = query:
    from[A].leftJoinLateral(a =>
        from[B].filter(b => a.z > b.z).map(b => (x = b.x, y = b.y))
    ).on((a, q) => a.x == q.x)
```

**这是使用数据库的LATERAL功能实现的，使用时请注意数据库版本是否支持此功能。**

`from`方法支持将一个返回**命名元组**的查询嵌套为子查询：

```scala
val q = from(from[A].map(a => (x = a.x, y = a.y)))
```

此方法可以将`UNION`等查询转变为子查询，从而使用`SELECT`语句独有的过滤、分组等功能。

### 标量子查询

子查询可以使用`map`放到投影结果中，前提是：

    1. 子查询至多返回一行数据；
    2. 子查询仅返回一列数据，需要使用`map`投影到单个字段。

符合以上规则的子查询可以放入`map`列表中：

```scala
val q = query:
    val scalarQuery = from[B].map(b => sum(b.x))
    from[A].map(a => (a.x, scalarQuery))
```

## 集合操作

sqala支持使用`union`、`unionAll`、`intersect`、`intersectAll`、`except`、`exceptAll`等方法来处理集合查询，比如：

```scala
val q = query:
    val q1 = from[Department]
        .filter(d => d.id == 1)
        .map(d => (id = d.id, name = d.name))

    val q2 = from[Department]
        .filter(d => d.id == 2)
        .map(d => (id = d.id, name = d.name))

    q1 unionAll q2
```

处于集合操作两侧的查询：

    其返回类型必须列数量一致，且类型一一对应，假如有两个查询，分别返回：
        
    (Option[Int], String, Option[LocalDate])

    和：

    (Int, Option[String], LocalDate)

    ，这样的两个查询调用集合操作将会返回：

    (Option[Int], Option[String], Option[LocalDate])
    。

除了第一个查询需要投影到命名元组外，后续的查询可以投影到元组，将这个查询用于子查询时，或接收数据库返回的结果时，字段名以第一个查询为准：

```scala
// 作为子查询时字段为id和name
val q = query:
    val q1 = from[Department].map(d => (id = d.id, name = d.name))
    val q2 = from[Department].map(d => (d.id, d.name))

    q1 union q2
```

## 从内存集合创建查询

使用`from`方法从内存中的集合创建查询，此查询可以使用投影过滤等操作，并可以与其他查询进行`join`或`union`等操作：

```scala
case class Entity(id: Int, name: String)

val list = List(Entity(1, "小黑"), Entity(2, "小白"))

val q = query: 
    from(list).filter(e => e.id > 0)
```

**此功能使用数据库的`VALUES`语句实现，使用时请注意当前数据库版本是否支持此语法。**

## 递归查询

`department`表存储树形数据，如果我们想在`department`表查询一整个部门树，通常来说可能需要发出多次查询，但sqala借鉴了Oracle方言的`CONNECT BY`功能，使用`connectBy`方法创建递归查询，无需发出多次查询浪费数据库性能，在生成SQL时会将其转换为SQL标准的`CTE(Common Table Expression)`查询，而无需数据库本身支持`CONNECT BY`：

```scala
val q = query:
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name))
```

`connectBy`用于创建递归连接条件，其中的`prior`用于引用递归查询列，具体规则请参考Oracle文档。

`startWith`用于创建递归起始条件。

`sortSiblingsBy`方法用于指定**每层**的排序规则，而`sortBy`用于指定总的排序规则：

```scala
val q = query:
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .sortSiblingsBy(d => d.name)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name))
```

`maxDepth`用于指定最大的递归层数：

```scala
val q = query:
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .sortSiblingsBy(d => d.name)
        .maxDepth(5)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name))
```

查询结果和排序中可以使用`level()`伪列，用于统计层级，计数从1开始：

```scala
val q = query:
    from[Department]
        .connectBy(d => prior(d.id) == d.managerId)
        .startWith(d => d.managerId == 0)
        .sortSiblingsBy(d => d.name)
        .maxDepth(5)
        .map(d => (id = d.id, managerId = d.managerId, name = d.name, level = level()))
```

## 查询锁

sqala支持`forUpdate`、`forUpdateNoWait`、`forUpdateSkipLocked`、`forShare`、`forShareNoWait`、`forShareSkipLocked`等方法给查询加锁，对应数据库的相应加锁子句，但某些数据库可能未支持此操作，请确认后使用：

```scala
val q = query:
    from[Department].forShareSkipLocked
``` -->