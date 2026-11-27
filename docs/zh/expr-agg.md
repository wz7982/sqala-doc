# 聚合函数

聚合函数是SQL的重要功能，通常配合[分组查询](./query-group.md)使用。sqala内置了ISO/IEC 9075中定义的绝大多数标准聚合函数；不在此标准函数列表中的，您可以使用sqala提供的[自定义表达式](./expr-custom.md)功能自行创建。

聚合函数使用示例：

```scala
val query =
    from(Post).map(p => sum(p.likeCount))
```

sqala内置的聚合函数如下：

|     函数           |      对应的SQL函数      |
|:-----------------:|:-----------------------:|
|`count()`          |`COUNT(*)`               |
|`count(a)`         |`COUNT(a)`               |
|`countDistinct(a)` |`COUNT(DISTINCT a)`      |
|`sum(a)`           |`SUM(a)`                 |
|`avg(a)`           |`AVG(a)`                 |
|`max(a)`           |`MAX(a)`                 |
|`min(a)`           |`MIN(a)`                 |
|`anyValue(a)`      |`ANY_VALUE(a)`           |
|`stddevPop(a)`     |`STDDEV_POP(a)`          |
|`stddevSamp(a)`    |`STDDEV_SAMP(a)`         |
|`varPop(a)`        |`VAR_POP(a)`             |
|`varSamp(a)`       |`VAR_SAMP(a)`            |
|`covarPop(a, b)`   |`COVAR_POP(a, b)`        |
|`covarSamp(a, b)`  |`COVAR_SAMP(a, b)`       |
|`corr(a, b)`       |`CORR(a, b)`             |
|`regrSlope(a, b)`   |`REGR_SLOPE(a, b)`       |
|`regrIntercept(a, b)`|`REGR_INTERCEPT(a, b)` |
|`regrCount(a, b)`  |`REGR_COUNT(a, b)`       |
|`regrR2(a, b)`     |`REGR_R2(a, b)`          |
|`regrAvgx(a, b)`   |`REGR_AVGX(a, b)`        |
|`regrAvgy(a, b)`   |`REGR_AVGY(a, b)`        |
|`regrSxx(a, b)`    |`REGR_SXX(a, b)`         |
|`regrSyy(a, b)`    |`REGR_SYY(a, b)`         |
|`regrSxy(a, b)`    |`REGR_SXY(a, b)`         |

聚合函数不允许嵌套调用，sqala会对这种情况进行语义检查，因此以下用法会返回编译错误：

```scala
val query =
    // 编译错误：Aggregate function calls cannot be nested.
    from(Post).map(p => count(sum(p.likeCount)))
```

此外，sqala支持标准SQL的字符串聚合函数`LISTAGG`：除`listAgg`方法外，还提供了同义方法`stringAgg`和`groupConcat`。

`listAgg`函数的第一个参数为需要聚合的表达式，第二个参数为分隔符，第三个参数为排序规则：

```scala
val query =
    from(Post).map(p => listAgg(p.title, ",", p.id.asc))
```

该函数在各主流数据库中生成的SQL为：

| 数据库类型 | LISTAGG 兼容 |
|------------|---------------|
| PostgreSQL | `STRING_AGG(x, ',' ORDER BY y)` |
| MySQL | `GROUP_CONCAT(x ORDER BY y SEPARATOR ',')` |
| Oracle | `LISTAGG(x, ',') WITHIN GROUP (ORDER BY y)` |

另外，SQL标准中还有两个特殊聚合函数`PERCENTILE_CONT`和`PERCENTILE_DISC`，用于计算百分位。

`percentileCont`/`percentileDisc`的第一个参数为百分位，取值范围为`0`到`1`；第二个参数为排序规则，排序表达式的类型必须是数值。两个参数都会在编译期进行数值检查；由于结果可能为空，返回的表达式类型会被包装为可空类型（如`Option[Double]`）。

```scala
val query =
    from(Post).map(p => percentileCont(0.5, p.id.asc))
```

生成的SQL为：

```sql
SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "t1"."id" ASC) AS "c1"
FROM
    "post" AS "t1"
```

## FILTER 子句

聚合函数支持标准SQL的`FILTER`子句：在聚合表达式上调用`filter`方法，生成`聚合表达式 FILTER (WHERE 条件)`，条件中可以使用当前分组内的列：

```scala
val query =
    from(Post)
        .groupBy(p => p.authorId)
        .map((g, p) => sum(p.likeCount).filter(p.likeCount > 0))
```

`filter`可以多次调用，多个条件会以`AND`组合进同一个`FILTER (WHERE ...)`子句。条件必须是允许出现在聚合调用位置的布尔表达式，否则将返回编译错误。
