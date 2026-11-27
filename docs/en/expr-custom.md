# Custom Expressions

For the non-standard parts of SQL, sqala provides a degree of customization, allowing you to avoid native SQL as much as possible.

## Raw Expressions

Some database dialects contain special syntax that the sqala expression system cannot express, such as MySQL's full-text search syntax. For these cases, the `rawExpr` interpolator lets you write SQL fragments directly, serving as an escape hatch of last resort.

Interpolated arguments may be values, expressions, subqueries, or tuples composed of them; each is automatically escaped or bound as a `?` parameter, so you do not need to concatenate quotes or other symbols by hand. The call must end with `as` to specify the result type:

```scala
val word = "sqala"

val query =
    from(Post).filter(p => rawExpr"MATCH(${p.title}) AGAINST(${word})".as[Boolean])
```

Note that the literal SQL text inside `rawExpr` is emitted into the final SQL verbatim, so make sure it contains no concatenated untrusted content.

## Defining Functions

The `createFunc` method generates an SQL function call expression. It takes the function name and an argument list `List[Expr[?, ?]]`. Take MySQL's `LEFT` function as an example:

```scala
// The L parameter is used internally by sqala and represents the level of the query
def left[L <: Int](x: Expr[String, ?], n: Int)(using QueryContext[L]) =
    createFunc[Option[String], L]("LEFT", x :: n.asExpr :: Nil)
```

It can then be used in a query:

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

It can then be used in a query:

```scala
val query =
    from(Post)
        .map(p => jsonObject("id" -> p.id) ->> "id")
```

## Limitations

Both `createFunc` and `createBinaryExpr` return `Expr[T, Composite[EmptyTuple]]`: a custom expression is treated as an independent composite unit, and column references passed as arguments do not participate in grouping or aggregate semantic checks. In other words, the compiler will not report an error even if an ungrouped column is passed into a custom function — ensuring correct SQL semantics is the caller's responsibility.
