# Row Pattern Recognition

> The features on this page belong to the `sqala-static-ext` module, which requires an additional dependency. Import:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


`MATCH_RECOGNIZE` is a powerful data analysis feature introduced in the SQL 2016 standard for complex event processing. It can match a sequence of consecutive events and compute a result. However, among mainstream relational databases only Oracle currently supports this feature, and PostgreSQL is expected to introduce it in a later version.

sqala chooses to implement the feature based on the SQL standard first, so that once your database supports it you can adopt it seamlessly, without waiting for the query library to catch up.

Suppose we have this requirement: "query the V-shaped curve data of a stock falling continuously and then rising continuously". First, create an entity class like this:

```scala
case class StockPrice(
    stockSymbol: String,
    tradeTime: LocalDateTime,
    price: BigDecimal
)
```

The `matchRecognize` method of the table is used to create pattern recognition:

```scala
val query =
    from:
        StockPrice.matchRecognize(s =>
            // Partitioning and sorting, similar to window functions
            s.partitionBy(s.stockSymbol)
                .sortBy(s.tradeTime)
                // Row matching mode; supports oneRowPerMatch and allRowsPerMatch
                .oneRowPerMatch
                // Predefined labels, created with string literals; fields with the corresponding names are generated for the pattern later
                .predefine("start", "down", "bottom", "up")
                // Label definitions; the argument is a named tuple whose names must match the predefined ones
                .define(d =>
                    (
                        start = true,
                        // The prev method references the previously matched value; the supported navigation functions are prev, next, first, and last
                        down = d.down.price < prev(d.down.price),
                        bottom = d.bottom.price < prev(d.bottom.price) && next(d.bottom.price) > d.bottom.price,
                        up = d.up.price > prev(d.up.price)
                    )
                )
                // Resume matching after a pattern variable
                // Supports afterMatchSkipToNextRow, afterMatchSkipPastLastRow, afterMatchSkipToFirst, afterMatchSkipToLast, afterMatchSkipTo(p)
                .afterMatchSkipTo(d => d.up)
                // Define the pattern; SQL joins two patterns with a space, sqala uses ~, and alternation uses |
                // permute(p1, p2, p3) corresponds to PERMUTE(p1, p2, p3)
                // exclusion(p) corresponds to {- p -}
                // Quantifiers support + * ?
                // least(n) corresponds to {n,}
                // most(n) corresponds to {,n}
                // between(m, n) corresponds to {m, n}
                // at(n) corresponds to {n}
                .pattern(d => d.start ~ d.down.+ ~ d.bottom ~ d.up.+)
                // Define the measures, that is, the fields finally returned by the MATCH_RECOGNIZE table, using a named tuple
                .measures(d =>
                    (
                        startTime = d.start.tradeTime,
                        bottomTime = d.bottom.tradeTime,
                        // Supports RUNNING and FINAL modes
                        endTime = finalized(last(d.up.tradeTime)),
                        // Use the matchNumber method to get the match number
                        matchNum = matchNumber(),
                        // Use the classifier method to get the matched label name
                        matchVar = classifier()
                    )
                )
        )
```

`d.xxx` in `define`, `pattern`, and `measures` can only use the names declared in `predefine`; a typo causes a compile error immediately. The named tuple returned by `define` must also match the names in `predefine`.

The generated SQL is:

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

## Semantic Checks

Each clause of `matchRecognize` also has compile-time semantic checks:

```scala
val query =
    // Compile error: Only columns of the source table can be used in matchRecognize partitionBy.
    from(Post).matchRecognize(s => s.partitionBy(count()))

val q2 =
    from(Post).matchRecognize(s =>
        s.partitionBy(s.id)
            // Compile error: Only columns of the source table can be used in matchRecognize sortBy.
            .sortBy(count())
    )
```

`define` can only use pattern variables and aggregate functions over them; otherwise you get `Only pattern variables and aggregate functions over them can be used in matchRecognize define.`. The same applies to expressions in `measures`, with the error message `Measures expressions accept pattern variables and aggregate functions over them.`.
