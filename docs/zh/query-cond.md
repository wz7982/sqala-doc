# 条件构建查询

sqala提供了静态且类型安全的DSL用于构建查询，但也支持在一定程度上使用不同条件构建查询，以下是一些常用用例。

## 动态排序

sqala对于过滤操作提供了`filterIf`，但对于排序没有提供类似的操作，但我们可以这样达到动态排序目的：

```scala
// 假设是用户传参
val key: String = ???

val baseQuery = from(Post)

val query =
    key match
        case "likeCount" => baseQuery.sortBy(p => p.likeCount.desc)
        case "viewCount" => baseQuery.sortBy(p => p.viewCount.desc)
        case _ => baseQuery.sortBy(p => p.id.desc)
```

## 动态分组

我们可以这样做动态查询：

```scala
case class Data(dim1: Int, dim2: Int, dim3: Int, measure: Int)

val dim: Int = ???

val baseQuery = from(Data)

val grouping =
    if dim == 1 then
        baseQuery.groupBy(d => d.dim1)
    else if dim == 2 then
        baseQuery.groupBy(d => d.dim2)
    else
        baseQuery.groupBy(d => d.dim3)

val query = grouping.map((g, d) => (g, sum(d.measure)))
```

## 按列表生成OR条件

我们可以这样构建，一组使用`OR`连接的`LIKE`条件，这个例子可以看到sqala构建查询的灵活性：

```scala
val list = List("a", "b", "c")

val query =
    from(User).filter(u => list.map(i => u.name.contains(i)).reduce((x, y) => x || y))
```

## 封装共用操作

由于sqala的各种操作实际上都是产生一个对象，因此我们可以很容易地将其封装在方法内，但请注意，这样的封装方法需要`(using QueryContext[L])`：

```scala
// L参数是sqala内部处理使用的，表示查询所在层级
def joinTable[L <: Int](using QueryContext[L]) =
    Post.join(Comment).on((p, c) => p.id === c.postId)

val q1 =
    from(joinTable).filter((p, _) => p.id === 1)

val q2 =
    from(joinTable).sortBy((p, c) => (p.title, c.title))
```

## 提升可读性

子查询可以在`filter`等子句的Lambda内部提取为变量，以提高代码可读性：

```scala
val query =
    from(Post).filter: p =>
        val avgQuery = from(Post).map(pp => avg(pp.likeCount))
        p.likeCount > avgQuery
```

注意子查询必须定义在使用它的更深层作用域中，不能先定义在外部再引用，否则会返回编译错误：`A subquery cannot be referenced from an outer or sibling scope; it must be defined in a deeper scope.`
