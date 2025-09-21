# 窗口函数

窗口函数是SQL提供的高级分析功能，对[聚合函数](./expr-agg.md)或专用分析函数添加`OVER`子句，来创建窗口函数。

sqala提供了`over`方法，用于创建窗口，其参数为窗口的分组规则，排序规则和窗口函数框架。

使用`partitionBy`方法创建窗口的分组规则，并配合`over`使用：

```scala
val q = query:
    from(Post)
        .map(p => sum(p.likeCount).over(partitionBy(p.authorId)))
```

`partitionBy`之后可以使用`orderBy`方法创建窗口的排序规则：

```scala
val q = query:
    from(Post)
        .map(p => sum(p.likeCount).over(partitionBy(p.authorId).orderBy(p.id.desc)))
```

`over`中也可以没有`partitionBy`：

```scala
val q = query:
    from(Post)
        .map(p => sum(p.likeCount).over(orderBy(p.id.desc)))
```

`over`中也支持窗口函数框架，`range`、`rows`、`groups`参数是单个边界信息，`rangeBetween`、`rowsBetween`、`groupsBetween`参数是两个边界信息：

```scala
val q = query:
    from(Post).map: p => 
        sum(p.likeCount)
            .over(
                partitionBy(p.authorId)
                    .orderBy(p.id.desc)
                    .rows(currentRow)
            )
```

或

```scala
val q = query:
    from(Post).map: p => 
        sum(p.likeCount)
            .over(
                partitionBy(p.authorId)
                    .orderBy(p.id.desc)
                    .rowsBetween(currentRow, 1.preceding)
            )
```

边界支持`currentRow`、`unboundedPreceding`、`unboundedFollowing`、`n.Preceding`、`n.Following`。

sqala内置支持的窗口函数有：

|     函数           |      对应的SQL函数      |
|:-----------------:|:-----------------------:|
|`rank()`           |`RANK()`                 |
|`denseRank()`      |`DENSE_RANK()`           |
|`percentRank()`    |`PERCENT_RANK()`         |
|`cumeDist()`       |`CUME_DIST()`            |
|`rowNumber()`      |`ROW_NUMBER()`           |
|`ntile(n)`         |`NTILE(n)`               |
|`firstValue(a)`    |`FIRST_VALUE(a)`         |
|`lastValue(a)`     |`LAST_VALUE(a)`          |
|`nthValue(a, n)`   |`NTH_VALUE(a, n)`        |
|`lag(a)`           |`LAG(a)`                 |
|`lag(a, n)`        |`LAG(a, n)`              |
|`lag(a, n, d)`     |`LAG(a, n, d)`           |
|`lead(a)`          |`LEAD(a)`                |
|`lead(a, n)`       |`LEAD(a, n)`             |
|`lead(a, n, d)`    |`LEAD(a, n, d)`          |