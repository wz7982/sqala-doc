# Window Functions

Window functions are an advanced analysis feature provided by SQL. They add an `OVER` clause to [aggregate functions](./expr-agg.md) or dedicated analytic functions to create window functions.

sqala provides the `over` method to create a window. Its parameters are the window's partitioning rule, ordering rule, and window frame.

Use the `partitionBy` method to create the window's partitioning rule, together with `over`:

```scala
val query =
    from(Post)
        .map(p => sum(p.likeCount).over(partitionBy(p.authorId)))
```

After `partitionBy`, you can use the `sortBy` method to create the window's ordering rule:

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

`over` also supports window frames. The parameters of `range`, `rows`, and `groups` are a single bound, while the parameters of `rangeBetween`, `rowsBetween`, and `groupsBetween` are two bounds:

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

The supported bounds are `currentRow`, `unboundedPreceding`, `unboundedFollowing`, `n.preceding`, and `n.following`.

You can use `excludeCurrentRow`, `excludeTies`, and `excludeGroup` to exclude specific rows from the group:

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

The window functions included in sqala are:

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

`over` can only be used on aggregate functions or window functions; otherwise a compile error is returned:

```scala
val query =
    // Compile error: Over specified, but this expression is not a window function nor an aggregate function.
    from(Post).map(p => p.id.over())
```

Window functions cannot be nested, and the error message is `Window function calls cannot be nested.`

The start and end bounds of a window frame must be in order, that is, `unboundedPreceding` < `n.preceding` < `currentRow` < `n.following` < `unboundedFollowing`, and the start bound must be strictly before the end bound. `rows`, `range`, and `groups` only accept a start bound, with the end bound fixed to `currentRow`, so the start bound cannot be `currentRow` or `unboundedFollowing`:

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

The bound values of `rows` and `groups` must be integers, while the bound type of `range` must be compatible with the window's ordering key (a numeric ordering key corresponds to a numeric bound, and a time ordering key corresponds to an `INTERVAL` bound); otherwise a compile error is returned:

```scala
val q3 =
    from(Post).map: p =>
        // Compile error: Window frame type is incompatible with the ordering expression.
        sum(p.likeCount).over(
            partitionBy(p.authorId).sortBy(p.title).rangeBetween(1.preceding, currentRow)
        )
```
