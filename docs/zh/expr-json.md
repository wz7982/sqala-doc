# JSON操作

> 本页功能属于 `sqala-static-ext` 模块，需要额外引入该模块，并导入：
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


sqala支持SQL标准的JSON操作，但暂不支持PostgreSQL和MySQL的`->`等运算符；如有需求，请参考[自定义表达式](./expr-custom.md)。

## IS JSON

`isJson`方法用于判断字段是否为有效的JSON格式：

```scala
val query =
    from(Post).filter(p => p.content.isJson)
```

此外还有更精确的类型判断方法：`isJsonObject`（`IS JSON OBJECT`）、`isJsonArray`（`IS JSON ARRAY`）、`isJsonScalar`（`IS JSON SCALAR`，即字符串、数字、布尔或null），用法与`isJson`相同，均要求接收者为字符串类型表达式。

## JSON

`json`方法用于将字符串类型表达式转换为JSON表达式：

```scala
val query =
    from(Post).map(p => json(p.content))
```

## JSON_VALUE

`jsonValue`方法用于提取指定JSON PATH对应的表达式，并转为字符串类型，类似于PostgreSQL的`->>`运算符。操作数必须是JSON类型表达式：字符串列需要先用`json`方法转换（实体字段本身为JSON类型时可直接使用）：

```scala
val query =
    from(Post).map(p => jsonValue(json(p.content), "$.a"))
```

## JSON_QUERY

`jsonQuery`方法用于提取指定JSON PATH对应的表达式，并转为JSON类型，类似于PostgreSQL的`->`运算符。操作数同样要求JSON类型：

```scala
val query =
    from(Post).map(p => jsonQuery(json(p.content), "$.a"))
```

## JSON_EXISTS

`jsonExists`方法用于检测JSON PATH是否存在。操作数同样要求JSON类型：

```scala
val query =
    from(Post).filter(p => jsonExists(json(p.content), "$.a"))
```

## JSON_OBJECT

`jsonObject`用于构建一个JSON对象。它接收**一个**参数：多个键值对需要写成元组传入：

```scala
val query =
    from(Post).map(p => jsonObject(("id" -> p.id, "title" -> p.title)))
```

## JSON_ARRAY

`jsonArray`用于构建一个JSON数组。同样只接收一个参数，多个元素写成元组：

```scala
val query =
    from(Post).map(p => jsonArray((p.id, p.title)))
```

## JSON_SERIALIZE

`jsonSerialize`用于将JSON类型表达式序列化回字符串，对应SQL的`JSON_SERIALIZE`，返回可空的字符串表达式：

```scala
val query =
    from(Post).map(p => jsonSerialize(json(p.content)))
```

## JSON_OBJECTAGG

`jsonObjectAgg`用于将数据聚合成JSON对象：

```scala
val query =
    from(Post).map(p => jsonObjectAgg(p.id -> p.title))
```

## JSON_ARRAYAGG

`jsonArrayAgg`用于将数据聚合成JSON数组：

```scala
val query =
    from(Post).map(p => jsonArrayAgg(p.title))
```

## 兼容性

经各主流数据库最新版本实测，JSON操作的支持情况如下（MySQL不支持`IS JSON`操作）：

| 数据库类型 | JSON 操作 |
|------------|-------------|
| PostgreSQL | ✅ |
| MySQL | ✅ |
| Oracle | ✅ |
