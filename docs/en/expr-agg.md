# Aggregate Functions

Aggregate functions are an important SQL feature, usually used together with [grouping queries](./query-group.md). sqala includes most of the standard aggregate functions defined in ISO/IEC 9075. For functions outside this standard list, you can create your own using sqala's [custom expressions](./expr-custom.md) feature.

Aggregate function usage example:

```scala
val query =
    from(Post).map(p => sum(p.likeCount))
```

The aggregate functions built into sqala are:

|     Function       |      Corresponding SQL Function      |
|:-----------------:|:------------------------------------:|
|`count()`          |`COUNT(*)`                            |
|`count(a)`         |`COUNT(a)`                            |
|`countDistinct(a)` |`COUNT(DISTINCT a)`                   |
|`sum(a)`           |`SUM(a)`                              |
|`avg(a)`           |`AVG(a)`                              |
|`max(a)`           |`MAX(a)`                              |
|`min(a)`           |`MIN(a)`                              |
|`anyValue(a)`      |`ANY_VALUE(a)`                        |
|`stddevPop(a)`     |`STDDEV_POP(a)`                       |
|`stddevSamp(a)`    |`STDDEV_SAMP(a)`                      |
|`varPop(a)`        |`VAR_POP(a)`                          |
|`varSamp(a)`       |`VAR_SAMP(a)`                         |
|`covarPop(a, b)`   |`COVAR_POP(a, b)`                     |
|`covarSamp(a, b)`  |`COVAR_SAMP(a, b)`                    |
|`corr(a, b)`       |`CORR(a, b)`                          |
|`regrSlope(a, b)`   |`REGR_SLOPE(a, b)`                   |
|`regrIntercept(a, b)`|`REGR_INTERCEPT(a, b)`              |
|`regrCount(a, b)`  |`REGR_COUNT(a, b)`                    |
|`regrR2(a, b)`     |`REGR_R2(a, b)`                       |
|`regrAvgx(a, b)`   |`REGR_AVGX(a, b)`                     |
|`regrAvgy(a, b)`   |`REGR_AVGY(a, b)`                     |
|`regrSxx(a, b)`    |`REGR_SXX(a, b)`                      |
|`regrSyy(a, b)`    |`REGR_SYY(a, b)`                      |
|`regrSxy(a, b)`    |`REGR_SXY(a, b)`                      |

Aggregate functions cannot be nested. sqala performs a semantic check for this case, so the following usage results in a compile error:

```scala
val query =
    // Compile error: Aggregate function calls cannot be nested.
    from(Post).map(p => count(sum(p.likeCount)))
```

In addition, sqala supports the standard SQL string-aggregate function `LISTAGG`: besides the `listAgg` method, it also provides the synonyms `stringAgg` and `groupConcat`.

The first parameter of the `listAgg` function is the expression to aggregate, the second is the separator, and the third is the ordering rule:

```scala
val query =
    from(Post).map(p => listAgg(p.title, ",", p.id.asc))
```

The SQL this function generates in each major database is:

| Database Type | LISTAGG Compatibility |
|------------|---------------|
| PostgreSQL | `STRING_AGG(x, ',' ORDER BY y)` |
| MySQL | `GROUP_CONCAT(x ORDER BY y SEPARATOR ',')` |
| Oracle | `LISTAGG(x, ',') WITHIN GROUP (ORDER BY y)` |

Additionally, the SQL standard defines two special aggregate functions, `PERCENTILE_CONT` and `PERCENTILE_DISC`, for computing percentiles.

The first parameter of the `percentileCont`/`percentileDisc` functions is the percentile, ranging from `0` to `1`; the second parameter is the ordering rule, and the ordering expression must be of a numeric type. Both arguments are checked for numeric types at compile time; since the result may be NULL, the returned expression type is wrapped as a nullable type (e.g., `Option[Double]`).

```scala
val query =
    from(Post).map(p => percentileCont(0.5, p.id.asc))
```

The generated SQL is:

```sql
SELECT
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "t1"."id" ASC) AS "c1"
FROM
    "post" AS "t1"
```

## FILTER Clause

Aggregate functions support the standard SQL `FILTER` clause: calling `filter` on an aggregate expression generates `aggregate_expression FILTER (WHERE condition)`, and the condition may reference columns within the current group:

```scala
val query =
    from(Post)
        .groupBy(p => p.authorId)
        .map((g, p) => sum(p.likeCount).filter(p.likeCount > 0))
```

`filter` can be called multiple times; the conditions are combined with `AND` into a single `FILTER (WHERE ...)` clause. The condition must be a boolean expression allowed at the aggregate call position; otherwise, compilation fails.
