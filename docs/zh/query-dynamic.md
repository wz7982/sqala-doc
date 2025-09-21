# 动态构建查询

sqala提供了静态且类型安全的DSL用于构建查询，但也支持在一定程度上构建动态查询，以下是一些常用用例。

## 动态排序

sqala对于过滤操作提供了`filterIf`，但对于排序没有提供类似的操作，但我们可以在`sortBy`的函数里编写类似这样的代码，以达到动态排序目的：

```scala
// 假设是用户传参
val key: String = ???

val q = query:
    from(Post).sortBy: p =>
        key match
            case "likeCount" => p.likeCount.desc
            case "viewCount" => p.viewCount.desc
            case _ => p.id.asc
```

## 动态分组

对于`groupBy`这样类型要求比较严格的方法，我们可以以外置控制流的方式来做到动态查询：

```scala
case class Data(dim1: Int, dim2: Int, dim3: Int, measure: Int)

val dim: Int = ???

val q = query:
    val baseQuery = from(Data)

    if dim == 1 then
        baseQuery.groupBy(d => d.dim1).map(d => (d.dim1, sum(d.measure)))
    else if dim == 2 then
        baseQuery.groupBy(d => d.dim2).map(d => (d.dim2, sum(d.measure)))
    else
        baseQuery.groupBy(d => d.dim3).map(d => (d.dim3, sum(d.measure)))
```

## 按列表生成OR条件

对于某些早期版本的数据库，可能无法在`IN`中使用索引，因此我们可以使用`OR`连接条件的方式，我们可以这样构造这样的动态查询：

```scala
val list = List(1, 2, 3)

val q = query:
    from(User).filter(u => list.map(i => u.id == i).reduce((x, y) => x || y))
```

## 封装共用操作

由于sqala的各种操作实际上都是产生一个对象，因此我们可以很容易地将其封装在方法内，但请注意，这样的封装方法需要`(using QueryContext)`：

```scala
def joinTable(using QueryContext) = Post.join(Comment).on((p, c) => p.id == c.postId)

val q1 = query:
    from(joinTable).filter((p, _) => p.id == 1)

val q2 = query:
    from(joinTable).sortBy((p, c) => (p.title, c.title))
```

## 提升可读性

在同一个`query`上下文里，我们可以将子查询等结构提出一个变量来提高代码可读性：

```scala
val q = query:
    val avgQuery = from(Post).map(p => avg(e.likeCount))

    from(Post).filter(p => p.likeCount > avgQuery)
```