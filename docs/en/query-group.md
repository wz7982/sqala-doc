# Grouping Queries

The `GROUP BY` grouping operation is indispensable in data statistics, and sqala provides in-depth support for grouping queries.

## Simple Grouping

Grouping is usually used together with [aggregate functions](./expr-agg.md). In sqala, use the `groupBy` method to create a grouping. For example, to count the number of posts in each channel:

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        .map((g, p) => (g, count()))
```

The generated SQL is:

```sql
SELECT
    "t1"."channel_id" AS "c1",
    COUNT(*) AS "c2"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id"
```

After grouping, `sortBy`/`having`/`map` each take an additional parameter representing the current grouping set (if the grouping follows a join of two tables, there are three parameters, and so on).

Tuples or named tuples can be used to group by multiple [expressions](./expr.md):

```scala
val query =
    from(Post)
        .groupBy(p => (cid = p.channelId, title = p.title))
        .map((g, p) => (g.cid, g.title, count()))
```

The generated SQL is:

```sql
SELECT
    "t1"."channel_id" AS "c1",
    "t1"."title" AS "c2",
    COUNT(*) AS "c3"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id",
    "t1"."title"
```

Note that most databases do not allow non-grouped expressions in operations after grouping, so the following SQL is invalid:

```sql
SELECT
    "t1"."channel_id" AS "c1",
    "t1"."title" AS "c2",
    COUNT(*) AS "c3"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id"
```

sqala also reports a compile error for such queries:

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        // Compile error: Ungrouped column references must appear in the groupBy clause or be used in an aggregate function.
        .map((g, p) => (g, p.title, count()))
```

To return an arbitrary `title` field value within a group, use the `ANY_VALUE` aggregate function, which corresponds to the `anyValue` method in sqala:

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        .map((g, p) => (g, anyValue(p.title), count()))
```

## Filtering After Grouping

The `having` method filters data after grouping, and is used similarly to `filter`:

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        .having((g, p) => count() > 1)
        .map((g, p) => (g, count()))
```

The generated SQL is:

```sql
SELECT
    "t1"."channel_id" AS "c1",
    COUNT(*) AS "c2"
FROM
    "post" AS "t1"
GROUP BY
    "t1"."channel_id"
HAVING
    COUNT(*) > 1
```

### Semantic Checks

Expressions in `groupBy` and `having` are also checked at compile time:

```scala
val q1 =
    // Compile error: Aggregate functions are not allowed in groupBy.
    from(Post).groupBy(p => count())

val q2 =
    // Compile error: Window functions are not allowed in groupBy.
    from(Post).groupBy(p => rowNumber().over())

val q3 =
    from(Post)
        .groupBy(p => p.channelId)
        // Compile error: Window functions are not allowed in having.
        .having((g, p) => rowNumber().over() > 1)

val q4 =
    from(Post)
        .groupBy(p => p.channelId)
        // Compile error: Ungrouped column references must appear in the groupBy clause or be used in an aggregate function.
        .having((g, p) => p.title === "x")
```

## Multi-Dimensional Grouping

In addition to simple grouping, sqala supports multi-dimensional grouping.

### CUBE Grouping

SQL's `GROUP BY CUBE(a, b, c)` generates every possible combination in the grouping; that is, `CUBE (a, b, c)` is equivalent to combining the following groupings:

|   Grouping   |
|:--------:|
|No grouping     |
|`a`       |
|`b`       |
|`c`       |
|`a, b`    |
|`a, c`    |
|`b, c`    |
|`a, b, c` |

8 cases in total (2 to the power of n).

`CUBE` grouping is very useful when building data cubes. Since sqala claims to support "more than simple CRUD", `CUBE` grouping is naturally supported as well.

Consider a population table, counting people by three dimensions: "age group", "ethnicity", and "gender". Age groups are segmented as follows: 30 and under is youth, 31-60 is middle-aged, and over 60 is elderly.

Use `groupBySets` together with the `cube` method to create `CUBE` grouping:

```scala
case class Person(id: Int, age: Int, nation: String, gender: String)

val query =
    from(Person)
        .groupBySets(p =>
            (
                age = caseWhen(p.age <= 30)("Youth").when(p.age <= 60 && p.age > 30)("Middle-aged").otherwise("Elderly"),
                nation = p.nation,
                gender = p.gender
            )
        )(g =>
            cube(g.age, g.nation, g.gender)
        ).map: (g, p) =>
            (
                age = g.age,
                nation = g.nation,
                gender = g.gender,
                count = count()
            )
```

The generated SQL is:

```sql
SELECT
    CASE WHEN "t1"."age" <= 30 THEN 'Youth' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN 'Middle-aged' ELSE 'Elderly' END AS "c1",
    "t1"."nation" AS "c2",
    "t1"."gender" AS "c3",
    COUNT(*) AS "c4"
FROM
    "person" AS "t1"
GROUP BY
    CUBE(
        CASE WHEN "t1"."age" <= 30 THEN 'Youth' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN 'Middle-aged' ELSE 'Elderly' END,
        "t1"."nation",
        "t1"."gender"
    )
```

As shown, using named tuples for grouping greatly simplifies the code.

Note that even if the data contains no nullable fields, `CUBE` still produces null values that were not originally present, as dictated by `CUBE` semantics. Therefore, sqala infers the query result as:

```scala
// Return type is List[(age: Option[String], nation: Option[String], gender: Option[String], count: Long)]
val result = db.fetch(query)
```

### GROUPING Expression

Since multi-dimensional grouping sets introduce extra null values, how can we tell whether a null value already existed in the original data or was produced by the grouping itself? For this purpose, SQL provides the accompanying `GROUPING` expression: a result of 1 means the null value was introduced by grouping, while a result of 0 means it already existed in the original data. In sqala, use the `grouping` method to create this expression:

```scala
val query =
    from(Person)
        .groupBySets(p =>
            (
                age = caseWhen(p.age <= 30)("Youth").when(p.age <= 60 && p.age > 30)("Middle-aged").otherwise("Elderly"),
                nation = p.nation,
                gender = p.gender
            )
        )(g =>
            cube(g.age, g.nation, g.gender)
        ).map: (g, p) =>
            (
                age = g.age,
                groupingAge = grouping(g.age),
                nation = g.nation,
                groupingNation = grouping(g.nation),
                gender = g.gender,
                groupingGender = grouping(g.gender),
                count = count()
            )
```

The generated SQL is:

```sql
SELECT
    CASE WHEN "t1"."age" <= 30 THEN 'Youth' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN 'Middle-aged' ELSE 'Elderly' END AS "c1",
    GROUPING(CASE WHEN "t1"."age" <= 30 THEN 'Youth' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN 'Middle-aged' ELSE 'Elderly' END) AS "c2",
    "t1"."nation" AS "c3",
    GROUPING("t1"."nation") AS "c4",
    "t1"."gender" AS "c5",
    GROUPING("t1"."gender") AS "c6",
    COUNT(*) AS "c7"
FROM
    "person" AS "t1"
GROUP BY
    CUBE(
        CASE WHEN "t1"."age" <= 30 THEN 'Youth' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN 'Middle-aged' ELSE 'Elderly' END,
        "t1"."nation",
        "t1"."gender"
    )
```

### ROLLUP Grouping

SQL's `GROUP BY ROLLUP(a, b, c)` generates hierarchical groupings; that is, `ROLLUP (a, b, c)` is equivalent to combining the following groupings:

|   Grouping   |
|:--------:|
|No grouping     |
|`a`       |
|`a, b`    |
|`a, b, c` |

4 cases in total (n + 1).

In sqala, `ROLLUP` grouping is created the same way as `CUBE`: just replace `cube` with `rollup`, so no further details are given here.

### GROUPING SETS Grouping

SQL's `GROUP BY GROUPING SETS` produces grouping results according to the specified grouping sets. For example, to achieve an effect similar to `ROLLUP`, write:

`GROUP BY GROUPING SETS((), a, (a, b), (a, b, c))`. `groupBySets` is used together with the `groupingSets` method, passing the nested tuples of the groups produced by those grouping sets; an empty grouping set is specified with the `Unit` literal `()`:

```scala
val query =
    from(Entity)
        .groupBySets(e => (a = e.a, b = e.b, c = e.c))(g => groupingSets((), g.a, (g.a, g.b), (g.a, g.b, g.c)))
        .map((g, e) => (g.a, g.b, g.c, count()))
```

### Compatibility

The support for multi-dimensional grouping, as tested on the latest versions of major databases, is as follows:

| Method | PostgreSQL | MySQL | Oracle |
| ------ | ------------ | ------- | -------- |
| `cube` | ✅ | ❌ | ✅ |
| `rollup` | ✅ | ✅ | ✅ |
| `groupingSets` | ✅ | ❌ | ✅ |
