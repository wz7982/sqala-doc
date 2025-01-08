# JSON支持

sqala为JSON提供了支持，我们可以导入`import sqala.data.json.*`来将查询结果生成JSON，或是从JSON映射到实体结果。

首先添加依赖：

```scala
libraryDependencies += "com.wz7982" % "sqala-data_3" % "latest.integration"
```

## 生成JSON

使用`toJson`方法，可以将一个对象映射到JSON字符串：

```scala
import sqala.data.json.*

case class People(id: Int, name: String, birthday: LocalDate, address: Option[String], emails: List[String])

val people = People(1, "小黑", LocalDate.parse("1990-01-01"), None, List("xxxx@xxxx.com", "yyyy@yyyy.com"))

val json: String = people.toJson
```

上面的代码会生成JSON：

```json
{
    "id": 1,
    "name": "小黑",
    "birthday": "1990-01-01 00:00:00",
    "address": null,
    "emails": ["xxxx@xxxx.com", "yyyy@yyyy.com"]
}
```

sqala的JSON模块内置支持的字段类型有：

|字段类型                |字段类型               |
|:---------------------:|:---------------------:|
|scala.Int              |scala.String           |
|scala.Long             |scala.Boolean          |
|scala.Float            |java.time.LocalDate    |
|scala.Double           |java.time.LocalDateTime|
|scala.math.BigDecimal  |                       |

以及这些类型对应的`Option`和`List`类型，其中`Option`的`None`会映射成JSON的`null`，`List`会映射成JSON的数组。

使用以上类型组成的`case class`和`enum`都可以自动生成`toJson`的实现。

下面来看一个`enum`的例子：

```scala
import sqala.data.json.*

enum State:
    case Off
    case On

enum Result[T]:
    case Success(data: T)
    case Failure(code: Int, msg: String)

case class User(id: Int, name: String, state: State)

val r1 = Result(User(1, "小黑", State.On))
val json1 = r1.toJson
val r2 = Result[User](1, "错误")
val json2 = r2.toJson
```

会分别生成JSON：

```json
{
    "Success": {
        "id": 1,
        "name": "小黑",
        "state": "On"
    }
}
```

和

```json
{
    "Failure": {
        "code": 1,
        "msg": "错误"
    }
}
```

## JSON反序列化

使用`fromJson`方法可以将JSON字符串映射回对象：

```scala
import sqala.data.json.*

val json = """
{
    "id": 1,
    "name": "小黑",
    "birthday": "1990-01-01 00:00:00",
    "address": null,
    "emails": ["xxxx@xxxx.com", "yyyy@yyyy.com"]
}
"""

val people = fromJson[People](json)
println(people)
```

## JSON注解

sqala提供了两个JSON相关注解，分别是`@jsonAlias`和`@jsonIgnore`。

`@jsonAlias`可以对字段起别名，序列化和反序列化会使用字段的别名：

```scala
import sqala.data.json.*

case class A(@jsonAlias("xx") x: Int)
```

`jsonIgnore`标记可以忽略的字段，这样的字段会在生成JSON时被忽略；

在反序列化时，如果JSON字符串中没有提供这个字段的值，sqala将会尝试使用默认值进行填充，填充的优先级为**JSON提供的值 > case class字段的默认值 > 类型默认值**，比如：

```scala
import sqala.data.json.*

case class B(@jsonIgnore x: Int = 1, @jsonIgnore y: Int)
```

如果提供的JSON为一个空对象，此时生成的结果为：

```scala
B(1, 0)
```

sqala提供的类型默认值为：

|字段类型                |默认值                 |
|:---------------------:|:---------------------:|
|scala.Int              |0                      |
|scala.Long             |0L                     |
|scala.Float            |0F                     |
|scala.Double           |0D                     |
|scala.math.BigDecimal  |BigDecimal(0)          |
|scala.String           |""                     |
|scala.Boolean          |false                  |
|java.time.LocalDate    |LocalDate.now()        |
|java.time.LocalDateTime|LocalDateTime.now()    |
|scala.Option           |None                   |
|scala.List             |Nil                    |
|case class             |使用字段默认值构建的实例 |
|enum                   |枚举的第一项            |

## 日期格式

sqala的JSON模块默认将会使用`yyyy-MM-dd HH:mm:ss`进行日期格式处理，如果想替换掉默认的日期格式，在作用域中**添加或导入**一个`given JsonDateFormat`即可：

```scala
import sqala.data.json.*

given JsonDateFormat = JsonDateFormat("yyyy-MM-ddTHH:mm:ss")
```

此时生成JSON和反序列化都可以使用该日期格式进行处理。

## 自定义实现

sqala的JSON操作使用Scala3的`类型类推导`机制，因此我们可以非常方便地替换掉某部分的实现，而无需在需要定制化的场景中手动编写全部的序列化/反序列化代码，在了解如何自定义实现之前，我们需要先了解sqala提供的`JsonNode`。

`JsonNode`是一个Scala3的`enum`，sqala的JSON操作都使用`JsonNode`作为中间结构，其定义如下：

```scala
enum JsonNode:
    case Num(number: Number)
    case Str(string: String)
    case Bool(boolean: Boolean)
    case Null
    case Object(items: Map[String, JsonNode])
    case Array(items: List[JsonNode])
```

枚举项涵盖了JSON的基础结构，下面我们来尝试自定义一个字段类型的JSON实现。

有如下枚举：

```scala
enum State:
    case Off
    case On
```

我们希望在生成JSON时，不使用枚举项的名字，而是使用替代的状态码，可以提供一个`JsonEncoder`的实例：

```scala
given JsonEncoder[State] with
    override def encode(x: State)(using JsonDateFormat): JsonNode = x match
        case State.Off => JsonNode.Num(0)
        case State.On => JsonNode.Num(1)
```

同时我们希望，前端无论是传递状态码、枚举项名称、或是其代表的含义时，都可以成功反序列化，可以提供一个`JsonDecoder`实例：

```scala
given JsonDecoder[State] with
    override def decode(node: JsonNode)(using JsonDateFormat): State throws JsonDecodeException =
        node match
            case JsonNode.Num(1) | JsonNode.Str("On") | JsonNode.Str("开启") => State.On
            case _ => State.Off
```

如果我们想调整反序列化的默认值，可以提供一个`JsonDefaultValue`实例：

```scala
given JsonDefaultValue[State] with
    override def defaultValue: State = State.Off
```

如果需要使用sqala没有内置支持的字段类型，同样为该类型提供这三个`trait`的实现即可。