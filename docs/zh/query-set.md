# 集合操作

集合操作也是SQL中的常用操作，sqala对集合操作也内置了支持。

## 并集

SQL中`UNION`和`UNION ALL`代表并集操作，区别是前者将两个查询的并集去重，相当于`UNION DISTINCT`，后者则不会去重。sqala中使用`union`和`unionAll`方法连接两个查询：

```scala
val q = query:
    val q1 = from(User).filter(u => u.id == 1).map(u => (id = u.id, name = u.name))
    val q2 = from(User).filter(u => u.id == 2).map(u => (id = u.id, name = u.name))
    q1.unionAll(q2)
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

sqala会最大限度兼容两个参与集合操作的查询的类型。要求其必须字段数量完全一致，但不要求两个查询的返回类型完全一致，只需要能在类型上兼容即可。

假如前一个查询行类型为`(Option[Int], String, Long)`，

后一个查询的行类型为`(Double, Option[String], Option[Int])`，

则返回类型会推导为`List[(Option[Double], Option[String], Option[Long])]`。

sqala在追求类型安全的同时，也会极力追求便利性。

前一个查询如果返回命名元组，后一个查询返回元组，则会推导为命名元组，命名元组的字段名以前一个查询为准，返回类型则由两个查询共同推导。

## 交集

SQL中`INTERSECT`和`INTERSECT ALL`代表交集操作。sqala中使用`intersect`和`intersectAll`方法连接两个查询：

```scala
val q = query:
    val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
    val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))
    q1.intersectAll(q2)
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

SQL中`EXCEPT`和`EXCEPT ALL`代表交集操作。sqala中使用`except`和`exceptAll`方法连接两个查询：

```scala
val q = query:
    val q1 = from(User).filter(u => u.id >= 5).map(u => (id = u.id, name = u.name))
    val q2 = from(User).filter(u => u.id <= 10).map(u => (id = u.id, name = u.name))
    q1.exceptAll(q2)
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