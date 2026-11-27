# 自定义表达式

对于SQL中的非标准部分，sqala提供了一定程度的自定义能力，帮助尽量规避原生SQL。

## 原始表达式

某些数据库方言包含sqala表达式系统无法覆盖的特殊语法，例如MySQL的全文检索语法。这种场景下，可以使用`rawExpr`插值器直接书写SQL片段，它是最后的兜底逃生舱。

插值参数支持值、表达式、子查询以及由它们组成的元组，均会自动转义或以`?`参数绑定，无需在字符串中手动拼接引号等符号；末尾必须调用`as`指定结果类型：

```scala
val word = "sqala"

val query =
    from(Post).filter(p => rawExpr"MATCH(${p.title}) AGAINST(${word})".as[Boolean])
```

注意：`rawExpr`中的字面SQL文本会原样进入最终SQL，请确保其中不含拼接的不可信内容。

## 定义函数

`createFunc`方法用于生成SQL函数调用表达式，参数为函数名和参数列表`List[Expr[?, ?]]`，以MySQL的`LEFT`函数为例：

```scala
// L参数是sqala内部处理使用的，表示查询所在层级
def left[L <: Int](x: Expr[String, ?], n: Int)(using QueryContext[L]) =
    createFunc[Option[String], L]("LEFT", x :: n.asExpr :: Nil)
```

即可在查询中使用：

```scala
val query =
    from(Post)
        .map(p => left(p.title, 10))
```

sqala还支持更细致的自定义，但需要了解SQL语法树的结构，请参考sqala源码中`sqala.ast.expr.SqlExpr`类型的定义。

## 定义二元运算符

`createBinaryExpr`用于自定义SQL二元运算符，以PostgreSQL的`->>`为例：

```scala
// L参数是sqala内部处理使用的，表示查询所在层级
extension [L <: Int](x: Expr[Json, ?])(using QueryContext[L])
    def ->>(k: String) =
        createBinaryExpr[Boolean, L](x, "->>", k.asExpr)
```

即可在查询中使用：

```scala
val query =
    from(Post)
        .map(p => jsonObject("id" -> p.id) ->> "id")
```

## 限制说明

`createFunc`和`createBinaryExpr`的返回类型均为`Expr[T, Composite[EmptyTuple]]`：自定义表达式被视为独立的组合单元，传入的列引用参数不会参与分组、聚合等语义检查。也就是说，即使将未分组的列传入自定义函数，编译器也不会报错，需由调用者自行保证SQL语义的正确性。
