# 增删改

## 插入

sqala支持实体对象直接生成插入语句：

```scala
val department: Department = ???

val i = insert(department)
```

支持使用对象列表批量写入：

```scala
val departments: List[Department] = ???

val i = insert(departments)
```

使用`autoInc`标记的字段会在生成SQL时跳过。

当然我们也可以使用DSL来构建INSERT语句，这样就可以更精细地指定插入字段：

```scala
val i1 = insert[Department](d => (d.managerId, d.name)) values (1, "IT")

val i2 = insert[Department](d => (d.managerId, d.name)) values List((1, "IT"), (2, "Legal"))
```

## 更新

对于使用`primaryKey`或`autoInc`标记好主键字段的实体对象，可以直接生成按主键更新的SQL：

```scala
// 省略实体类定义
val department: Department = ???

val u = update(department)
```

可以额外传入一个`skipNone`参数，则会则更新时跳过值为`None`的字段：

```scala
val u = update(department, skipNone = true)
```

我们也可以使用DSL来构建UPDATE语句：

```scala
val u = update[Department].set(d => d.name := "IT").where(_.id == 1)
```

`:=`右侧不仅可以是简单的值，也可以是其它表达式：

```scala
val u = update[A].set(a => a.x := a.x + 1)
```

## 删除

我们可以使用DSL来构建DELETE语句：

```scala
val d = delete[Department].where(_.id === 1)
```

## 按主键插入或更新

我们可以使用`save`方法来生成使用主键插入或更新数据的SQL语句，前提是实体类上配置好了主键字段：

```scala
val department: Department = ???

val s = save(department)
```