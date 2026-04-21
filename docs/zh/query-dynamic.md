# 动态构建查询

sqala提供了静态且类型安全的DSL用于构建查询，但也支持在一定程度上构建动态查询，以下是一些常用用例。

## 动态排序

sqala对于过滤操作提供了`filterIf`，但对于排序没有提供类似的操作，但我们可以这样达到动态排序目的：

```scala
// 假设是用户传参
val key: String = ???

val q = query:
    val baseQuery = from(Post)

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

val q = query:
    val baseQuery = from(Data)

    val grouping = if dim == 1 then
        baseQuery.groupBy(d => d.dim1)
    else if dim == 2 then
        baseQuery.groupBy(d => d.dim2)
    else
        baseQuery.groupBy(d => d.dim3)

    grouping.map((g, d) => (g, sum(d.measure)))
```

## 按列表生成OR条件

我们可以这样构建，一组使用`OR`连接的`LIKE`条件，这个例子可以看到sqala构建查询的灵活性：

```scala
val list = List("a", "b", "c")

val q = query:
    from(User).filter(u => list.map(i => u.name.contains(i)).reduce((x, y) => x || y))
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