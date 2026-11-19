# CUD DSL

The [database interaction](./database.md) section introduced how to use entity objects to insert and delete data. Besides entity objects, sqala also supports building statements with a CUD DSL, supporting more flexible data processing needs.

## Insert

```scala
val i1 = insert[Department](d => (d.managerId, d.name)).values((1, "IT"))

val i2 = insert[Department](d => (d.managerId, d.name)).values(List((1, "IT"), (2, "Legal")))
```

## Update

```scala
val u = update[Department].set(d => d.name := "IT").where(_.id === 1)
```

The right side of `:=` can be not only a simple value but also another expression:

```scala
val u = update[A].set(a => a.x := a.x + 1)
```

## Delete

```scala
val d = delete[Department].where(_.id === 1)
```

## Insert or Update

The `db.save` method decides whether to insert or update based on the primary key. The SQL generated in major databases is:

| Database Type | Generated SQL |
|------------|----------|
| PostgreSQL | `INSERT INTO ... ON CONFLICT ... DO UPDATE SET` |
| MySQL | `INSERT INTO ... ON DUPLICATE KEY UPDATE` |
| Oracle | `MERGE INTO` |
