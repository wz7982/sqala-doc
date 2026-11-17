# Time Operations

sqala supports the common time operations from the SQL standard.

## Time Intervals

`Int` type values, combined with extension methods such as `year`, create time interval expressions, corresponding to SQL's `INTERVAL` expression. You can then use the `+` and `-` operators to calculate between a time-typed field and a time interval, returning a new time expression:

```scala
// Query posts created within the last seven days
val query =
    from(Post)
        .filter(p => p.createTime >= currentTime() - 1.year)
```

The time units supported by sqala are: `year`, `month`, `day`, `hour`, `minute`, and `second`.

The measured support for time intervals in the latest versions of each major database is as follows:

| Database Type | INTERVAL Support |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
| SQLServer | ❌ |
| SQLite | ❌ |

## Extracting Time

Time-typed expressions, combined with extension methods such as `year`, extract a time unit from a time field, corresponding to SQL's `EXTRACT` expression, and return a numeric type:

```scala
val query =
    from(Post).map(p => p.createTime.year)
```

The result of subtracting two times (which returns a time interval) can also be used to extract a time unit from it:

```scala
val query =
    from(Post).map(p => (currentTimestamp() - p.createTime).year)
```

The measured support for extracting time in the latest versions of each major database is as follows:

| Database Type | EXTRACT Support |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
| SQLServer | ❌ |
| SQLite | ❌ |

## Time Overlap

For a pair of two times, the `overlaps` method determines whether they overlap, corresponding to SQL's `OVERLAPS` operator:

```scala
val query =
    from(Entity).filter(e => (e.d1, e.d2).overlaps(e.d3, e.d4))
```

The measured support for time overlap in the latest versions of each major database is as follows:

| Database Type | EXTRACT Support |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ❌ |
| Oracle | ❌ |
| SQLServer | ❌ |
| SQLite | ❌ |

## Time Data Types

sqala uses the time types under `java.time.*` as built-in time types by default. The rules for generating SQL from values of each time type are as follows:

| Time Type | PostgreSQL | MySQL | Oracle | SQLServer | SQLite |
|----------|------------|-------|--------|-----------|--------|
| `LocalDate` | `DATE '2020-01-01'` | `DATE '2020-01-01'` | `TO_DATE('2020-01-01', 'YYYY-MM-DD')` | `CAST('2020-01-01 00:00:00.123456789' AS DATE)` | ❌ |
| `LocalDateTime` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TO_TIMESTAMP('2020-01-01 00:00:00.123456789', 'YYYY-MM-DD HH24:MI:SS.FF9')` | `CAST('2020-01-01 00:00:00.123456789' AS DATETIME2)` | ❌ |
| `LocalTime` | `TIME '00:00:00'` | `TIME '00:00:00'` | ❌ | ❌ | ❌ |
| `OffsetDateTime` | `TIMESTAMP WITH TIME ZONE '2020-01-01 00:00:00.123456789 +08:00'` | ❌ | `TO_TIMESTAMP_TZ('2020-01-01 00:00:00.123456789 +08:00', 'YYYY-MM-DD HH24:MI:SS.FF9 TZH:TZM')` | `CAST('2020-01-01 00:00:00.123456789 +08:00' AS DATETIMEOFFSET)` | ❌ |
| `OffsetTime` | `TIME WITH TIME ZONE '00:00:00 +08:00'` | ❌ | ❌ | ❌ | ❌ |
