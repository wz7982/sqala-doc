# Custom Expressions

For the non-standard parts of SQL, sqala provides a degree of customization so that you can avoid native SQL as much as possible.

## Defining Functions

The `createFunc` method creates SQL functions. Its parameters are the function name and an argument list `List[Expr[?, ?]]`. Take MySQL's `LEFT` function as an example:

```scala
// The L parameter is used internally by sqala and represents the level of the query
def left[L <: Int](x: Expr[String, ?], n: Int)(using QueryContext[L]) =
    createFunc[Option[String], L]("LEFT", x :: n.asExpr :: Nil)
```

Now we can use it in a query:

```scala
val query =
    from(Post)
        .map(p => left(p.title, 10))
```

sqala supports more fine-grained customization, but this requires some understanding of the SQL syntax tree structure. Refer to the definition of the `sqala.ast.expr.SqlExpr` type in the sqala source code.

## Defining Binary Operators

`createBinaryExpr` creates custom SQL binary operators. Take PostgreSQL's `->>` as an example:

```scala
// The L parameter is used internally by sqala and represents the level of the query
extension [L <: Int](x: Expr[Json, ?])(using QueryContext[L])
    def ->>(k: String) =
        createBinaryExpr[Boolean, L](x, "->>", k.asExpr)
```

Now we can use it in a query:

```scala
val query =
    from(Post)
        .map(p => jsonObject("id" -> p.id) ->> "id")
```
