# Grouping Queries

The grouping `GROUP BY` operation is an indispensable feature in data statistics, and sqala provides in-depth support for grouping queries.

## Simple Grouping

Grouping operations are usually used together with [aggregate functions](./expr-agg.md). In sqala, use the `groupBy` method to create a group. For example, we need to count the number of posts in each channel:

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

In `sortBy`/`having`/`map` after grouping, there is an additional parameter, which represents the current grouping set (if the grouping follows a join of two tables, there are three parameters, and so on).

Use tuples or named tuples to support multiple grouping [expressions](./expr.md):

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

Note that most databases do not allow non-grouped expressions in operations after grouping, so the following SQL is wrong:

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

sqala also generates a compile error for such queries:

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        // Compile error: Ungrouped column references must appear in the groupBy clause or be used in an aggregate function.
        .map((g, p) => (g, p.title, count()))
```

If we only want to return an arbitrary `title` field value within a group, we can use the `ANY_VALUE` aggregate function, which corresponds to the `anyValue` method in sqala:

```scala
val query =
    from(Post)
        .groupBy(p => p.channelId)
        .map((g, p) => (g, anyValue(p.title), count()))
```

## Filtering After Grouping

The `having` method is used to filter data after grouping, and is used similarly to `filter`:

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

Besides simple grouping, sqala supports multi-dimensional grouping operations.

### CUBE Grouping

SQL's `GROUP BY CUBE(a, b, c)` generates every combination in the grouping, that is, `CUBE (a, b, c)` is equivalent to merging the following groupings:

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

`CUBE` grouping is very useful when building data cubes. Since sqala claims to support "more than simple CRUD", it naturally also supports `CUBE` grouping.

We use a population table to count people by three dimensions: "age group", "ethnicity", and "gender". Age groups are segmented as "under 30 is youth, 30-60 is middle-aged, over 60 is elderly".

We use `groupBySets` together with the `cube` method to create `CUBE` grouping:

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

As you can see, using named tuples for grouping greatly simplifies the code.

Note that even if the data has no nullable fields, `CUBE` still generates null values that do not originally exist. This is determined by the semantics of `CUBE`, so sqala infers the query result as:

```scala
// Return type is List[(age: Option[String], nation: Option[String], gender: Option[String], count: Long)]
val result = db.fetch(query)
```

### GROUPING Expression

Since multi-dimensional grouping sets produce extra null values, how do we distinguish "whether a null value comes from the original data or is produced extra by multi-dimensional grouping"? For this purpose, SQL introduced the accompanying `GROUPING` expression. A `GROUPING` result of 1 means the null value was produced extra by grouping, and a result of 0 means the null value already existed in the original data. In sqala, we use the `grouping` method to create this expression:

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
        CASE WHEN CASE WHEN "t1"."age" <= 30 THEN 'Youth' WHEN "t1"."age" <= 60 AND "t1"."age" > 30 THEN 'Middle-aged' ELSE 'Elderly' END,
        "t1"."nation",
        "t1"."gender"
    )
```

### ROLLUP Grouping

SQL's `GROUP BY ROLLUP(a, b, c)` generates hierarchical groupings, that is, `ROLLUP (a, b, c)` is equivalent to merging the following groupings:

|   Grouping   |
|:--------:|
|No grouping     |
|`a`       |
|`a, b`    |
|`a, b, c` |

4 cases in total (n + 1).

In sqala, `ROLLUP` grouping is created similarly to `CUBE`, just replace `cube` with `rollup`; no further details are needed.

### GROUPING SETS Grouping

SQL's `GROUP BY GROUPING SETS` grouping produces grouping results according to the specified grouping sets. For example, if we want to achieve an effect similar to `ROLLUP`, we need to write:

`GROUP BY GROUPING SETS((), a, (a, b), (a, b, c))`. `groupBySets` works with the `groupingSets` method, passing the nested tuple of groups produced by those grouping sets; an empty grouping set is specified with the `Unit` literal `()`:

```scala
val query =
    from(Entity)
        .groupBySets(e => (a = e.a, b = e.b, c = e.c))(g => groupingSets((), g.a, (g.a, g.b), (g.a, g.b, g.c)))
        .map((g, e) => (g.a, g.b, g.c, count()))
```

### Compatibility

The measured support of multi-dimensional grouping in the latest versions of major databases is as follows:

| Method | PostgreSQL | MySQL | Oracle | SQLServer | SQLite |
|------|------------|-------|--------|-----------|--------|
| `cube` | ✅ | ❌ | ✅ | ✅ | ❌ |
| `rollup` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `groupingSets` | ✅ | ❌ | ✅ | ✅ | ❌ |
