# 条件构建查询

sqala提供了静态且类型安全的查询构建DSL，但也支持在一定程度上依据不同条件构建查询，以下为几种常用示例。

## 动态排序

sqala为过滤操作提供了`filterIf`，排序虽无对应操作，但可以按以下方式实现动态排序：

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

动态分组查询可以按以下方式构建：

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

我们可以构建一组由`OR`连接的`LIKE`条件，该示例体现了sqala构建查询的灵活性：

```scala
val list = List("a", "b", "c")

val query =
    from(User).filter(u => list.map(i => u.name.contains(i)).reduce((x, y) => x || y))
```

## 封装共用操作

sqala的各类操作实际上都会生成一个对象，因此很容易将其封装在方法中。请注意，此类封装方法需要`(using QueryContext[L])`：

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

子查询可以在`filter`等子句的Lambda内部提取为变量，以提升代码可读性：

```scala
val query =
    from(Post).filter: p =>
        val avgQuery = from(Post).map(pp => avg(pp.likeCount))
        p.likeCount > avgQuery
```

注意，子查询必须定义在其使用处所在的更深层作用域中，不能先定义于外部作用域再引用，否则会产生编译错误：`A subquery cannot be referenced from an outer or sibling scope; it must be defined in a deeper scope.`
