# 自定义表达式

对于SQL中的非标准部分，sqala提供了一定程度的自定义能力，可以尽量避免原生SQL。

## 定义函数

`createFunction`方法用于创建SQL函数，参数是函数名和参数列表`List[Expr[?, ?]]`，我们以MySQL的`LEFT`函数为例：

```scala
def left(x: Expr[String, ?], n: Int)(using QueryContext) =
    createFunction("LEFT", x :: n.asExpr :: Nil)
```

我们就可以在查询中使用了：

```scala
val q = query:
    from(Post)
        .map(p => left(p.title, 10))
```

sqala支持更细致的自定义，但需要对SQL语法树结构有一定程度的了解，请自行参考sqala代码中的`sqala.ast.expr.SqlExpr`类型的定义。

## 定义二元运算符

`createBinaryExpr`用于自定义SQL二元运算符，我们以PostgreSQL的`->>`为例：

```scala
extension (x: Expr[Json, ?])(using QueryContext)
    def ->>(k: String) =
        createBinaryExpr(x, "->>", k.asExpr)
```

我们就可以在查询中使用了：

```scala
val q = query:
    from(Post)
        .map(p => jsonObject("id" value p.id) ->> "id")
```

## 原生表达式

某些数据库方言中可能含有无法被sqala表达式系统概括的特殊语法，比如MySQL的全文检索语法，这种场景我们可以使用`rawExpr`字符串插值器来创建原生表达式，然后使用`as`方法声明表达式类型：

```scala
val word = "abc"
val q = query:
    from(Post)
        .filter(p => rawExpr"MATCH(${p.title}) AGAINST(${word})".as[Boolean])
```

表达式插值器支持值、[表达式](./expr.md)和他们组成的元组，字符串中无需手动拼接引号，圆括号等符号，sqala会自动处理并进行安全转义。