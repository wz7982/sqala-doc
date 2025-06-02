# JSON Support

sqala provides support for JSON. We can import `import sqala.data.json.*` to generate JSON from query results or map JSON to entity results.

**Currently, sqala's JSON parsing performance is suboptimal and is only suitable for quickly building demo code. For production environments, a dedicated JSON library should be used.**

First, add the dependency:

```scala
libraryDependencies += "com.wz7982" % "sqala-data_3" % "latest.integration"
```

## Generating JSON

Using the `toJson` method, an object can be mapped to a JSON string:

```scala
import sqala.data.json.*

case class People(id: Int, name: String, birthday: LocalDate, address: Option[String], emails: List[String])

val people = People(1, "Dave", LocalDate.parse("1990-01-01"), None, List("xxxx@xxxx.com", "yyyy@yyyy.com"))

val json: String = people.toJson
```

The above code will generate the following JSON:

```json
{
    "id": 1,
    "name": "Dave",
    "birthday": "1990-01-01 00:00:00",
    "address": null,
    "emails": ["xxxx@xxxx.com", "yyyy@yyyy.com"]
}
```

The JSON module in sqala supports the following field types:

| Field Type            | Field Type           |
|:---------------------:|:---------------------:|
| scala.Int             | scala.String          |
| scala.Long            | scala.Boolean         |
| scala.Float           | java.time.LocalDate   |
| scala.Double          | java.time.LocalDateTime|
| scala.math.BigDecimal |                       |

And the corresponding `Option` and `List` types for these fields. `Option`'s `None` will be mapped to JSON's `null`, and `List` will be mapped to a JSON array.

Any `case class` or `enum` composed of the above types can automatically generate the `toJson` implementation.

Here is an example of an `enum`:

```scala
import sqala.data.json.*

enum State:
    case Off
    case On

enum Result[T]:
    case Success(data: T)
    case Failure(code: Int, msg: String)

case class User(id: Int, name: String, state: State)

val r1 = Result(User(1, "Dave", State.On))
val json1 = r1.toJson
val r2 = Result[User](1, "Error")
val json2 = r2.toJson
```

This will generate the following JSON:

```json
{
    "Success": {
        "id": 1,
        "name": "Dave",
        "state": "On"
    }
}
```

And

```json
{
    "Failure": {
        "code": 1,
        "msg": "Error"
    }
}
```

## JSON Deserialization

Using the `fromJson` method, a JSON string can be mapped back to an object:

```scala
import sqala.data.json.*

val json = """
{
    "id": 1,
    "name": "Dave",
    "birthday": "1990-01-01 00:00:00",
    "address": null,
    "emails": ["xxxx@xxxx.com", "yyyy@yyyy.com"]
}
"""

val people = fromJson[People](json)
println(people)
```

## JSON Annotations

sqala provides two JSON-related annotations: `@jsonAlias` and `@jsonIgnore`.

`@jsonAlias` can alias a field, and the alias will be used during serialization and deserialization:

```scala
import sqala.data.json.*

case class A(@jsonAlias("xx") x: Int)
```

`@jsonIgnore` marks fields that should be ignored. Such fields will be ignored when generating JSON.

During deserialization, if the JSON string does not provide a value for this field, sqala will attempt to fill it with a default value. The priority for filling is **JSON-provided value > case class field default value > type default value**. For example:

```scala
import sqala.data.json.*

case class B(@jsonIgnore x: Int = 1, @jsonIgnore y: Int)
```

If the provided JSON is an empty object, the result will be:

```scala
B(1, 0)
```

The default values provided by sqala are:

| Field Type            | Default Value         |
|:---------------------:|:---------------------:|
| scala.Int             | 0                     |
| scala.Long            | 0L                    |
| scala.Float           | 0F                    |
| scala.Double          | 0D                    |
| scala.math.BigDecimal | BigDecimal(0)         |
| scala.String          | ""                    |
| scala.Boolean         | false                 |
| java.time.LocalDate   | LocalDate.now()       |
| java.time.LocalDateTime| LocalDateTime.now()   |
| scala.Option          | None                  |
| scala.List            | Nil                   |
| case class            | Instance built with field default values |
| enum                  | First item of the enum |

## Date Format

sqala's JSON module will use `yyyy-MM-dd HH:mm:ss` for date formatting by default. If you want to replace the default date format, add or import a `given JsonDateFormat` in the scope:

```scala
import sqala.data.json.*

given JsonDateFormat = JsonDateFormat("yyyy-MM-ddTHH:mm:ss")
```

Now, both JSON generation and deserialization will use this date format.

## Custom Implementation

sqala's JSON operations use Scala 3's `type class derivation` mechanism, so we can easily replace part of the implementation without manually writing all the serialization/deserialization code in scenarios that require customization. Before understanding how to customize the implementation, we need to understand the `JsonNode` provided by sqala.

`JsonNode` is a Scala 3 `enum`. sqala's JSON operations use `JsonNode` as an intermediate structure. Its definition is as follows:

```scala
enum JsonNode:
    case Num(number: Number)
    case Str(string: String)
    case Bool(boolean: Boolean)
    case Null
    case Object(items: Map[String, JsonNode])
    case Array(items: List[JsonNode])
```

The enum items cover the basic structure of JSON. Let's try to customize a JSON implementation for a field type.

Given the following enum:

```scala
enum State:
    case Off
    case On
```

We want to use status codes instead of enum item names when generating JSON. We can provide an instance of `JsonEncoder`:

```scala
given JsonEncoder[State] with
    override def encode(x: State)(using JsonDateFormat): String = x match
        case State.Off => "0"
        case State.On => "1"
```

At the same time, we want to ensure that the frontend can successfully deserialize whether it passes a status code, enum item name, or its represented meaning. We can provide an instance of `JsonDecoder`:

```scala
given JsonDecoder[State] with
    override def decode(node: JsonNode)(using JsonDateFormat): State throws JsonDecodeException =
        node match
            case JsonNode.Num(1) | JsonNode.Str("On") => State.On
            case _ => State.Off
```

If we want to adjust the default value for deserialization, we can provide an instance of `JsonDefaultValue`:

```scala
given JsonDefaultValue[State] with
    override def defaultValue: State = State.Off
```

If you need to use field types not supported by sqala, you can provide implementations of these three `trait`s for that type.