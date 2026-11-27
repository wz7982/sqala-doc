# CUD DSL

The [database interaction](./database.md) section introduced how to use entity objects to insert, update, and delete data. In addition to entity objects, sqala also supports building statements with a CUD DSL, to meet more flexible data processing needs.

The examples below are based on this entity:

```scala
import sqala.metadata.annotations.*
import sqala.static.dsl.*

@table(name = "department")
case class Department(@autoInc id: Int, name: String, managerId: Int)
```

Just like queries, statements built with the DSL are pure data structures and must be passed to `db.execute` for execution; `db.execute` returns the number of affected rows.

## Insert

```scala
val i1 = insert[Department](d => (d.managerId, d.name)).values((1, "IT"))

val affected: Int = db.execute(i1)
```

To insert multiple rows at once, pass a `List` of tuples to `values`:

```scala
val i2 = insert[Department](d => (d.managerId, d.name)).values(List((1, "IT"), (2, "Legal")))

db.execute(i2)
```

You can also insert from a subquery using `query` (INSERT ... SELECT):

```scala
val i3 = insert[Department](d => (d.managerId, d.name)).query(
    from(Department).map(d => (d.managerId, d.name))
)

db.execute(i3)
```

## Update

```scala
val u = update[Department].set(d => d.name := "IT").where(_.id === 1)

db.execute(u)
```

The right-hand side of `:=` accepts not only plain values but also other expressions:

```scala
val u = update[Department].set(d => d.managerId := d.managerId + 1).where(_.id === 1)
```

`set` can be called multiple times; the assignments from each call accumulate into the `SET` clause of the same SQL statement:

```scala
val u = update[Department].set(d => d.name := "IT").set(d => d.managerId := 3).where(_.id === 1)
```

## Delete

```scala
val d = delete[Department].where(_.id === 1)

db.execute(d)
```

## Insert or Update

The `db.save` method decides whether to insert or update based on the primary key. The entity must have a primary key and at least one updatable field besides it; otherwise an error is thrown at runtime. The SQL generated on major databases is:

| Database Type | Generated SQL |
|------------|----------|
| PostgreSQL | `INSERT INTO ... ON CONFLICT ... DO UPDATE SET` |
| MySQL | `INSERT INTO ... ON DUPLICATE KEY UPDATE` |
| Oracle | `MERGE INTO` |

## Generating SQL Text Offline

As with queries, all four statement builders (the products of `insert`/`update`/`delete`/`save`) provide a `sql` method that generates plain-text SQL without connecting to a database, which is convenient for debugging and logging:

```scala
val text: String = u.sql(dialect)
```
