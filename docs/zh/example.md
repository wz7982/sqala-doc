# 示例

## 查询所有部门信息

```scala
val q =
    from[Department]
```

## 查询2020年1月1日后入职的员工信息

```scala
val q =
    from[Employee]
        .filter(e => e.hireDate > LocalDate.of(2020, 1, 1))
```

## 查询员工姓名和对应的部门名称

```scala
val q =
    from[Employee]
        .join[Department]((e, d) => e.departmentId == d.id)
        .map((e, d) => (employeeName = e.name, departmentName = d.name))
```

## 已知某员工id，查询比此员工薪水高的所有员工id和姓名

```scala
val employeeId: Int = ???

val q = queryContext:
    val querySalary = from[Employee]
        .filter(_.id == employeeId)
        .map(_.salary)

    from[Employee]
        .filter(_.salary > querySalary)
        .map(e => (id = e.id, name = e.name))
```

## 按部门统计员工平均薪水

```scala
val q =
    from[Employee]
        .groupBy(e => (deptId = e.departmentId))
        .map((g, e) => (deptId = g.deptId, salary = avg(e.salary)))
```

## 查询至少有一个员工的部门id

```scala
val q =
    from[Department]
        .leftJoin[Employee]((d, e) => d.id == e.departmentId)
        .groupBy((d, _) => (id = d.id))
        .having((_, _) => count() > 0)
        .map((g, _) => g.id)
```

## 查询所有员工和其上级的姓名

```scala
val q =
    from[Employee]
        .leftJoin[Employee]((e1, e2) => e1.managerId == e2.id)
        .map((e1, e2) => (name = e1.name, managerName = e2.name))
```

## 按部门统计薪水前三高的员工姓名

```scala
val q = queryContext:
    val subquery = from[Employee]
        .join[Department]((e, d) => e.departmentId == d.id)
        .map: (e, d) =>
            (
                employeeName = e.name,
                departmentName = d.name,
                rank = denseRank() over (partitionBy (d.id) sortBy (e.salary.desc))
            )
        
    fromQuery(subQuery).filter(r => r.rank <= 3)
```

## 计算员工的入职天数

```scala
import scala.language.postfixOps

val q =
    from[Employee].map: e => 
        extract(day from (now() - e.hireDate))
```

## 计算员工的收入评级

```scala
val q =
    from[Employee]
        .map: e =>
            (
                name = e.name,
                income =
                    `if` e.salary >= 50000 `then` "高"
                    `else if` e.salary >= 20000 && e.salary < 50000 `then` "中"
                    `else` "低"
            )
```

## 统计比同部门平均收入高的员工

```scala
val q =
    from[Employee]
        .filter: e1 => 
            e1.salary >
                from[Employee]
                    .filter(e2 => e1.departmentId == e2.departmentId)
                    .map(e2 => avg(e2.salary))
```