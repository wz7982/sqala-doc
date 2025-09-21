# 增删改DSL

[数据库交互](./database.md)部分介绍了如何使用实体对象进行新增删除操作，除了使用实体对象外，sqala还支持增删改DSL构建，支持更灵活的数据处理需求。

## 新增

```scala
val i1 = insert[Department](d => (d.managerId, d.name)).values(1, "IT")

val i2 = insert[Department](d => (d.managerId, d.name)).values(List((1, "IT"), (2, "Legal")))
```

## 更新

```scala
val u = update[Department].set(d => d.name := "IT").where(_.id == 1)
```

`:=`右侧不仅可以是简单的值，也可以是其它表达式：

```scala
val u = update[A].set(a => a.x := a.x + 1)
```

## 删除

```scala
val d = delete[Department].where(_.id == 1)
```