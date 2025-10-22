# Metadata Configuration

Before creating queries using sqala, we create entity classes corresponding to the database tables and add the metadata information required by sqala.

## Adding Dependencies

Before using sqala, ensure that the sqala dependency is added:

```scala
libraryDependencies += "com.wz7982" % "sqala-jdbc_3" % "latest.integration"
```

Metadata-related settings usually require `import sqala.metadata.*`.

## Basic Configuration

Let's take the following two database tables (MySQL) as an example:

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

We can create two corresponding `case class`es in Scala:

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

The field names and types of the `case class` correspond to the database table structure, and nullable fields use `Option`.

By default, sqala maps camelCase field names to snake_case database column names.

sqala does not require an additional table structure object like other query libraries. After creating the `case class`, we can use sqala to build queries:

```scala
import sqala.static.dsl.*

val q = query:
    from[Department].filter(d => d.id == 1)
```

## Custom Field Types

The field types supported by sqala include:

| Field Type                | Field Type               |
|:-------------------------:|:-------------------------:|
| scala.Int                 | scala.String             |
| scala.Long                | scala.Boolean            |
| scala.Float               | java.time.LocalDate      |
| scala.Double              | java.time.LocalDateTime  |
| scala.math.BigDecimal     | Option types of the above |
| sqala.metadata.Json       |                          |

So in the example above, we use `Int` to receive the `state` field of the employee table. However, using `Int` to manage such an enum field is neither safe nor meaningful. Therefore, we prefer to use Scala3's `enum` to manage such fields:

```scala
enum EmployeeState:
    case Active
    case Separated
```

Then we modify the entity class to:

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

But when we build the query:

```scala
import sqala.static.dsl.*

val q = query:
    from[Employee].filter(e => e.state == EmployeeState.Active)
```

sqala will return a compilation error. The reason is that sqala does not know how to handle such fields, generate queries for them, or deserialize them from query results.

Therefore, we need to provide an implementation of `trait CustomField` for custom types, and it is recommended to place the implementation in the companion object of the custom type:

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

The two type parameters of `Custom` are the type to be implemented and the base type to be mapped to; the `fromValue` method handles how to create a value of the custom type from the base type, and the `toValue` method does the opposite.

This way, we can use `Employee` to construct queries normally.

## Setting Primary Keys

sqala supports the `primaryKey` and `autoInc` annotations to mark primary key fields and auto-increment primary keys. Therefore, we can modify the two entity classes to:

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

sqala supports multiple `primaryKey` fields in an entity class but only one `autoInc` field.

## Custom Names

If the entity class and database table do not conform to the camelCase to snake_case field name mapping rule, you can use the `entityTable` and `column` annotations to manually manage names:

```scala
import sqala.metadata.*

@entityTable("department")
case class Department(
    @autoInc @column("id") id: Int,
    managerId: Option[Int],
    name: String
)
```
