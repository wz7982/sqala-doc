# 分组查询

分组`GROUP BY`是数据统计中不可或缺的功能，sqala对分组查询也提供了深入的支持。

## 简单分组

分组操作通常与[聚合函数](./expr-agg.md)配合使用。sqala中使用`groupBy`方法创建分组，例如统计每个频道的帖子数量：

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        .map((g, p) => (g, count()))
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

分组之后的`sortBy`/`having`/`map`均多出一个参数，代表当前的分组集（若是两表连接之后再分组则有三个参数，以此类推）。

使用元组或命名元组可支持多个分组[表达式](./expr.md)：

```scala
val query =
    from(Post)
        .groupBy(p => (cid = p.channelId, title = p.title))
        .map((g, p) => (g.cid, g.title, count()))
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

需要注意的是，大多数数据库都不允许分组后的操作中出现非分组表达式，因此以下SQL是错误的：

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

sqala也会对此类查询给出编译错误：

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        // 编译错误：Ungrouped column references must appear in the groupBy clause or be used in an aggregate function.
        .map((g, p) => (g, p.title, count()))
```

若只想在一个分组中返回任意一个`title`字段值，使用`ANY_VALUE`聚合函数即可，其在sqala中对应的方法为`anyValue`：

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        .map((g, p) => (g, anyValue(p.title), count()))
```

## 分组后过滤

`having`方法用于在分组后过滤数据，用法与`filter`类似：

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        .having((g, p) => count() > 1)
        .map((g, p) => (g, count()))
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
    COUNT(*) > 1
```

### 语义检查

`groupBy`和`having`中的表达式同样会在编译期接受检查：

```scala
val q1 =
    // 编译错误：Aggregate functions are not allowed in groupBy.
    from(Post).groupBy(p => count())

val q2 =
    // 编译错误：Window functions are not allowed in groupBy.
    from(Post).groupBy(p => rowNumber().over())

val q3 =
    from(Post)
        .groupBy(p => p.channelId)
        // 编译错误：Window functions are not allowed in having.
        .having((g, p) => rowNumber().over() > 1)

val q4 =
    from(Post)
        .groupBy(p => p.channelId)
        // 编译错误：Ungrouped column references must appear in the groupBy clause or be used in an aggregate function.
        .having((g, p) => p.title === "x")
```

## 多维分组

除简单分组外，sqala还支持多维分组操作。

### CUBE分组

SQL的`GROUP BY CUBE(a, b, c)`会在分组中生成每一种组合，即`CUBE (a, b, c)`相当于合并以下分组：

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

`CUBE`分组在构建多维数据集时非常有用，sqala既然宣称“不止是简单的CRUD”，自然也支持`CUBE`分组。

以下以一张人口表为例，按“年龄段”、“民族”、“性别”三个维度统计人数。年龄段按“30岁及以下为青少年，31-60岁为中年，60岁以上为老年”分段。

使用`groupBySets`配合`cube`方法创建`CUBE`分组：

```scala
case class Person(id: Int, age: Int, nation: String, gender: String)

val query =
    from(Person)
        .groupBySets(p =>
            (
                age = caseWhen(p.age <= 30)("青少年").when(p.age <= 60 && p.age > 30)("中年").otherwise("老年"),
                nation = p.nation,
                gender = p.gender
            )
        )(g =>
            cube(g.age, g.nation, g.gender)
        ).map: (g, p) =>
            (
                age = g.age,
                nation = g.nation,
                gender = g.gender,
                count = count()
            )
```

生成的SQL为：

```sql
SELECT
    CASE WHEN "t1"."age" <= 30 THEN '青少年' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN '中年' ELSE '老年' END AS "c1",
    "t1"."nation" AS "c2",
    "t1"."gender" AS "c3",
    COUNT(*) AS "c4"
FROM
    "person" AS "t1"
GROUP BY
    CUBE(
        CASE WHEN "t1"."age" <= 30 THEN '青少年' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN '中年' ELSE '老年' END,
        "t1"."nation",
        "t1"."gender"
    )
```

可见，分组时使用命名元组能够极大简化代码。

需要注意的是，即使数据中不含可空字段，`CUBE`仍会产生原本不存在的空值，这是由`CUBE`的语义决定的。因此，sqala会将该查询的结果类型推断为：

```scala
// 返回类型为List[(age: Option[String], nation: Option[String], gender: Option[String], count: Long)]
val result = db.fetch(query)
```

### GROUPING表达式

既然多维分组集会产生额外的空值，那么如何区分空值是数据原本就有的，还是多维分组额外产生的？为此，SQL引入了配套的`GROUPING`表达式：结果为1说明空值由分组额外产生，结果为0说明空值在原数据中就已存在。在sqala中，使用`grouping`方法创建该表达式：

```scala
val query =
    from(Person)
        .groupBySets(p =>
            (
                age = caseWhen(p.age <= 30)("青少年").when(p.age <= 60 && p.age > 30)("中年").otherwise("老年"),
                nation = p.nation,
                gender = p.gender
            )
        )(g =>
            cube(g.age, g.nation, g.gender)
        ).map: (g, p) =>
            (
                age = g.age,
                groupingAge = grouping(g.age),
                nation = g.nation,
                groupingNation = grouping(g.nation),
                gender = g.gender,
                groupingGender = grouping(g.gender),
                count = count()
            )
```

生成的SQL为：

```sql
SELECT
    CASE WHEN "t1"."age" <= 30 THEN '青少年' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN '中年' ELSE '老年' END AS "c1",
    GROUPING(CASE WHEN "t1"."age" <= 30 THEN '青少年' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN '中年' ELSE '老年' END) AS "c2",
    "t1"."nation" AS "c3",
    GROUPING("t1"."nation") AS "c4",
    "t1"."gender" AS "c5",
    GROUPING("t1"."gender") AS "c6",
    COUNT(*) AS "c7"
FROM
    "person" AS "t1"
GROUP BY
    CUBE(
        CASE WHEN "t1"."age" <= 30 THEN '青少年' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN '中年' ELSE '老年' END,
        "t1"."nation",
        "t1"."gender"
    )
```

### ROLLUP分组

SQL的`GROUP BY ROLLUP(a, b, c)`会生成逐级递进的分组，即`ROLLUP (a, b, c)`相当于合并以下分组：

|   分组   |
|:--------:|
|无分组     |
|`a`       |
|`a, b`    |
|`a, b, c` |

共4种情况（n + 1）。

在sqala中，创建`ROLLUP`分组的方式与`CUBE`类似，将`cube`替换为`rollup`即可，不再赘述。

### GROUPING SETS分组

SQL的`GROUP BY GROUPING SETS`分组将按指定的分组集产生分组结果。例如，要实现类似`ROLLUP`的效果，需要写成：

`GROUP BY GROUPING SETS((), a, (a, b), (a, b, c))`。`groupBySets`配合`groupingSets`方法传入这些分组集对应的嵌套元组，空分组集使用`Unit`类型字面量`()`指定：

```scala
val query =
    from(Entity)
        .groupBySets(e => (a = e.a, b = e.b, c = e.c))(g => groupingSets((), g.a, (g.a, g.b), (g.a, g.b, g.c)))
        .map((g, e) => (g.a, g.b, g.c, count()))
```

### 兼容性

各主流数据库的最新版本对多维分组的实测支持程度如下：

| 方法 | PostgreSQL | MySQL | Oracle |
| ------ | ------------ | ------- | -------- |
| `cube` | ✅ | ❌ | ✅ |
| `rollup` | ✅ | ✅ | ✅ |
| `groupingSets` | ✅ | ❌ | ✅ |
