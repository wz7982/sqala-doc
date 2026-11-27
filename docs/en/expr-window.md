# Window Functions

Window functions are an advanced analytical feature of SQL: they are created by adding an `OVER` clause to an [aggregate function](./expr-agg.md) or a dedicated analytic function.

sqala provides the `over` method to create a window, which takes the window's partitioning rule, ordering rule, and window frame as parameters.

Use the `partitionBy` method to define the window's partitioning rule, in combination with `over`:

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(partitionBy(p.authorId)))
```

After `partitionBy`, use the `sortBy` method to define the window's ordering rule:

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(partitionBy(p.authorId).sortBy(p.id.desc)))
```

`over` can also be used without `partitionBy`:

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(sortBy(p.id.desc)))
```

Calling `over()` with no arguments declares an empty window (with neither partitioning nor ordering), commonly used with functions such as `rowNumber()`:

```scala
val query =
    from(Post)
        .map(p => (p.title, rowNumber().over()))
```

`over` also supports window frames: `range`, `rows`, and `groups` take a single bound, while `rangeBetween`, `rowsBetween`, and `groupsBetween` take two bounds. `rows` can be applied directly to a window without an ordering key, whereas `range` and `groups` depend on the ordering key and can only be called after `sortBy`:

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

Or

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

The supported bounds are `currentRow`, `unboundedPreceding`, `unboundedFollowing`, `n.preceding`, and `n.following`. For `n.preceding` and `n.following`, `n` must be a literal constant; a column reference cannot be used as a bound.

You can use `excludeCurrentRow`, `excludeTies`, and `excludeGroup` to exclude specific rows from the window frame:

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

sqala includes the following built-in window functions:

| Function                                   | Corresponding SQL Function                           |
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

## Semantic Checks

`over` can only be used on aggregate functions or window functions; otherwise, a compile error occurs:

```scala
val query =
    // Compile error: Over specified, but this expression is not a window function nor an aggregate function.
    from(Post).map(p => p.id.over())
```

Window functions cannot be nested, and the error message is `Window function calls cannot be nested.`

The start and end bounds of a window frame must be ordered, that is, `unboundedPreceding` < `n.preceding` < `currentRow` < `n.following` < `unboundedFollowing`; the start bound must not come after the end bound (they may be equal — `rowsBetween(currentRow, currentRow)` is legal). `rows`, `range`, and `groups` accept only a start bound, with the end bound fixed to `currentRow`, so the start bound cannot be `n.following` or `unboundedFollowing`:

```scala
val q1 =
    from(Post).map: p =>
        // Compile error: Frame starting from current row cannot end at preceding row.
        sum(p.likeCount).over(
            partitionBy(p.authorId).sortBy(p.id.desc).rowsBetween(currentRow, 1.preceding)
        )

val q2 =
    from(Post).map: p =>
        // Compile error: Frame starting from unbounded following cannot end at current row.
        sum(p.likeCount).over(
            partitionBy(p.authorId).sortBy(p.id.desc).rows(unboundedFollowing)
        )
```

The bound values of `rows` and `groups` must be integers, while the bound type of `range` must be compatible with the window's ordering key (a numeric ordering key corresponds to a numeric bound, and a time ordering key corresponds to an `INTERVAL` bound); otherwise, a compile error occurs:

```scala
val q3 =
    from(Post).map: p =>
        // Compile error: Window frame type is incompatible with the ordering expression.
        sum(p.likeCount).over(
            partitionBy(p.authorId).sortBy(p.title).rangeBetween(1.preceding, currentRow)
        )
```
