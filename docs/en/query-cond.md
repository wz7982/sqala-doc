# Conditional Query Building

sqala provides a static, type-safe DSL for building queries, but it also supports assembling queries under different conditions to some extent. Below are some common use cases.

## Dynamic Sorting

sqala provides `filterIf` for filtering, but no similar operation exists for sorting. Dynamic sorting can still be achieved as follows:

```scala
// Assume this comes from user input
val key: String = ???

val baseQuery = from(Post)

val query =
    key match
        case "likeCount" => baseQuery.sortBy(p => p.likeCount.desc)
        case "viewCount" => baseQuery.sortBy(p => p.viewCount.desc)
        case _ => baseQuery.sortBy(p => p.id.desc)
```

## Dynamic Grouping

A dynamic grouping query can be built as follows:

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

## Generating OR Conditions from a List

We can build a set of `LIKE` conditions connected with `OR`. This example demonstrates the flexibility of query building in sqala:

```scala
val list = List("a", "b", "c")

val query =
    from(User).filter(u => list.map(i => u.name.contains(i)).reduce((x, y) => x || y))
```

## Encapsulating Shared Operations

Since every operation in sqala produces an object, it can easily be encapsulated in a method. Note that such an encapsulating method requires `(using QueryContext[L])`:

```scala
// The L parameter is used internally by sqala and represents the level at which the query is located
def joinTable[L <: Int](using QueryContext[L]) =
    Post.join(Comment).on((p, c) => p.id === c.postId)

val q1 =
    from(joinTable).filter((p, _) => p.id === 1)

val q2 =
    from(joinTable).sortBy((p, c) => (p.title, c.title))
```

## Improving Readability

A subquery can be extracted into a variable inside the lambda of clauses such as `filter` to improve readability:

```scala
val query =
    from(Post).filter: p =>
        val avgQuery = from(Post).map(pp => avg(pp.likeCount))
        p.likeCount > avgQuery
```

Note that a subquery must be defined in a scope nested deeper than where it is used; defining it in an outer scope and referencing it later results in a compile error: `A subquery cannot be referenced from an outer or sibling scope; it must be defined in a deeper scope.`
