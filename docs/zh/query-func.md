# 函数表

sqala支持SQL中的函数表功能，可以把函数调用结果当做表使用。

## UNNEST

`unnest`对应SQL标准的函数表`UNNEST`（**目前仅PostgreSQL支持**），作用是把数组字段平铺，作为一个表使用，我们使用字段`x`进行后续操作：

```scala
val q = query:
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

`unnestWithOrdinal`可以在展开数组之后添加序号，使用`ordinal`字段进行后续序号操作：

```scala
val q = query:
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

我们可以用`joinLateral`功能引用左侧表的数组字段：

```scala
case class Entity(arr: Array[Int])

val q = query:
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

除了SQL标准中的`unnest`函数表，sqala没有内置其他函数表，但支持自定义，我们以PostgreSQL的`generate_series`生成序列为例。

首先需要创建接收结构：

```scala
case class GenerateSeries(x: Int)
```

然后创建函数表：

```scala
def generateSeries(start: Int, end: Int)(using QueryContext) = 
    createTableFunction[GenerateSeries](
        "generate_series", 
        start.asExpr :: end.asExpr :: Nil, 
        false
    )
```

第一个参数是函数名，第二个参数是参数列表，第三个参数是是否需要序号。

然后我们就可以在查询中使用：

```scala
val q = query:
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