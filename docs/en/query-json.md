# JSON Tables

> The features on this page belong to the `sqala-static-ext` module, which requires an additional dependency. Import:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


`JSON_TABLE` is a relatively new SQL standard that flattens nested JSON data into relational tables a database can process. sqala supports JSON tables as well.

The `jsonTable` method creates a JSON table: its first parameter is the JSON data, the second is the base JSON PATH, and the third is the column definitions:

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

The column definitions support the following four kinds:

`ordinalColumn`, `pathColumn`, `existsColumn`, and `nestedColumns`.

The generated SQL is:

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

When generating the result type, sqala flattens the fields of `nestedColumns` into the outer level, so the final return type of the query is:

```scala
// The return type is List[(o: Int, a: Option[Int], b: Option[String], c: Option[Boolean])]
val result = db.fetch(query)
```

The `LATERAL` feature lets a JSON table take a field from the outer query as its JSON input source:

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

The generated SQL is:

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

Tested support for JSON tables in the latest versions of mainstream databases is as follows:

| Database | JSON_TABLE Support |
|--------|-----------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
