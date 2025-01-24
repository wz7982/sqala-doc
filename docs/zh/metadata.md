# 元数据配置

在使用sqala创建查询之前，我们创建与数据表对应的实体类并添加sqala需要的元数据信息。

## 引入依赖

在使用sqala之前，确保引入sqala的依赖：

```scala
libraryDependencies += "com.wz7982" % "sqala-jdbc_3" % "latest.integration"
```

元数据相关的设置通常需要`import sqala.metadata.*`。

## 基础配置

我们以下面两个数据库表（MySQL）为例：

```scala
CREATE TABLE department(
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `manager_id` INT NOT NULL,
    `name` VARCHAR(50) NOT NULL
);

CREATE TABLE employee(
    `id` INT PRIMARY KEY AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `salary` DECIMAL(10, 2) NOT NULL,
    `hire_date` DATE NOT NULL,
    `manager_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `email` VARCHAR(50),
    `state` TINYINT NOT NULL
);
```

我们可以在Scala里创建两个对应的`case class`：

```scala
import java.time.LocalDate

case class Department(
    id: Int,
    managerId: Int,
    name: String
)

case class Employee(
    id: Int,
    name: String,
    salary: BigDecimal,
    hireDate: LocalDate,
    managerId: Int,
    departmentId: Int,
    email: Option[String],
    state: Int,
)
```

`case class`的字段名和类型与数据库表结构对应，可空字段使用`Option`。

在默认情况下，sqala将驼峰风格字段名映射到蛇形风格的数据库列名。

sqala无需像其他查询库那样额外定义一个表结构对象，在创建好`case class`后，我们就可以使用sqala来构建查询了：

```scala
import sqala.static.dsl.*

val q =
    from[Department].filter(d => d.id == 1)
```

## 自定义字段类型

sqala内置支持的字段类型有：

|字段类型                |字段类型               |
|:---------------------:|:---------------------:|
|scala.Int              |scala.String           |
|scala.Long             |scala.Boolean          |
|scala.Float            |java.time.LocalDate    |
|scala.Double           |java.time.LocalDateTime|
|scala.math.BigDecimal  |以上类型对应的Option类型 |
|sqala.metadata.Json  |                       |

所以在上面的例子中，我们使用`Int`来接收员工表的`state`字段，但是使用`Int`管理这样的枚举字段，既不安全，数值也没有实际意义，因此我们更希望使用Scala3的`enum`来管理这样的字段：

```scala
enum EmployeeState:
    case Active
    case Separated
```

然后我们将实体类改为：

```scala
case class Employee(
    id: Int,
    name: String,
    salary: BigDecimal,
    hireDate: LocalDate,
    managerId: Option[Int],
    departmentId: Int,
    state: EmployeeState
)
```

但当我们构建查询时：

```scala
import sqala.static.dsl.*

val q =
    from[Employee].filter(e => e.state == EmployeeState.Active)
```

sqala会返回一个编译错误。原因是sqala不知道如何处理这样的字段，为其生成查询，或从查询结果中反序列化。

因此我们需要为自定义类型提供`trait CustomField`的实现，并建议将实现放入自定义类型的伴生对象中：

```scala
import sqala.metadata.*

enum EmployeeState:
    case Active
    case Separated

object EmployeeState:
    given CustomField[EmployeeState, Int] with
        override def fromValue(x: Int): EmployeeState = x match
            case 1 => Active
            case 0 => Separated

        override def toValue(x: EmployeeState): Int = x match
            case Active => 1
            case Separated => 0
```

`Custom`的两个类型参数分别为要实现的类型，和要映射到的基础类型；`fromValue`方法处理如何从基础类型创建自定义类型的值，`toValue`方法含义反之。

这样，就可以正常使用`Employee`构造查询了。

## 设置主键

sqala支持`primaryKey`和`autoInc`注解标记主键字段和自增主键，因此，我们可以将两个实体类改为：

```scala
import sqala.metadata.*

import java.time.LocalDate

case class Department(
    @autoInc id: Int,
    managerId: Int,
    name: String
)

case class Employee(
    @autoInc id: Int,
    name: String,
    salary: BigDecimal,
    hireDate: LocalDate,
    managerId: Option[Int],
    departmentId: Int,
    state: EmployeeState
)
```

sqala支持一个实体类中有多个`primaryKey`字段，但只支持一个`autoInc`字段。

## 自定义名称

如果实体类和数据库表不符合驼峰风格字段名映射到蛇形风格规则的话，可以使用`table`和`column`注解手动管理名称：

```scala
import sqala.metadata.*

@table("department")
case class Department(
    @autoInc @column("id") id: Int,
    managerId: Option[Int],
    name: String
)
```