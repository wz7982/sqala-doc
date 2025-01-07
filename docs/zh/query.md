# 查询

在配置好元数据之后，我们就可以开始构建查询了，sqala使用类似Scala集合库风格的api创建查询。

以下用法均需要导入：

```scala
import sqala.static.dsl.*
import sqala.static.dsl.given
```

## 构建查询

sqala的查询需要放在`queryContext`方法中构建，该方法提供了构造查询需要的上下文。

`query`方法用于构建查询，类型参数是实体类类型：

```scala
val q = queryContext:
    query[Department]
```

生成的查询为（以MySQL为例）：

```sql
SELECT 
    `department`.`id`,
    `department`.`manager_id`,
    `department`.`name`
FROM
    `department` AS `department`
```

此查询的返回类型为：

![返回类型](../../images/query-result.png)

## filter

`filter`方法对应到SQL的`WHERE`子句，参数是一个`T => Boolean`类型的函数，描述`WHERE`条件：

```scala
val id = 1

val q = queryContext:
    query[Department].filter(d => d.id == id)
```

生成的查询为（以MySQL为例）：

```sql
SELECT 
    `d`.`id`,
    `d`.`manager_id`,
    `d`.`name`
FROM
    `department` AS `d`
WHERE
    `d`.`id` = 1
```

**多次调用`filter`时将会使用AND来连接查询条件。**

sqala提供了`filterIf`方法用于动态拼接条件，会在第一个参数值为`true`时使用`AND`将条件拼接到查询中：

```scala
val id = 1
val name = "部门1"

val q = queryContext:
    query[Department]
        .filterIf(id > 0)(_.id == id)
        .filterIf(name.nonEmpty)(_.name == name)
```

### filter的限制

sqala会检查`filter`中的表达式，如果其中包含聚合函数、窗口函数等表达式，则会返回编译错误：

![filter的编译错误](../../images/filter-error.png)

## map

`map`方法用于手动指定`SELECT`投影列表，sqala允许投影到表达式、表达式组成的元组、表达式组成的命名元组。

### 投影到表达式

```scala
val q = queryContext:
    query[Department].map(d => d.id)
```

生成的SQL为：

```sql
SELECT 
    `d`.`id`
FROM
    `department` AS `d`
```

在数据库查询时，sqala会自动推导返回类型：

![返回类型](../../images/map-expr.png)

### 投影到元组

```scala
val q = queryContext:
    query[Department].map(d => (d.id, d.name))
```

生成的SQL为：

```sql
SELECT 
    `d`.`id`,
    `d`.`name`
FROM
    `department` AS `d`
```

查询的返回类型为：

![返回类型](../../images/map-tuple.png)

### 投影到命名元组

命名元组（NamedTuple）是Scala 3.6版本后新增功能，但目前（截止到Scala 3.6.2），我们仍需要导入：

```scala
import scala.language.experimental.namedTuples
```

才能正常使用，命名元组预计在Scala 3.7版本转为标准特性，届时将无需导入即可使用。

利用命名元组，我们可以给投影的字段起名，并在查询后直接使用`.`来调用字段，无需对投影中间结果预先定义实体类接收：

```scala
val q = queryContext:
    query[Department].map(d => (id = d.id, name = d.name))
```

![返回类型](../../images/map-namedtuple.png)

## 使用for推导式

sqala支持将只使用了`filter`和`map`的简单查询转变为`for`推导式，提高可读性：

```scala
val q = queryContext:
    query[Department]
        .filter(d => d.id == 1)
        .map(d => d.name)
```

可以简写为：

```scala
val q = queryContext:
    for d <- query[Department]
        if d.id == 1
    yield d.name
```