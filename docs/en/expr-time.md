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

## Time Overlap

For a pair of two times, the `overlaps` method determines whether they overlap, corresponding to SQL's `OVERLAPS` operator:

```scala
val query =
    from(Entity).filter(e => (e.d1, e.d2).overlaps(e.d3, e.d4))
```

The measured support for time overlap in the latest versions of each major database is as follows:

| Database Type | OVERLAPS Support |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ❌ |
| Oracle | ❌ |

## Time Data Types

sqala uses the time types under `java.time.*` as built-in time types by default. The text SQL literal formats are as follows:

| Time Type | PostgreSQL | MySQL | Oracle |
| ---------- | ------------ | ------- | -------- |
| `LocalDate` | `DATE '2020-01-01'` | `DATE '2020-01-01'` | `TO_DATE('2020-01-01', 'YYYY-MM-DD')` |
| `LocalDateTime` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TO_TIMESTAMP('2020-01-01 00:00:00.123456789', 'YYYY-MM-DD HH24:MI:SS.FF9')` |
| `LocalTime` | `TIME '00:00:00.123456789'` | `TIME '00:00:00.123456789'` | ❌ |
| `OffsetDateTime` | `TIMESTAMP WITH TIME ZONE '2020-01-01 00:00:00.123456789 +08:00'` | ❌ | `TO_TIMESTAMP_TZ('2020-01-01 00:00:00.123456789 +08:00', 'YYYY-MM-DD HH24:MI:SS.FF9 TZH:TZM')` |
| `OffsetTime` | `TIME WITH TIME ZONE '00:00:00.123456789 +08:00'` | ❌ | ❌ |

When executed through JDBC, PostgreSQL and MySQL do not inline these values. They emit a `?` placeholder and bind the corresponding `java.time` value with `PreparedStatement.setObject`. Oracle still uses `TO_DATE`, `TO_TIMESTAMP`, and `TO_TIMESTAMP_TZ` with the formatted string.

sqala does not handle second-level time zone offsets (for example `+08:00:30`) at all. `OffsetDateTime` and `OffsetTime` values are formatted with minute precision, and Oracle's `TZH:TZM` cannot represent second-level offsets either. Truncating the offset can change the exact instant, so convert to UTC first if the instant must be preserved. If your application needs to preserve second-level offsets, normalize them manually before passing them to sqala, for example by converting to UTC or truncating them to minutes according to your business rules.

Both `OffsetDateTime` and `OffsetTime` provide `withOffsetSameInstant`, which normalizes the offset to minutes or UTC while preserving the instant:

```scala
val input = OffsetDateTime.of(
    2024, 1, 2, 3, 4, 5, 123456789,
    ZoneOffset.ofHoursMinutesSeconds(9, 7, 6)
)

// Preserve the instant and normalize the offset to minutes
val normalized = input.withOffsetSameInstant(ZoneOffset.ofHoursMinutes(9, 7))
// 2024-01-02T03:03:59.123456789+09:07

// Or normalize directly to UTC
val utc = input.withOffsetSameInstant(ZoneOffset.UTC)
// 2024-01-01T17:56:59.123456789Z
```

Do not use `withOffsetSameLocal` for this purpose: it changes the offset without adjusting the local time, which changes the actual instant.
