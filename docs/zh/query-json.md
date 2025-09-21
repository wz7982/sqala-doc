# JSON表

`JSON_TABLE`是SQL中较新的标准，用于将嵌套JSON数据平铺成关系型数据库能处理的关系表，在PostgreSQL 17等较新数据库版本中支持，sqala也对JSON表进行了支持。

`jsonTable`方法用于生成一个JSON表，第一个参数是JSON数据，第二个参数是基础的JSON PATH，第三个参数是列定义：

```scala
val q = query:
    from:
        jsonTable(
            """{"a": 1, "obj": {"b": "abc", "c": 2}}""",
            "$",
            columns(
                o = ordinalColumn,
                a = pathColumn[Int]("$.a"),
                n = nestedColumns("$.obj")(
                    b = pathColumn[String]("$.b"),
                    c = existsColumn("$.c")
                )
            )
        )
```

列定义支持：

`ordinalColumn`、`pathColumn`、`existsColumn`、`nestedColumns`四种。

生成的SQL为：

```sql
SELECT
    "t1"."c1" AS "c1",
    "t1"."c2" AS "c2",
    "t1"."c3" AS "c3",
    "t1"."c4" AS "c4"
FROM
    JSON_TABLE(
        '{"a": 1, "obj": {"b": "abc", "c": 2}}', '$' COLUMNS(
            "c1" FOR ORDINALITY,
            "c2" INTEGER PATH '$.a',
            NESTED PATH '$.obj' COLUMNS(
                "c3" VARCHAR PATH '$.b',
                "c4" BOOLEAN EXISTS PATH '$.c'
            )
        )
    ) AS "t1"
```

最终在生成类型时，sqala将`nestedColumns`中的字段平铺在外层，因此最后查询的返回类型为：

```scala
// 返回类型为List[(o: Int, a: Option[Int], b: Option[String], c: Option[Boolean])]
val result = db.fetch(q)
```

我们可以使用`LATERAL`功能让JSON表获取外部字段作为JSON输入源：

```scala
case class Entity(json: Json)

val q = query:
    from:
        Entity.crossJoinLateral(e =>
            jsonTable(
                e.json,
                "$",
                columns(
                    o = ordinalColumn,
                    a = pathColumn[Int]("$.a"),
                    n = nestedColumns("$.obj")(
                        b = pathColumn[String]("$.b"),
                        c = existsColumn("$.c")
                    )
                )
            )
        )
```

生成的SQL为：

```sql
SELECT
    "t1"."json" AS "c1",
    "t2"."c1" AS "c2",
    "t2"."c2" AS "c3",
    "t2"."c3" AS "c4",
    "t2"."c4" AS "c5"
FROM
    "entity" AS "t1"
    CROSS JOIN LATERAL JSON_TABLE(
        "t1"."json", '$' COLUMNS(
            "c1" FOR ORDINALITY,
            "c2" INTEGER PATH '$.a',
            NESTED PATH '$.obj' COLUMNS(
                "c3" VARCHAR PATH '$.b',
                "c4" BOOLEAN EXISTS PATH '$.c'
            )
        )
    ) AS "t2"
```