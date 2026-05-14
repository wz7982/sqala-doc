# 自定义表达式

对于SQL中的非标准部分，sqala提供了一定程度的自定义能力，可以尽量避免原生SQL。

## 定义函数

`createFunction`方法用于创建SQL函数，参数是函数名和参数列表`List[Expr[?, ?]]`，我们以MySQL的`LEFT`函数为例：

```scala
// L参数是sqala内部处理使用的，表示查询所在层级
def left[L <: Int](x: Expr[String, ?], n: Int)(using QueryContext[L]) =
    createFunction[Option[String], L]("LEFT", x :: n.asExpr :: Nil)
```

我们就可以在查询中使用了：

```scala
val q =
    from(Post)
        .map(p => left(p.title, 10))
```

sqala支持更细致的自定义，但需要对SQL语法树结构有一定程度的了解，请自行参考sqala代码中的`sqala.ast.expr.SqlExpr`类型的定义。

## 定义二元运算符

`createBinaryExpr`用于自定义SQL二元运算符，我们以PostgreSQL的`->>`为例：

```scala
// L参数是sqala内部处理使用的，表示查询所在层级
extension [L <: Int](x: Expr[Json, ?])(using QueryContext[L])
    def ->>(k: String) =
        createBinaryExpr[Boolean, L](x, "->>", k.asExpr)
```

我们就可以在查询中使用了：

```scala
val q =
    from(Post)
        .map(p => jsonObject("id" value p.id) ->> "id")
```