# JSON Tables

> The features on this page belong to the `sqala-static-ext` module, which requires an additional dependency. Import:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


`JSON_TABLE` is a relatively new SQL standard used to flatten nested JSON data into a relational table that a relational database can process. sqala also supports JSON tables.

The `jsonTable` method is used to create a JSON table. Its first parameter is the JSON data, the second parameter is the base JSON PATH, and the third parameter is the column definitions:

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

The column definitions support four kinds:

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

When generating the type, sqala flattens the fields in `nestedColumns` into the outer level, so the return type of the final query is:

```scala
// The return type is List[(o: Int, a: Option[Int], b: Option[String], c: Option[Boolean])]
val result = db.fetch(query)
```

We can use the `LATERAL` feature to let a JSON table take an outer field as its JSON input source:

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

The tested support for JSON tables in the latest versions of mainstream databases is as follows:

| Database | JSON_TABLE Support |
|--------|-----------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
| SQLServer | ❌ |
| SQLite | ❌ |
