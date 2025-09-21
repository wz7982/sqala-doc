# 聚合函数

聚合函数是SQL的重要功能，其通常配合[分组查询](./query-group.md)使用，sqala内置了ISO/IEC 9075中定义的绝大多数标准聚合函数，不在此标准函数列表中的，您可以使用sqala提供的[自定义表达式](./expr-custom.md)功能自行创建。

聚合函数使用示例：

```scala
val q = query:
    from(Post).map(p => sum(p.likeCount))
```

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
|`regrSlop(a, b)`   |`REGR_SLOPE(a, b)`       |
|`regrIntercept(a, b)`|`REGR_INTERCEPT(a, b)` |
|`regrCount(a, b)`  |`REGR_COUNT(a, b)`       |
|`regrR2(a, b)`     |`REGR_R2(a, b)`          |
|`regrAvgx(a, b)`   |`REGR_AVGX(a, b)`        |
|`regrAvgy(a, b)`   |`REGR_AVGY(a, b)`        |
|`regrSxx(a, b)`    |`REGR_SXX(a, b)`         |
|`regrSyy(a, b)`    |`REGR_SYY(a, b)`         |
|`regrSxy(a, b)`    |`REGR_SXY(a, b)`         |

此外，sqala支持标准sql的聚合函数`LISTAGG`，用于聚合字符串，但PostgreSQL和MySQL不支持此函数，因此，sqala在PostgreSQL中翻译为`STRING_AGG`，在MySQL中翻译为`GROUP_CONCAT`，sqala在提供`listAgg`方法外，也提供了同义词`stringAgg`和`groupConcat`。

`listAgg`函数的第一个参数为需要聚合的表达式，第二个参数为分隔符，第三个参数为排序规则：

```scala
val q = query:
    from(Post).map(p => listAgg(p.title, ",", p.id.asc))
```

生成的SQL为：

::: code-group

```sql [Oracle]
SELECT
    LISTAGG("t1"."title", ',') WITHIN GROUP (ORDER BY "t1"."id" ASC) AS "c1"
FROM
    "post" "t1"
```

```sql [PostgreSQL]
SELECT
    STRING_AGG("t1"."title", ',' ORDER BY "t1"."id" ASC) AS "c1"
FROM
    "post" AS "t1"
```

```sql [MySQL]
SELECT
    GROUP_CONCAT(`t1`.`title` ORDER BY `t1`.`id` ASC SEPARATOR ',') AS `c1`
FROM
    `post` AS `t1`
```

:::

另外，SQL标准中还有两个特殊聚合函数`PERCENTILE_CONT`和`PERCENTILE_DISC`，用于计算百分位。

`percentileCont`/`percentileDisc`函数的参数为百分比，范围是`0` - `1`，第二个参数为需要聚合表达式的排序规则。

```scala
val q = query:
    from(Post).map(p => percentileCont(0.5, p.id.asc))
```

生成的SQL为：

```sql
SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "t1"."id" ASC) AS "c1"
FROM
    "post" AS "t1"
```