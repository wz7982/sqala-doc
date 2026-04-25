# 查询

在配置好元数据和数据库连接上下文后，我们可以开始介绍查询构建了，sqala使用了类似Scala集合库风格的DSL来创建查询，力求降低学习成本。

sqala的查询功能需要导入`import sqala.static.dsl.*`，下文中不再重复说明。

以下所有`sqala`提供的查询功能，都是**无副作用的**，也就是说，每一个操作都不会改变之前的查询对象，而是会返回一个新的查询对象，避免复杂查询构建时产生不符合预期的情况。

如无特殊说明，示例中生成的SQL均以PostgreSQL为例（因为PostgreSQL数据库对SQL标准支持最全面）。

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

## 动态表名

在某些业务场景中，可能有一些结构相同，但只有表名不同的表，sqala支持在创建查询时使用`withName`方法更换表名：

```scala
val q = query:
    from(User.withName("user_1"))
```

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user_1" AS "t1"
```

`withName`不会影响返回结果类型。

## 排除列

在某些业务场景中，可能有一些表字段（通常是长文本类字段）经常不参与查询，但同时表字段较多，此时如果使用`.map`显式写出需要查询的字段，会比较繁琐，这种场景下可以使用`exclude`方法，来排除某些字段：

```scala
val q = query:
    from(Post.exclude[("title", "createTime")])
```

`exclude`的参数是类型参数，使用一个字面量类型元组传递排除的字段列表，如果只需要排除一个字段，则使用`Tuple1["columnName"]`形式。

生成的SQL为：

```sql
SELECT
    "t1"."id" AS "c1",
    "t1"."author_id" AS "c2",
    "t1"."channel_id" AS "c3",
    "t1"."view_count" AS "c4",
    "t1"."like_count" AS "c5",
    "t1"."state" AS "c6"
FROM
    "post" AS "t1"
```

可以看到，此时查询中不会出现排除的字段。

同时`exclude`方法会影响返回类型，sqala会从现有字段和排除字段中计算出一个命名元组类型，因此`exclude`操作也是类型安全的，而在`db.fetch`之后sqala推导出的返回类型为`List[(id: Int, authorId: Int, channelId: Int, viewCount: Int, likeCount: Int, state: DataState)]`

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
    "t1"."id" > 4
```

sqala会自动处理传入字符串，**避免SQL注入**。

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
    "t1"."id" > 4 AND "t1"."name" LIKE '小%'
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

### 语义检查

如果过滤条件中含有聚合函数或窗口函数等不能放在`WHERE`子句中的表达式，sqala会在此情况下返回编译错误：

```scala
val q = query:
    // 编译错误
    from(User).filter(u => u.id > count())
```

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

sqala充分利用了Scala 3.7版本的新特性命名元组，在较复杂的场景下（比如关联结果和只需要部分字段的情况），您可以直接使用命名元组管理投影，而无需预先创建数据接收DTO，避免大量的样板代码，并可以直接使用字段名来类型安全地引用返回字段，良好的字段命名也可以充当代码中的自解释文档：

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

### 语义检查

如果投影中同时含有列和聚合函数等不兼容的表达式，sqala将会返回编译错误：

```scala
val q = query:
    // 编译错误
    from(User).map(u => (name = u.name, count = count()))
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
LIMIT 3 OFFSET 2
```

```sql [MySQL]
SELECT
    `t1`.`id` AS `c1`,
    `t1`.`name` AS `c2`
FROM
    `user` AS `t1`
LIMIT 2, 3
```

```sql [Oracle]
SELECT
    "t1"."id" AS "c1",
    "t1"."name" AS "c2"
FROM
    "user" "t1"
OFFSET 2 ROWS FETCH NEXT 3 ROWS ONLY
```

:::

除了简单的`take`外，sqala支持SQL标准的`FETCH`子句，其方法转换规则和经实测的各数据库支持程度如下：

|方法名     |SQL语句                |MySQL |PostgreSQL|Oracle|H2|
|:---------:|:--------------------:|:------:|:------:|:------:|:------:|
|`takeWithTies`|`FETCH NEXT n ROWS WITH TIES`|❌|✅     |✅      |✅ |

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

### 投影后排序

我们可以在调用`map`投影后创建排序：

```scala
val q = query:
    from(User).map(u => u.name).sortBy(u => u.id.desc)
```

此时`sortBy`方法的Lambda参数仍然代表当前操作的表。

但如果是`mapDistinct`情况则有不同，由于SQL不允许在`SELECT DISTINCT`之后的`ORDER BY`中出现未在`SELECT`中出现的表达式，因此以下SQL是不合法的：

```sql
SELECT DISTINCT
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
ORDER BY
    "t1"."id" DESC
```

所以sqala在`mapDistinct`后的`sortBy`方法中，Lambda参数类型实际代表当前投影到的类型：

```scala
val q = query:
    from(User)
        .mapDistinct(u => (mappedId = u.id, mappedName = u.name))
        .sortBy(u => u.mappedName.desc)
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
        VALUES (1, '小黑'), (2, '小白')
    ) AS "t1"("id", "name")
```

**请注意你使用的数据库版本是否支持`VALUES`查询功能**。

## 查询锁

sqala支持`forUpdate`、`forUpdateNoWait`、`forUpdateSkipLocked`、`forShare`、`forShareNoWait`、`forShareSkipLocked`等方法给查询加锁，对应数据库的相应加锁子句，但某些数据库可能未支持此操作，请确认后使用：

```scala
val q = query:
    from(User).forShareSkipLocked
```

## 自定义查询量词

某些数据库方言支持除了SQL标准的`ALL`或`DISTINCT`以外查询量词，比如PostgreSQL的`SELECT DISTINCT ON (...)`，而sqala的功能是基于标准SQL创建，所以不支持这些方言量词，但我们可以通过`rawQuantifier`字符串插值器配合`mapQuantified`方法自定义查询：

```scala
val q = query:
    from(User)
        .mapQuantified(u => rawQuantifier"DISTINCT ON ${(u.id, u.name)}")(u => u.name)
```

生成的SQL为：

```sql
SELECT DISTINCT ON ("t1"."id", "t1"."name")
    "t1"."name" AS "c1"
FROM
    "user" AS "t1"
```

量词插值器支持值、[表达式](./expr.md)和他们组成的元组，字符串中无需手动拼接引号，圆括号等符号，sqala会自动处理并进行安全转义。