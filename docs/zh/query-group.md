# 分组查询

分组`GROUP BY`操作是数据统计中不可缺少的功能，sqala也对分组查询有着深入的支持。

## 简单分组

分组操作通常与[聚合函数](./expr-agg.md)配合使用，sqala中使用`groupBy`方法创建分组，比如我们需要统计每个频道的帖子数量：

```scala
val q = query:
    from(Post)
        .groupBy(p => p.channelId)
        .map(p => (p.channelId, count()))
```

生成的SQL为：

```sql
SELECT
    "t1"."channel_id" AS "c1",
    COUNT(*) AS "c2"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id"
```

使用元组支持支持多个分组[表达式](./expr.md)：

```scala
val q = query:
    from(Post)
        .groupBy(p => (p.channelId, p.title))
        .map(p => (p.channelId, p.title, count()))
```

生成的SQL为：

```sql
SELECT
    "t1"."channel_id" AS "c1",
    "t1"."title" AS "c2",
    COUNT(*) AS "c3"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id",
    "t1"."title"
```

需要注意的是，大多数数据库都不允许在分组后的操作中出现非分组表达式，因此以下的SQL是错误的：

```sql
SELECT
    "t1"."channel_id" AS "c1",
    "t1"."title" AS "c2",
    COUNT(*) AS "c3"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id"
```

如果我们只想在一个分组中返回任意的`title`字段值，使用`ANY_VALUE`聚合函数即可，在sqala中对应的方法为`anyValue`：

```scala
val q = query:
    from(Post)
        .groupBy(p => p.channelId)
        .map(p => (p.channelId, anyValue(p.title), count()))
```

## PostgreSQL的限制

由于PostgreSQL数据库的驱动校验比较严格，而JDBC又没有预编译参数的占位符下标功能，因此在这样的一个分组查询中：

```scala
val q = query:
    from(Post)
        .groupBy(p => p.channelId + 1)
        .map(p => (p.channelId + 1, count()))
```

会生成这样的SQL：

```sql
SELECT
    "t1"."channel_id" + ? AS "c1",
    COUNT(*) AS "c2"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id" + ?
```

该数据库驱动无法判定两个`?`是同样的表达式，因此会在查询时报错。

解决办法是在数据库连接中添加`?preferQueryMode=simple`来禁用预编译，

或是将此查询改为[子查询](./query-sub.md)形式：

```scala
val q = query:
    from:
        from(Post).map(p => (channelId = p.channelId + 1))
    .groupBy(p => p.channelId)
    .map(p => (p.channelId, count()))
```

## 分组后过滤

`having`方法用于分组后过滤数据，使用方式与`filter`类似：

```scala
val q = query:
    from(Post)
        .groupBy(p => p.channelId)
        .having(p => count() > 1)
        .map(p => (p.channelId, count()))
```

生成的SQL为：

```sql
SELECT
    "t1"."channel_id" AS "c1",
    COUNT(*) AS "c2"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id"
HAVING
    COUNT(*) > ?
```

## 多维分组

除了简单的分组外，sqala支持多维分组操作。

### CUBE分组

SQL的`GROUP BY CUBE(a, b, c)`将会在分组中生成每一种组合的情况，也就是说`CUBE (a, b, c)`相当于合并以下分组：

|   分组   |
|:--------:|
|无分组     |
|`a`       |
|`b`       |
|`c`       |
|`a, b`    |
|`a, c`    |
|`b, c`    |
|`a, b, c` |

共8种情况（2的n次方）。

`CUBE`分组在制作多维数据集时非常有用，sqala既然宣称支持：“不止是简单的CRUD”，当然也支持`CUBE`分组功能。

我们以一个人口表的“年龄段”，“民族”，“性别”三个维度统计人数。年龄段以“小于30岁分为青少年，30-60岁分为中年，60岁以上分为老年”分段统计。

```scala
case class Person(id: Int, age: Int, nation: String, gender: String)

val q = query:
    from(Person)
        .groupByCube: p =>
            (
                `if` (p.age <= 30) `then` "青少年" `else if` (p.age <= 60 && p.age > 30) `then` "中年" `else` "老年",
                p.nation,
                p.gender
            )
        .map: p =>
            (
                age = 
                    `if` (p.age <= 30) `then` "青少年" `else if` (p.age <= 60 && p.age > 30) `then` "中年" `else` "老年",
                nation = p.nation,
                gender = p.gender,
                count = count()
            )
```

生成的SQL为：

```sql
SELECT
    CASE WHEN "t1"."age" <= ? THEN ? WHEN "t1"."age" <= ? AND "t1"."age" > ? THEN ? ELSE ? END AS "c1",
    "t1"."nation" AS "c2",
    "t1"."gender" AS "c3",
    COUNT(*) AS "c4"
FROM
    "person" AS "t1"
GROUP BY
    CUBE(
        CASE WHEN "t1"."age" <= ? THEN ? WHEN "t1"."age" <= ? AND "t1"."age" > ? THEN ? ELSE ? END, 
        "t1"."nation", 
        "t1"."gender"
    )
```

需要注意的是，即使数据中没有可空字段，但`CUBE`还是会生成本来不存在的空值，这是`CUBE`的语义决定的，因此，sqala会将此查询结果推断成：

```scala
case class Person(id: Int, age: Int, nation: String, gender: String)

val q = query:
    from(Person)
        .groupByCube: p =>
            (
                `if` (p.age <= 30) `then` "青少年" `else if` (p.age <= 60 && p.age > 30) `then` "中年" `else` "老年",
                p.nation,
                p.gender
            )
        .map: p =>
            (
                age = 
                    `if` (p.age <= 30) `then` "青少年" `else if` (p.age <= 60 && p.age > 30) `then` "中年" `else` "老年",
                nation = p.nation,
                gender = p.gender,
                count = count()
            )

// 返回类型为List[(age: Option[String], nation: Option[String], gender: Option[String], count: Option[Long])]
val result = db.fetch(q)
```

### GROUPING表达式

既然多维分组集会产生额外的空值，那我们怎么区分“分组产生的空值是数据原本就有的，还是因为多维分组额外产生的”，为此，SQL推出了配套的`GROUPING`表达式，`GROUPING`的结果为1则说明空值是分组额外产生的，结果为0则说明空值是原本数据中就有的，在sqala中，我们使用`grouping`方法创建此表达式：

```scala
val q = query:
    from(Person)
        .groupByCube: p =>
            (
                `if` (p.age <= 30) `then` "青少年" `else if` (p.age <= 60 && p.age > 30) `then` "中年" `else` "老年",
                p.nation,
                p.gender
            )
        .map: p =>
            (
                age = 
                    `if` (p.age <= 30) `then` "青少年" `else if` (p.age <= 60 && p.age > 30) `then` "中年" `else` "老年",
                groupingAge = grouping(
                    `if` (p.age <= 30) `then` "青少年" `else if` (p.age <= 60 && p.age > 30) `then` "中年" `else` "老年"
                ),
                nation = p.nation,
                groupingNation = grouping(p.nation),
                gender = p.gender,
                groupingGender = grouping(p.gender),
                count = count()
            )
```

生成的SQL为：

```sql
SELECT
    CASE WHEN "t1"."age" <= ? THEN ? WHEN "t1"."age" <= ? AND "t1"."age" > ? THEN ? ELSE ? END AS "c1",
    GROUPING(CASE WHEN "t1"."age" <= ? THEN ? WHEN "t1"."age" <= ? AND "t1"."age" > ? THEN ? ELSE ? END) AS "c2",
    "t1"."nation" AS "c3",
    GROUPING("t1"."nation") AS "c4",
    "t1"."gender" AS "c5",
    GROUPING("t1"."gender") AS "c6",
    COUNT(*) AS "c7"
FROM
    "person" AS "t1"
GROUP BY
    CUBE(
        CASE WHEN "t1"."age" <= ? THEN ? WHEN "t1"."age" <= ? AND "t1"."age" > ? THEN ? ELSE ? END, 
        "t1"."nation", 
        "t1"."gender"
    )
```

### ROLLUP分组

SQL的`GROUP BY ROLLUP(a, b, c)`将会在分组中生成逐级分组，也就是说`ROLLUP (a, b, c)`相当于合并以下分组：

|   分组   |
|:--------:|
|无分组     |
|`a`       |
|`a, b`    |
|`a, b, c` |

共4种情况（n + 1）。

在sqala中使用`groupByRollup`方法生成`ROLLUP`分组，使用方式与`groupByCube`类似，不赘述。

### GROUPING SETS分组

SQL的`GROUP BY GROUPING SETS`分组将按指定的分组集来产生分组结果，比如我们想做到类似`ROLLUP`的效果，则需要写成：

`GROUP BY GROUPING SETS((), a, (a, b), (a, b, c))`空分组集使用`()`来生成，为了做到这一点，sqala中的`groupBySets`方法接收一个分组的嵌套元组，空分组集使用`Unit`类型的字面量`()`来指定：

```scala
val q = query:
    from(Entity)
        .groupBySets(e => ((), e.a, (e.a, e.b), (e.a, e.b, e.c)))
        .map(e => (e.a, e.b, e.c, count()))
```