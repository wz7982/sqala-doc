# 查询构造技巧

## 查询复用

由于sqala使用Scala代码管理查询构造，因此可以很容易地将几个查询的共有部分封装起来，因为sqala的查询需要一个查询上下文，因此我们需要在查询封装时`using QueryContext`：

```scala
def baseQuery(using QueryContext) =
    from[Employee]
        .join[Department]((e, d) => e.departmentId == d.id)
```

这样，这个基础查询就可以在`queryContext`中多次使用，用于构建其他查询：

```scala
val q1 = queryContext:
    baseQuery.filter((e, d) => e.name == "小黑")

val q2 = queryContext:
    baseQuery.sortBy((e, d) => d.name)
```

## 条件构造

除了基础的`filterIf`用于构造可选过滤条件外，sqala还支持更灵活的条件构造查询，比如通过不同条件使用不同的字段分组：

```scala
case class Data(dim1: Int, dim2: Int, dim3: Int, measure: Int)

val dim: Int = ???

val q = queryContext:
    val baseQuery = from[Data]

    if dim == 1 then
        baseQuery.groupBy(d => (dim = d.dim1)).map(g, d) => (g.dim1, sum(d.measure))
    else if dim == 2 then
        baseQuery.groupBy(d => (dim = d.dim2)).map(g, d) => (g.dim2, sum(d.measure))
    else
        baseQuery.groupBy(d => (dim = d.dim3)).map(g, d) => (g.dim3, sum(d.measure))
```

## 提升子查询的可读性

在同一个`queryContext`上下文中，我们可以将能独立运行的子查询存入变量，无需像标准SQL那样嵌套子查询，以提高可读性：

```scala
val q = queryContext:
    val salaryAvg = from[Employee].map(e => avg(e.salary))

    from[Employee].filter(e => e.salary > salaryAvg)
```