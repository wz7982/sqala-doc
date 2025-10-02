# 使用方法名创建查询

在应用的开发流程中，简单查询是绝大多数，sqala支持了`fetchByPrimaryKey`来使用主键字段查询数据，但这无法满足其他简单查询需求，但我们可能又不希望在简单查询中使用sqala提供的查询DSL，因为DSL可能相对来说更重量级，为此，sqala支持使用方法名直接创建简单查询（类似Spring Data JPA），但与JPA不同的是，sqala提供的这一功能是**0配置**的，我们可以直接使用动态创建的方法名，sqala会自动求解参数类型，也就是说，虽然是动态功能，但也完全类型安全。

## 创建查询

方法名查询通常以`fetchBy`、`findBy`等开始，比如我们可以按`id`字段查询`user`表，使用泛型传递对应实体类型：

```scala
val result = db.fetchById[User](1)
```

sqala会自动算出需要的参数类型，如果类型不符合，将会返回编译错误：

```scala
// 编译错误
val result = db.fetchById[User]("")
```

方法名的前缀影响返回结果类型：

| 方法名前缀    |  返回类型  |
|:------------:|:---------:|
|`fetchBy`     |`List[T]`  |
|`findBy`      |`Option[T]`|
|`pageBy`      |`Page[T]`  |
|`countBy`     |`Long`     |
|`existsBy`    |`Boolean`  |

## 设置查询条件

上面的`fetchById`方法用于等值比较，sqala还支持其他的比较操作：

| 方法名片段                 | SQL片段                         | 推导参数类型|
|:-------------------------:|:-------------------------------:|:----------:|
|`ColumnNot`                |`column <> v`                    |`T`        |
|`ColumnIn`                 |`column in (...)`                |`Seq[T]`   |
|`ColumnNotIn`              |`column not in (...)`            |`Seq[T]`   |
|`ColumnBetween`            |`column between v1 and v2`       |`(T, T)`   |
|`ColumnBetweenNotBetween`  |`column not between v1 and v2`   |`(T, T)`   |
|`ColumnLike`               |`column like v`                  |`T`        |
|`ColumnNotLike`            |`column not like v`              |`T`        |
|`ColumnContains`           |`column like '%v%'`              |`String`   |
|`ColumnStartsWith`         |`column like 'v%'`               |`String`   |
|`ColumnEndsWith`           |`column like '%v'`               |`String`   |
|`ColumnIsNull`             |`column is null`                 |           |
|`ColumnIsNotNull`          |`column is not null`             |           |
|`ColumnGreaterThan`        |`column > v`                     |`T`        |
|`ColumnGreaterThanEqual`   |`column >= v`                    |`T`        |
|`ColumnLessThan`           |`column < v`                     |`T`        |
|`ColumnLessThanEqual`      |`column <= v`                    |`T`        |

多个条件使用`And`连接，由于支持`Or`操作会带来复杂的优先级问题，所以如果查询条件中有`OR`操作，请使用[查询DSL](./query.md)

最终的参数列表会平铺成一个元组类型，比如方法名`fetchByIdInAndLikeCountBetween`需要的查询列表为：

```scala
val result = db.fetchByIdInAndLikeCountBetween[Post](Seq(1, 2, 3), 10, 100)
```

## 设置排序

在`OrderBy`之后添加排序，规则是字段名加`Asc`或`Desc`：

```scala
val result = db.fetchByIdOrderByIdAscNameDesc[User](1)
```

## 分页查询

`pageBy`开启分页查询，参数列表最后需要追加三个参数，分别是页大小，页码，是否需要查询COUNT：

```scala
val result = db.pageById[User](1, 10, 1, true)
```

## 去重

在`fetch`等操作后添加`Distinct`开启去重查询：

```scala
val result = db.fetchDistinctByName("小黑")
```