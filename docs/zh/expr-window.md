# 窗口函数

窗口函数是SQL提供的高级分析功能，通过在[聚合函数](./expr-agg.md)或专用分析函数上添加`OVER`子句来创建。

sqala提供`over`方法用于创建窗口，其参数为窗口的分区规则、排序规则和窗口框架。

使用`partitionBy`方法创建窗口的分区规则，并配合`over`使用：

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

`over`中也可以省略`partitionBy`：

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(sortBy(p.id.desc)))
```

调用`over()`且不传入任何参数，则声明空窗口（既无分区也无排序），常用于`rowNumber()`等函数：

```scala
val query =
    from(Post)
        .map(p => (p.title, rowNumber().over()))
```

`over`也支持窗口框架：`range`、`rows`、`groups`的参数为单个边界，`rangeBetween`、`rowsBetween`、`groupsBetween`的参数为两个边界。其中`rows`可直接用于没有排序键的窗口；`range`和`groups`依赖排序键，只能在`sortBy`之后调用：

```scala
val query =
    from(Post).map: p =>
        sum(p.likeCount)
            .over(
                partitionBy(p.authorId)
                    .sortBy(p.id.desc)
                    .rows(unboundedPreceding)
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
                    .rowsBetween(1.preceding, currentRow)
            )
```

边界支持`currentRow`、`unboundedPreceding`、`unboundedFollowing`、`n.preceding`、`n.following`。其中`n.preceding`、`n.following`中的`n`必须是字面量常量，列引用不能作为边界。

可以使用`excludeCurrentRow`、`excludeTies`、`excludeGroup`排除窗口框架内的特定行：

```scala
val query =
    from(Post).map: p =>
        sum(p.likeCount)
            .over(
                partitionBy(p.authorId)
                    .sortBy(p.id.desc)
                    .rowsBetween(1.preceding, currentRow)
                    .excludeCurrentRow
            )
```

sqala内置支持的窗口函数如下：

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

`over`只能用于聚合函数或窗口函数，否则会产生编译错误：

```scala
val query =
    // 编译错误：Over specified, but this expression is not a window function nor an aggregate function.
    from(Post).map(p => p.id.over())
```

窗口函数不能嵌套，错误信息为`Window function calls cannot be nested.`。

窗口框架的起止边界必须有序排列，即`unboundedPreceding` < `n.preceding` < `currentRow` < `n.following` < `unboundedFollowing`，起始边界不得晚于结束边界（两者可以相等，如`rowsBetween(currentRow, currentRow)`即为合法用法）。`rows`、`range`、`groups`只接受起始边界，结束边界固定为`currentRow`，因此起始边界不能是`n.following`或`unboundedFollowing`：

```scala
val q1 =
    from(Post).map: p =>
        // 编译错误：Frame starting from current row cannot end at preceding row.
        sum(p.likeCount).over(
            partitionBy(p.authorId).sortBy(p.id.desc).rowsBetween(currentRow, 1.preceding)
        )

val q2 =
    from(Post).map: p =>
        // 编译错误：Frame starting from unbounded following cannot end at current row.
        sum(p.likeCount).over(
            partitionBy(p.authorId).sortBy(p.id.desc).rows(unboundedFollowing)
        )
```

`rows`和`groups`的边界值必须是整数，`range`的边界类型则必须与窗口的排序键兼容（数值排序键对应数值边界，时间排序键对应`INTERVAL`边界），否则会产生编译错误：

```scala
val q3 =
    from(Post).map: p =>
        // 编译错误：Window frame type is incompatible with the ordering expression.
        sum(p.likeCount).over(
            partitionBy(p.authorId).sortBy(p.title).rangeBetween(1.preceding, currentRow)
        )
```

