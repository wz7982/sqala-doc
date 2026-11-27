# 函数表

> 本页功能属于 `sqala-static-ext` 模块，需要额外引入该模块，并导入：
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


sqala支持SQL的函数表功能（目前仅PostgreSQL支持标准函数表操作），可以将函数调用的结果作为表使用。

## UNNEST

`unnest`对应SQL标准函数表`UNNEST`，用于将数组字段平铺为一张表，后续操作通过字段`x`进行：

```scala
val query =
    from(unnest(Array(1, 2, 3))).filter(t => t.x > 1)
```

生成的SQL为：

```sql
SELECT
    "t1"."x" AS "c1"
FROM
    UNNEST(ARRAY[1, 2, 3]) "t1"("x")
WHERE
    "t1"."x" > 1
```

`unnestWithOrdinal`在展开数组后附加序号列，后续操作通过`ordinal`字段进行：

```scala
val query =
    from(unnestWithOrdinal(Array(1, 2, 3))).filter(t => t.ordinal > 1)
```

生成的SQL为：

```sql
SELECT
    "t1"."x" AS "c1",
    "t1"."ordinal" AS "c2"
FROM
    UNNEST(ARRAY[1, 2, 3]) WITH ORDINALITY AS "t1"("x", "ordinal")
WHERE
    "t1"."ordinal" > 1
```

借助`crossJoinLateral`功能，可以引用左侧表中的数组字段：

```scala
case class Entity(arr: Array[Int])

val query =
    from:
        Entity.crossJoinLateral(e => unnest(e.arr))
```

生成的SQL为：

```sql
SELECT
    "t1"."arr" AS "c1",
    "t2"."x" AS "c2"
FROM
    "entity" AS "t1"
    CROSS JOIN LATERAL UNNEST("t1"."arr") AS "t2"("x")
```

## 自定义函数表

除SQL标准的`unnest`函数表外，sqala未内置其他函数表，但支持自定义函数表。以下以PostgreSQL的`generate_series`为例。

首先创建用于接收结果的接收结构：

```scala
case class GenerateSeries(x: Int)
```

然后创建函数表：

```scala
def generateSeries[L <: Int](start: Int, end: Int)(using QueryContext[L]) =
    createTableFunc[GenerateSeries](
        "generate_series",
        start.asExpr :: end.asExpr :: Nil,
        false
    )
```

第一个参数是函数名，第二个参数是参数列表，第三个参数表示是否需要序号。

随后即可在查询中使用：

```scala
val query =
    from(generateSeries(1, 10)).filter(t => t.x > 1)
```

生成的SQL为：

```sql
SELECT
    "t1"."x" AS "c1"
FROM
    generate_series(1, 10) AS "t1"("x")
WHERE
    "t1"."x" > 1
```
