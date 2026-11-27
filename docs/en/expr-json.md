# JSON Operations

> The features on this page belong to the `sqala-static-ext` module. Add this module as a dependency and import the following:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


sqala supports the JSON operations of the SQL standard, but does not yet support operators such as `->` in PostgreSQL and MySQL. If you need them, see [custom expressions](./expr-custom.md).

## IS JSON

The `isJson` method checks whether a field is in valid JSON format:

```scala
val query =
    from(Post).filter(p => p.content.isJson)
```

More precise type-checking methods are also available: `isJsonObject` (`IS JSON OBJECT`), `isJsonArray` (`IS JSON ARRAY`), and `isJsonScalar` (`IS JSON SCALAR`, i.e., a string, number, boolean, or null). They are used the same way as `isJson`, and all require the receiver to be a string-typed expression.

## JSON

The `json` method converts a string-typed expression into a JSON expression:

```scala
val query =
    from(Post).map(p => json(p.content))
```

## JSON_VALUE

The `jsonValue` method extracts the expression corresponding to a JSON PATH and converts it to a string type, similar to PostgreSQL's `->>` operator. The operand must be a JSON-typed expression: a string column needs to be wrapped with `json` first (JSON-typed entity fields can be used directly):

```scala
val query =
    from(Post).map(p => jsonValue(json(p.content), "$.a"))
```

## JSON_QUERY

The `jsonQuery` method extracts the expression corresponding to a JSON PATH and converts it to a JSON type, similar to PostgreSQL's `->` operator. The operand must also be JSON-typed:

```scala
val query =
    from(Post).map(p => jsonQuery(json(p.content), "$.a"))
```

## JSON_EXISTS

The `jsonExists` method checks whether a JSON PATH exists. The operand must also be JSON-typed:

```scala
val query =
    from(Post).filter(p => jsonExists(json(p.content), "$.a"))
```

## JSON_OBJECT

`jsonObject` builds a JSON object. It takes **one** argument: multiple key-value pairs must be passed as a tuple:

```scala
val query =
    from(Post).map(p => jsonObject(("id" -> p.id, "title" -> p.title)))
```

## JSON_ARRAY

`jsonArray` builds a JSON array. It also takes a single argument; write multiple elements as a tuple:

```scala
val query =
    from(Post).map(p => jsonArray((p.id, p.title)))
```

## JSON_SERIALIZE

`jsonSerialize` serializes a JSON-typed expression back into a string, corresponding to SQL's `JSON_SERIALIZE`, and returns a nullable string expression:

```scala
val query =
    from(Post).map(p => jsonSerialize(json(p.content)))
```

## JSON_OBJECTAGG

`jsonObjectAgg` aggregates data into a JSON object:

```scala
val query =
    from(Post).map(p => jsonObjectAgg(p.id -> p.title))
```

## JSON_ARRAYAGG

`jsonArrayAgg` aggregates data into a JSON array:

```scala
val query =
    from(Post).map(p => jsonArrayAgg(p.title))
```

## Compatibility

Tested support for JSON operations in the latest versions of major databases is as follows (MySQL does not support `IS JSON`):

| Database Type | JSON Operations |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
