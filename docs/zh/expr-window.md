# 窗口函数

窗口函数是SQL提供的高级分析功能，对[聚合函数](./expr-agg.md)或专用分析函数添加`OVER`子句，来创建窗口函数。

sqala提供了`over`方法，用于创建窗口，其参数为窗口的分组规则，排序规则和窗口函数框架。

使用`partitionBy`方法创建窗口的分组规则，并配合`over`使用：

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(partitionBy(p.authorId)))
```

`partitionBy`之后可以使用`sortBy`方法创建窗口的排序规则：

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(partitionBy(p.authorId).sortBy(p.id.desc)))
```

`over`中也可以没有`partitionBy`：

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(sortBy(p.id.desc)))
```

`over`中也支持窗口函数框架，`range`、`rows`、`groups`参数是单个边界信息，`rangeBetween`、`rowsBetween`、`groupsBetween`参数是两个边界信息：

```scala
val query =
    from(Post).map: p =>
        sum(p.likeCount)
            .over(
                partitionBy(p.authorId)
                    .sortBy(p.id.desc)
                    .rows(currentRow)
            )
```

或

```scala
val query =
    from(Post).map: p =>
        sum(p.likeCount)
            .over(
                partitionBy(p.authorId)
                    .sortBy(p.id.desc)
                    .rowsBetween(currentRow, 1.preceding)
            )
```

边界支持`currentRow`、`unboundedPreceding`、`unboundedFollowing`、`n.preceding`、`n.following`。

我们可以使用`excludeCurrentRow`、`excludeTies`、`excludeGroup`排除组间特定行：

```scala
val query =
    from(Post).map: p =>
        sum(p.likeCount)
            .over(
                partitionBy(p.authorId)
                    .sortBy(p.id.desc)
                    .rowsBetween(currentRow, 1.preceding)
                    .excludeCurrentRow
            )
```

sqala内置支持的窗口函数有：

| 函数                                       | 对应的 SQL 函数                                       |
|--------------------------------------------|------------------------------------------------------|
| `rank()`                                   | `RANK()`                                             |
| `denseRank()`                              | `DENSE_RANK()`                                       |
| `percentRank()`                            | `PERCENT_RANK()`                                     |
| `cumeDist()`                               | `CUME_DIST()`                                        |
| `rowNumber()`                              | `ROW_NUMBER()`                                       |
| `ntile(n)`                                 | `NTILE(n)`                                           |
| `firstValue(a)`                            | `FIRST_VALUE(a)`                                     |
| `firstValueIgnoreNulls(a)`                 | `FIRST_VALUE(a) IGNORE NULLS`                        |
| `lastValue(a)`                             | `LAST_VALUE(a)`                                      |
| `lastValueIgnoreNulls(a)`                  | `LAST_VALUE(a) IGNORE NULLS`                         |
| `nthValue(a, n)`                           | `NTH_VALUE(a, n)`                                    |
| `nthValueIgnoreNulls(a, n)`                | `NTH_VALUE(a, n) IGNORE NULLS`                       |
| `nthValueFromLast(a, n)`                   | `NTH_VALUE(a, n) FROM LAST`                          |
| `nthValueFromLastIgnoreNulls(a, n)`        | `NTH_VALUE(a, n) FROM LAST IGNORE NULLS`             |
| `lag(a)`                                   | `LAG(a)`                                             |
| `lag(a, n)`                                | `LAG(a, n)`                                          |
| `lag(a, n, d)`                             | `LAG(a, n, d)`                                       |
| `lagIgnoreNulls(a)`                        | `LAG(a) IGNORE NULLS`                                |
| `lagIgnoreNulls(a, n)`                     | `LAG(a, n) IGNORE NULLS`                             |
| `lagIgnoreNulls(a, n, d)`                  | `LAG(a, n, d) IGNORE NULLS`                          |
| `lead(a)`                                  | `LEAD(a)`                                            |
| `lead(a, n)`                               | `LEAD(a, n)`                                         |
| `lead(a, n, d)`                            | `LEAD(a, n, d)`                                      |
| `leadIgnoreNulls(a)`                       | `LEAD(a) IGNORE NULLS`                               |
| `leadIgnoreNulls(a, n)`                    | `LEAD(a, n) IGNORE NULLS`                            |
| `leadIgnoreNulls(a, n, d)`                 | `LEAD(a, n, d) IGNORE NULLS`                         |

## 语义检查

`over`只能用于聚合函数或窗口函数，否则会返回编译错误：

```scala
val query =
    // 编译错误：Over specified, but this expression is not a window function nor an aggregate function.
    from(Post).map(p => p.id.over())
```

窗口函数不能嵌套，错误文案为 `Window function calls cannot be nested.`。
