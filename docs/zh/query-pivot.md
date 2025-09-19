# 透视表

在数据分析场景中，行转列透视表是一个常见的需求，通常数据分析人员会在聚合函数中使用条件表达式来处理这样的需求，sqala支持条件表达式和聚合函数，因此比如我们有一个存储国家编码，城市名称，统计年份，人口数量的表：

```scala
case class City(country: String, name: String, year: Int, population: Int)
```

我们可以这样写行转列查询：

```scala
val q = query:
    from(City).map: c =>
        sum(`if` (c.country == "CN") `then` c.population `else` 0)
```

但当统计的维度、度量多起来的时候，这样的查询会十分繁琐，因此sqala支持透视表功能，我们可以简化透视表查询编写难度：

```scala
val q = query:
    from:
        City.pivot(c =>
            c.agg(sum = sum(c.population), count = count())
            .`for`(
                c.country.within(cn = "CN", us = "US"),
                c.year.within(`2024` = 2024, `2025` = 2025)
            )
        )
```

`agg`用于指定聚合函数列表，参数是一个**命名元组**，`for`方法用于填写用于行转列的计算规则，参数是多个`within`调用，其参数也是**命名元组**。

`PIVOT`不是SQL标准功能，但sqala会将其生成符合标准的SQL，生成的SQL为：

```sql
SELECT
    "t2"."c1" AS "c1",
    "t2"."c2" AS "c2",
    "t2"."c3" AS "c3",
    "t2"."c4" AS "c4",
    "t2"."c5" AS "c5",
    "t2"."c6" AS "c6",
    "t2"."c7" AS "c7",
    "t2"."c8" AS "c8"
FROM
    (
        SELECT
            SUM("t1"."population") FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c1",
            SUM("t1"."population") FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c2",
            SUM("t1"."population") FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c3",
            SUM("t1"."population") FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c4",
            COUNT(*) FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c5",
            COUNT(*) FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c6",
            COUNT(*) FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c7",
            COUNT(*) FILTER (WHERE "t1"."country" = ? AND "t1"."year" = ?) AS "c8"
        FROM
            "city" AS "t1"
    ) AS "t2"
```

由于这个特性需要数据库支持SQL标准中的聚合函数的`FILTER`子句，所以确认你的数据库是否支持这一特性。

sqala会自动从命名的所有组合中**生成新的字段名**，所以这个操作也是类型安全的，以上查询将返回下面的类型：

```scala
// 返回类型为
// List[
//     (
//         sum_cn_2024: Option[Int], 
//         sum_cn_2025: Option[Int], 
//         sum_us_2024: Option[Int], 
//         sum_us_2025: Option[Int], 
//         count_cn_2024: Long, 
//         count_cn_2025: Long, 
//         count_us_2024: Long, 
//         count_us_2025 : Long
//     )
// ]
val result = db.fetch(1)
```

我们可以直接用新生成的字段名在后续查询中使用：

```scala
val q = query:
    from:
        City.pivot(c =>
            c.agg(sum = sum(c.population), count = count())
            .`for`(
                c.country.within(cn = "CN", us = "US"),
                c.year.within(`2024` = 2024, `2025` = 2025)
            )
        )
    .filter(p => p.sum_cn_2024 > 100000)
```

或是调用结果：

```scala
val result = db.fetch(q)

for r <- result do
    println(r.count_us_2025)
```

透视表支持分组操作，参数依旧是命名元组：

```scala
val q = query:
    from:
        City.pivot(c =>
            c
            .groupBy((country = c.country))
            .agg(sum = sum(c.population), count = count())
            .`for`(
                c.country.within(cn = "CN", us = "US"),
                c.year.within(`2024` = 2024, `2025` = 2025)
            )
        )
```

sqala将会把分组字段排在返回类型最前面：

```scala
// 返回类型为
// List[
//     (
//         country: String
//         sum_cn_2024: Option[Int], 
//         sum_cn_2025: Option[Int], 
//         sum_us_2024: Option[Int], 
//         sum_us_2025: Option[Int], 
//         count_cn_2024: Long, 
//         count_cn_2025: Long, 
//         count_us_2024: Long, 
//         count_us_2025 : Long
//     )
// ]
val result = db.fetch(1)
```