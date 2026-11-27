# 集合操作

集合操作同样是SQL中的常用操作，sqala对其提供了内置支持。

## 并集

SQL中`UNION`和`UNION ALL`代表并集操作：前者对两个查询的并集去重，相当于`UNION DISTINCT`，后者不去重。sqala中使用`union`和`unionAll`方法连接两个查询：

```scala
val q1 = from(User).filter(u => u.id === 1).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id === 2).map(u => (id = u.id, name = u.name))

val query = q1.unionAll(q2)
```

生成的SQL为：

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" = 1
)
UNION ALL
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" = 2
)
```

## 集合操作的类型推导

sqala会最大限度地兼容参与集合操作的两个查询的类型：要求字段数量完全一致，但不要求返回类型完全相同，只要在类型上兼容即可。

假如前一个查询行类型为`(Option[Int], String, Long)`，

后一个查询的行类型为`(Double, Option[String], Option[Int])`，

则返回类型会推导为`List[(Option[Double], Option[String], Option[Long])]`。

sqala在追求类型安全的同时，也尽力兼顾使用的便利性。

如果前一个查询返回命名元组、后一个查询返回元组，则结果会推导为命名元组：字段名以前一个查询为准，返回类型则由两个查询共同推导。

## 交集

SQL中`INTERSECT`和`INTERSECT ALL`代表交集操作。sqala中使用`intersect`和`intersectAll`方法连接两个查询：

```scala
val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))

val query = q1.intersectAll(q2)
```

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" >= 5
)
INTERSECT ALL
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" <= 10
)
```

## 差集

SQL中`EXCEPT`和`EXCEPT ALL`代表差集操作。sqala中使用`except`和`exceptAll`方法连接两个查询：

```scala
val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))

val query = q1.exceptAll(q2)
```

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" >= 5
)
EXCEPT ALL
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" <= 10
)
```

## 排序和分页

集合操作得到的查询同样支持`sortBy`、`drop`和`take`，它们作用在集合操作的整体结果上，而不是某个子查询上：

```scala
val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))

val query =
    q1.union(q2)
        .sortBy(c => (c.name.asc, c.id.desc))
        .drop(10)
        .take(5)
```

生成的SQL为：

```sql
(
    SELECT
        "t1"."id" AS "c1",
        "t1"."name" AS "c2"
    FROM
        "user" AS "t1"
    WHERE
        "t1"."id" >= 5
)
UNION
(
    SELECT
        "t2"."id" AS "c1",
        "t2"."name" AS "c2"
    FROM
        "user" AS "t2"
    WHERE
        "t2"."id" <= 10
)
ORDER BY
    "c2" ASC,
    "c1" DESC
LIMIT 5 OFFSET 10
```

`sortBy`的Lambda参数是集合操作结果的返回类型，可以直接使用投影后的字段名。生成的`ORDER BY`会引用集合操作输出列的别名，`drop`和`take`则按方言生成对应的分页子句（示例为PostgreSQL的`LIMIT`和`OFFSET`）。

集合操作在`sortBy`之后同样可以调用`takeWithTies`，生成`FETCH n ROWS WITH TIES`子句；其方言限制与[查询DSL](./query.md)中介绍的一致（MySQL不支持）。

## 兼容性

集合操作在各主流数据库最新版本中的实测支持情况如下：

| 方法 | PostgreSQL | MySQL | Oracle |
| ------ | ------------ | ------- | -------- |
| `union` | ✅ | ✅ | ✅ |
| `unionAll` | ✅ | ✅ | ✅ |
| `intersect` | ✅ | ✅ | ✅ |
| `intersectAll` | ✅ | ✅ | ✅ |
| `except` | ✅ | ✅ | ✅ |
| `exceptAll` | ✅ | ✅ | ✅ |
