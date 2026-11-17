# 行模式识别

> 本页功能属于 `sqala-static-ext` 模块，需要额外引入该模块，并导入：
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


`MATCH_RECOGNIZE`是SQL 2016标准中推出的强大数据分析功能，用于复杂事件处理。它可以匹配一个连续事件，并计算结果，但目前主流关系型数据库中只有Oracle支持此功能，而PostgreSQL数据库将会在后续版本推出此功能。

sqala选择先基于SQL标准做功能实现，待您的数据库支持此功能后便可以无缝接入，而无需等待查询库跟进。

我们假设有这样一个需求：“查询股票连续下跌之后连续上涨的V型曲线数据”，首先创建这样一个实体类：

```scala
case class StockPrice(
    stockSymbol: String,
    tradeTime: LocalDateTime,
    price: BigDecimal
)
```

数据表的`matchRecognize`方法用于创建模式识别：

```scala
val query =
    from:
        StockPrice.matchRecognize(s =>
            // 分组和排序，类似窗口函数
            s.partitionBy(s.stockSymbol)
                .sortBy(s.tradeTime)
                // 行匹配模式 支持oneRowPerMatch和allRowsPerMatch
                .oneRowPerMatch
                // 预定义标签，使用字符串字面量创建，后续为模式生成对应名称的字段
                .predefine("start", "down", "bottom", "up")
                // 标签的定义，参数是命名元组，名称需要与预定义中对应
                .define(d =>
                    (
                        start = true,
                        // prev方法引用上一个匹配到的值，支持导航函数prev、next、first、last
                        down = d.down.price < prev(d.down.price),
                        bottom = d.bottom.price < prev(d.bottom.price) && next(d.bottom.price) > d.bottom.price,
                        up = d.up.price > prev(d.up.price)
                    )
                )
                // 从某个模式变量之后继续匹配
                // 支持afterMatchSkipToNextRow、afterMatchSkipPastLastRow、afterMatchSkipToFirst、afterMatchSkipToLast、afterMatchSkipTo(p)
                .afterMatchSkipTo(d => d.up)
                // 定义模式，SQL中使用空格连接两个模式，sqala使用~，匹配或使用|
                // permute(p1, p2, p3) 对应PERMUTE(p1, p2, p3)
                // exclusion(p) 对应{- p -}
                // 量词支持+ * ?
                // least(n) 对应{n,}
                // most(n) 对应{,n}
                // between(m, n) 对应{m, n}
                // at(n) 对应{n}
                .pattern(d => d.start ~ d.down.+ ~ d.bottom ~ d.up.+)
                // 定义度量，即MATCH_RECOGNIZE表最后返回的字段，使用命名元组
                .measures(d =>
                    (
                        startTime = d.start.tradeTime,
                        bottomTime = d.bottom.tradeTime,
                        // 支持RUNNING和FINAL获取模式
                        endTime = finalized(last(d.up.tradeTime)),
                        // 获取匹配到的编号使用matchNumber方法
                        matchNum = matchNumber(),
                        // 获取匹配到的标签名称使用classifier方法
                        matchVar = classifier()
                    )
                )
        )
```

`define`、`pattern`、`measures`中的`d.xxx`只能使用`predefine`中声明的名字，拼写错误会直接编译错误；`define`返回的命名元组也必须和`predefine`的名字一致。

生成的SQL为：

```sql
SELECT
    "t2"."c1" AS "c1",
    "t2"."c2" AS "c2",
    "t2"."c3" AS "c3",
    "t2"."c4" AS "c4",
    "t2"."c5" AS "c5"
FROM
    "stock_price" AS "t1"
    MATCH_RECOGNIZE(
        PARTITION BY
            "stock_symbol"
        ORDER BY
            "trade_time" ASC
        MEASURES
            "start"."trade_time" AS "c1",
            "bottom"."trade_time" AS "c2",
            FINAL LAST("up"."trade_time") AS "c3",
            MATCH_NUMBER() AS "c4",
            CLASSIFIER() AS "c5"
        ONE ROW PER MATCH
        AFTER MATCH SKIP TO "up"
        PATTERN ("start" "down"+ "bottom" "up"+)
        DEFINE
            "start" AS TRUE,
            "down" AS "down"."price" < PREV("down"."price"),
            "bottom" AS "bottom"."price" < PREV("bottom"."price") AND NEXT("bottom"."price") > "bottom"."price",
            "up" AS "up"."price" > PREV("up"."price")
    ) AS "t2"
```

## 语义检查

`matchRecognize` 的各个子句也有编译期语义检查：

```scala
val query =
    // 编译错误：Only columns of the source table can be used in matchRecognize partitionBy.
    from(Post).matchRecognize(s => s.partitionBy(count()))

val q2 =
    from(Post).matchRecognize(s =>
        s.partitionBy(s.id)
            // 编译错误：Only columns of the source table can be used in matchRecognize sortBy.
            .sortBy(count())
    )
```

`define`中只能使用模式变量和作用于它们的聚合函数，否则会报 `Only pattern variables and aggregate functions over them can be used in matchRecognize define.`；`measures`中的表达式同理，错误文案为 `Measures expressions accept pattern variables and aggregate functions over them.`。
