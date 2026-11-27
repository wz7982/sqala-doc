# 时间操作

sqala支持SQL标准中常用的时间操作。

## 时间间隔

`Int`类型的值配合`year`等扩展方法可以创建时间间隔表达式，对应SQL的`INTERVAL`表达式。之后即可使用`+`、`-`对时间类型字段和时间间隔进行运算，返回新的时间表达式：

```scala
// 查询发帖时间在七天内的帖子
val query =
    from(Post)
        .filter(p => p.createTime >= currentTimestamp() - 7.day)
```

sqala支持的时间单位有：`year`、`month`、`day`、`hour`、`minute`、`second`。

时间间隔在各大主流数据库最新版本的实测支持情况如下：

| 数据库类型 | INTERVAL 支持 |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |

## 抽取时间

时间类型表达式配合`year`等扩展方法可抽取时间字段中的某个时间单位，对应SQL的`EXTRACT`表达式，返回数值类型：

```scala
val query =
    from(Post).map(p => p.createTime.year)
```

两个时间相减的结果（时间间隔）同样可以抽取其中的时间单位：

```scala
val query =
    from(Post).map(p => (currentTimestamp() - p.createTime).year)
```

抽取时间单位在各大主流数据库最新版本的实测支持情况如下：

| 数据库类型 | EXTRACT 支持 |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |

## 时间重叠

`overlaps`方法用于判断两组起止时间是否重叠，对应SQL的`OVERLAPS`运算符。注意`overlaps`接收的是**一个**元组参数，而不是两个独立参数：

```scala
val query =
    from(Entity).filter(e => (e.d1, e.d2).overlaps((e.d3, e.d4)))
```

时间重叠在各大主流数据库最新版本的实测支持情况如下：

| 数据库类型 | OVERLAPS 支持 |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ❌ |
| Oracle | ❌ |

## 时间数据类型

sqala默认使用`java.time.*`下的时间类型作为内置时间类型。文本SQL中时间字面量的格式如下：

| 时间类型 | PostgreSQL | MySQL | Oracle |
| ---------- | ------------ | ------- | -------- |
| `LocalDate` | `DATE '2020-01-01'` | `DATE '2020-01-01'` | `TO_DATE('2020-01-01', 'YYYY-MM-DD')` |
| `LocalDateTime` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TIMESTAMP '2020-01-01 00:00:00.123456789'` | `TO_TIMESTAMP('2020-01-01 00:00:00.123456789', 'YYYY-MM-DD HH24:MI:SS.FF9')` |
| `LocalTime` | `TIME '00:00:00.123456789'` | `TIME '00:00:00.123456789'` | ❌ |
| `OffsetDateTime` | `TIMESTAMP WITH TIME ZONE '2020-01-01 00:00:00.123456789 +08:00'` | ❌ | `TO_TIMESTAMP_TZ('2020-01-01 00:00:00.123456789 +08:00', 'YYYY-MM-DD HH24:MI:SS.FF9 TZH:TZM')` |
| `OffsetTime` | `TIME WITH TIME ZONE '00:00:00.123456789 +08:00'` | ❌ | ❌ |

通过JDBC执行时，PostgreSQL和MySQL不会将这些值内联为字面量，而是生成`?`占位符，并通过`PreparedStatement.setObject`绑定对应的`java.time`值。Oracle仍使用`TO_DATE`、`TO_TIMESTAMP`、`TO_TIMESTAMP_TZ`绑定格式化后的字符串。

sqala不处理秒级时区偏移（例如`+08:00:30`）。`OffsetDateTime`和`OffsetTime`格式化时只保留到分钟，Oracle的`TZH:TZM`本身也不支持秒级偏移。截断偏移可能改变精确的时间点；若时间点必须保持不变，请先转换为UTC。如果业务需要保留秒级时区偏移，请在传入sqala前手动归一化，例如先转换为UTC，或按业务规则截断到分钟。

`OffsetDateTime`和`OffsetTime`都提供了`withOffsetSameInstant`，可在保持时间点不变的前提下将偏移量归一化到分钟或UTC：

```scala
val input = OffsetDateTime.of(
    2024, 1, 2, 3, 4, 5, 123456789,
    ZoneOffset.ofHoursMinutesSeconds(9, 7, 6)
)

// 保持时间点不变，偏移量归一化到分钟
val normalized = input.withOffsetSameInstant(ZoneOffset.ofHoursMinutes(9, 7))
// 2024-01-02T03:03:59.123456789+09:07

// 或直接归一化到UTC
val utc = input.withOffsetSameInstant(ZoneOffset.UTC)
// 2024-01-01T17:56:59.123456789Z
```

注意不要使用`withOffsetSameLocal`进行此类归一化：它只修改偏移量、不调整本地时间，会改变实际时间点。
