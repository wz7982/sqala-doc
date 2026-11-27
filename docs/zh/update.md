# 增删改DSL

[数据库交互](./database.md)部分介绍了如何使用实体对象进行增删改操作。除实体对象外，sqala还支持通过增删改DSL构建语句，以满足更灵活的数据处理需求。

以下示例基于这个实体：

```scala
import sqala.metadata.annotations.*
import sqala.static.dsl.*

@table(name = "department")
case class Department(@autoInc id: Int, name: String, managerId: Int)
```

与查询一样，DSL构建出的语句也是纯数据结构，需要交给`db.execute`执行；`db.execute`返回受影响行数。

## 新增

```scala
val i1 = insert[Department](d => (d.managerId, d.name)).values((1, "IT"))

val affected: Int = db.execute(i1)
```

一次插入多行时，向`values`传入元组的`List`：

```scala
val i2 = insert[Department](d => (d.managerId, d.name)).values(List((1, "IT"), (2, "Legal")))

db.execute(i2)
```

也可通过`query`从子查询插入（INSERT ... SELECT）：

```scala
val i3 = insert[Department](d => (d.managerId, d.name)).query(
    from(Department).map(d => (d.managerId, d.name))
)

db.execute(i3)
```

## 更新

```scala
val u = update[Department].set(d => d.name := "IT").where(_.id === 1)

db.execute(u)
```

`:=`右侧不仅可以是简单值，也可以是其他表达式：

```scala
val u = update[Department].set(d => d.managerId := d.managerId + 1).where(_.id === 1)
```

`set`可以多次调用，每次产生的赋值会累加到同一条SQL的`SET`子句中：

```scala
val u = update[Department].set(d => d.name := "IT").set(d => d.managerId := 3).where(_.id === 1)
```

## 删除

```scala
val d = delete[Department].where(_.id === 1)

db.execute(d)
```

## 新增或更新

`db.save`方法按主键决定执行新增还是更新。实体必须有主键，且除主键外至少还有一个可更新字段，否则会在运行时报错。其在各主流数据库中生成的SQL为：

| 数据库类型 | 生成 SQL |
|------------|----------|
| PostgreSQL | `INSERT INTO ... ON CONFLICT ... DO UPDATE SET` |
| MySQL | `INSERT INTO ... ON DUPLICATE KEY UPDATE` |
| Oracle | `MERGE INTO` |

## 离线生成SQL文本

与查询DSL一样，四种语句构建器（`insert`/`update`/`delete`/`save`产物）都提供`sql`方法，可在不连接数据库的情况下生成纯文本SQL，便于调试与记录日志：

```scala
val text: String = u.sql(dialect)
```
