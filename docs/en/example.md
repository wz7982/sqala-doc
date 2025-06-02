# Examples

## Query All Department Information

```scala
val q =
    from[Department]
```

## Query Employee Information Hired After January 1, 2020

```scala
val q =
    from[Employee]
        .filter(e => e.hireDate > LocalDate.of(2020, 1, 1))
```

## Query Employee Names and Corresponding Department Names

```scala
val q =
    from[Employee]
        .join[Department]((e, d) => e.departmentId == d.id)
        .map((e, d) => (employeeName = e.name, departmentName = d.name))
```

## Given an Employee ID, Query All Employees with Higher Salaries

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

## Calculate Average Salary by Department

```scala
val q =
    from[Employee]
        .groupBy(e => (deptId = e.departmentId))
        .map((g, e) => (deptId = g.deptId, salary = avg(e.salary)))
```

## Query id of Department with At Least One Employee

```scala
val q =
    from[Department]
        .leftJoin[Employee]((d, e) => d.id == e.departmentId)
        .groupBy((d, _) => (id = d.id))
        .having((_, _) => count() > 0)
        .map((g, _) => g.id)
```

## Query All Employees and Their Managers' Names

```scala
val q =
    from[Employee]
        .leftJoin[Employee]((e1, e2) => e1.managerId == e2.id)
        .map((e1, e2) => (name = e1.name, managerName = e2.name))
```

## Query Top 3 Highest-Paid Employees by Department

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

## Calculate Employee's Days Since Hire

```scala
import scala.language.postfixOps

val q =
    from[Employee].map: e => 
        extract(day from (now() - e.hireDate))
```

## Rank Employee's Income

```scala
val q =
    from[Employee]
        .map: e =>
            (
                name = e.name,
                income =
                    `if` e.salary >= 50000 `then` "High"
                    `else if` e.salary >= 20000 && e.salary < 50000 `then` "Medium"
                    `else` "Low"
            )
```

## Find Employees with Salaries Higher Than Department Average

```scala
val q =
    from[Employee]
        .filter: e1 => 
            e1.salary >
                from[Employee]
                    .filter(e2 => e1.departmentId == e2.departmentId)
                    .map(e2 => avg(e2.salary))
```