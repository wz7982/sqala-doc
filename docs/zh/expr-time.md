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