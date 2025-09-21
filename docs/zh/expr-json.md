# JSON操作

sqala支持SQL标准的JSON操作，但目前没有支持PostgreSQL和MySQL的`->`等运算符，如果有需求，请参考[自定义表达式](./expr-custom.md)。

## IS JSON

`isJson`方法用于判断字段是否为有效的JSON格式：

```scala
val q = query:
    from(Post).filter(p => p.content.isJson)
```

## JSON

`json`方法用于将字符串类型表达式转换为JSON表达式：

```scala
val q = query:
    from(Post).map(p => json(p.content))
```

## JSON_VALUE

`jsonValue`方法用于提取一个JSON PATH对应的表达式，并转为字符串类型，类似与PostgreSQL的`->>`运算符：

```scala
val q = query:
    from(Post).map(p => jsonValue(p.content, "$.a"))
```

## JSON_QUERY

`jsonQuery`方法用于提取一个JSON PATH对应的表达式，并转为JSON类型，类似与PostgreSQL的`->`运算符：

```scala
val q = query:
    from(Post).map(p => jsonQuery(p.content, "$.a"))
```

## JSON_EXISTS

`jsonExists`方法用于检测JSON PATH是否存在：

```scala
val q = query:
    from(Post).filter(p => jsonExists(p.content, "$.a"))
```

## JSON_OBJECT

`jsonObject`用于构建一个JSON对象：

```scala
val q = query:
    from(Post).map(p => jsonObject("id" value p.id, "title" value p.title))
```

## JSON_ARRAY

`jsonArray`用于构建一个JSON数组：

```scala
val q = query:
    from(Post).map(p => jsonArray(p.id, p.title))
```

## JSON_OBJECTAGG

`jsonObjectAgg`用于将数据聚合成JSON对象：

```scala
val q = query:
    from(Post).map(p => jsonObjectAgg(p.id, p.title))
```

## JSON_ARRAYAGG

`jsonArrayAgg`用于将数据聚合成JSON数组：

```scala
val q = query:
    from(Post).map(p => jsonArrayAgg(p.title))
```