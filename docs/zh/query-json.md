# JSON表

> 本页功能属于 `sqala-static-ext` 模块，需要额外引入该模块，并导入：
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


`JSON_TABLE`是SQL中较新的标准，用于将嵌套的JSON数据平铺为关系型数据库可处理的关系表。sqala同样支持JSON表。

`jsonTable`方法用于生成JSON表：第一个参数是JSON数据，第二个参数是基础JSON PATH，第三个参数是列定义：

```scala
val query =
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

列定义支持以下四种：

`ordinalColumn`、`pathColumn`、`existsColumn`、`nestedColumns`。

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

在生成返回类型时，sqala会将`nestedColumns`中的字段平铺到外层，因此查询的最终返回类型为：

```scala
// 返回类型为List[(o: Int, a: Option[Int], b: Option[String], c: Option[Boolean])]
val result = db.fetch(query)
```

借助`LATERAL`功能，可以让JSON表以外部字段作为JSON输入源：

```scala
case class Entity(json: Json)

val query =
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

JSON表在各大主流数据库最新版本中的实测支持情况如下：

| 数据库 | JSON_TABLE 支持 |
|--------|-----------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
