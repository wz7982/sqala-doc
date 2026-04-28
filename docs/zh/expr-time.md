# 时间操作

sqala支持SQL标准中常用的时间操作。

## 时间间隔

`Int`类型值配合`year`等扩展方法，创建时间间隔表达式，对应SQL的`INTERVAL`表达式，然后我们可以用`+`、`-`操作将时间类型字段和时间间隔计算，返回一个新的时间表达式：

```scala
// 查询发帖时间在七天内的帖子
val q = query:
    from(Post)
        .filter(p => p.createTime >= currentTime() - 1.year)
```

sqala支持的时间单位有：`year`, `month`, `day`, `hour`, `minute`, `second`。

## 抽取时间

时间类型表达式配合`year`等扩展方法用于抽取时间字段中的一个时间单位，返回数值类型：

```scala
val q = query:
    from(Post).map(p => p.createTime.year)
```

对于两个时间相减的结果（返回时间间隔），也可以用于抽取其中的时间单位：

```scala
val q = query:
    from(Post).map(p => (currentTimestamp() - p.createTime).year)
```

## 时间重叠

对于两个时间的二元组，`overlaps`方法判断是否有重叠，对应SQL的`OVERLAPS`运算符：

```scala
val q = query:
    from(Entity).filter(e => (e.d1, e.d2).overlaps(e.d3, e.d4))
```

## 时间数据类型

sqala默认使用`java.time.*`下面的时间类型作为内置时间类型，各时间类型的值在生成SQL时规则如下：

| 时间类型 | PostgreSQL | MySQL | Oracle | SQLServer | SQLite |
|----------|------------|-------|--------|-----------|--------|
| `LocalDate` | `DATE '2020-01-01'` | `DATE '2020-01-01'` | `TO_DATE('2020-01-01', 'YYYY-MM-DD')` | `CAST('2020-01-01 00:00:00.123456789' AS DATE)` | `DATE('2020-01-01')` |
| `LocalDateTime` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TO_TIMESTAMP('2020-01-01 00:00:00.123456789', 'YYYY-MM-DD HH24:MI:SS.FF9')` | `CAST('2020-01-01 00:00:00.123456789' AS DATETIME2)` | `DATETIME('2020-01-01 00:00:00.123456789')` |
| `LocalTime` | `TIME '00:00:00'` | `TIME '00:00:00'` | ❌ | ❌ | ❌ |
| `OffsetDateTime` | `TIMESTAMP WITH TIME ZONE '2020-01-01 00:00:00.123456789 +08:00'` | ❌ | `TO_TIMESTAMP_TZ('2020-01-01 00:00:00.123456789 +08:00', 'YYYY-MM-DD HH24:MI:SS.FF9 TZH:TZM')` | `CAST('2020-01-01 00:00:00.123456789 +08:00' AS DATETIMEOFFSET)` | ❌ |
| `OffsetTime` | `TIME WITH TIME ZONE '00:00:00 +08:00'` | ❌ | ❌ | ❌ | ❌ |