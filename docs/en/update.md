# CUD Operations

## Insert

sqala supports generating insert statements directly from entity objects:

```scala
val department: Department = ???

val i = insert(department)
```

Supports batch writing using a list of objects:

```scala
val departments: List[Department] = ???

val i = insert(departments)
```

Fields marked with `autoInc` will be skipped when generating SQL.

Of course, we can also use DSL to build INSERT statements, allowing for more precise specification of the fields to be inserted:

```scala
val i1 = insert[Department](d => (d.managerId, d.name)) values (1, "IT")

val i2 = insert[Department](d => (d.managerId, d.name)) values List((1, "IT"), (2, "Legal"))
```

## Update

For entity objects with primary key fields marked with `primaryKey` or `autoInc`, SQL for updating by primary key can be directly generated:

```scala
// Entity class definition omitted
val department: Department = ???

val u = update(department)
```

An additional `skipNone` parameter can be passed, which will skip fields with `None` values during the update:

```scala
val u = update(department, skipNone = true)
```

We can also use DSL to build UPDATE statements:

```scala
val u = update[Department].set(d => d.name := "IT").where(_.id == 1)
```

The right side of `:=` can not only be a simple value but also other expressions:

```scala
val u = update[A].set(a => a.x := a.x + 1)
```

## Delete

We can use DSL to build DELETE statements:

```scala
val d = delete[Department].where(_.id === 1)
```

## Insert or Update by Primary Key

We can use the `save` method to generate SQL statements for inserting or updating data using the primary key, provided that the primary key fields are configured on the entity class:

```scala
val department: Department = ???

val s = save(department)
```
