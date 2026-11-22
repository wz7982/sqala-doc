# JSON Operations

> The features on this page are part of the `sqala-static-ext` module. You need to add this module as a dependency and import:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


sqala supports the JSON operations from the SQL standard, but does not currently support PostgreSQL and MySQL operators such as `->`. If you need them, refer to [custom expressions](./expr-custom.md).

## IS JSON

The `isJson` method checks whether a field is in valid JSON format:

```scala
val query =
    from(Post).filter(p => p.content.isJson)
```

## JSON

The `json` method converts a string-typed expression into a JSON expression:

```scala
val query =
    from(Post).map(p => json(p.content))
```

## JSON_VALUE

The `jsonValue` method extracts the expression corresponding to a JSON PATH and converts it to a string type, similar to PostgreSQL's `->>` operator:

```scala
val query =
    from(Post).map(p => jsonValue(p.content, "$.a"))
```

## JSON_QUERY

The `jsonQuery` method extracts the expression corresponding to a JSON PATH and converts it to a JSON type, similar to PostgreSQL's `->` operator:

```scala
val query =
    from(Post).map(p => jsonQuery(p.content, "$.a"))
```

## JSON_EXISTS

The `jsonExists` method checks whether a JSON PATH exists:

```scala
val query =
    from(Post).filter(p => jsonExists(p.content, "$.a"))
```

## JSON_OBJECT

`jsonObject` builds a JSON object:

```scala
val query =
    from(Post).map(p => jsonObject("id" -> p.id, "title" -> p.title))
```

## JSON_ARRAY

`jsonArray` builds a JSON array:

```scala
val query =
    from(Post).map(p => jsonArray(p.id, p.title))
```

## JSON_OBJECTAGG

`jsonObjectAgg` aggregates data into a JSON object:

```scala
val query =
    from(Post).map(p => jsonObjectAgg(p.id value p.title))
```

## JSON_ARRAYAGG

`jsonArrayAgg` aggregates data into a JSON array:

```scala
val query =
    from(Post).map(p => jsonArrayAgg(p.title))
```

## Compatibility

The measured support for JSON operations in the latest versions of each major database is as follows (MySQL does not support the `IS JSON` operation):

| Database Type | JSON Operations |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
