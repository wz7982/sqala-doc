# 属性图查询

> 本页功能属于 `sqala-static-ext` 模块，需要额外引入该模块，并导入：
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


属性图查询是SQL 2023标准新引入的功能，用于匹配复杂的图状数据。目前主流关系型数据库中仅Oracle支持此功能，PostgreSQL预计将在19版本提供支持。

sqala选择先基于SQL标准实现该功能，待您的数据库支持后即可无缝接入，无需等待查询库跟进。

首先，需要在sqala中描述图数据：

```scala
case class Person(id: Int, name: String)

case class Friendship(personAId: Int, personBId: Int, meetingDate: LocalDate)

// sqala不关心数据库中实际使用哪个字段关联点和边，只关心点和边的类型、标签名称
val friendGraph = createGraph(name = "friend_graph")(
    person = vertex[Person](label = "person"),
    friends = edge[Friendship](label = "friendship")
)
```

然后，使用`graphTable`创建图查询：

```scala
val query =
    from:
        graphTable(friendGraph)(g =>
            g.matching:
                // is方法用于匹配标签类型，g的字段是我们在createGraph中定义的点和边的字段
                // 为了不与Scala关键字<-和标准库方法->冲突，以及避免优先级问题，sqala的图匹配符号使用||括起来
                // 支持的连接符有-、~、<-、->、<~、~>

                // 边可以有自己的过滤条件和量词
                // 量词支持+ * ?
                // least(n) 对应{n,}
                // most(n) 对应{,n}
                // between(m, n) 对应{m, n}
                // at(n) 对应{n}
                ("a" is g.person) |-| ("f" is g.friends.filter(f => f.personAId > 1).between(1, 10)) |->| ("b" is g.person)
            // p的字段是`matching`中使用字符串定义的标签名，sqala会自动生成对应的字段
            .filter(p => p.a.id > 1)
            // 定义返回字段，使用命名元组
            .columns: p =>
                (
                    personA = p.a.name,
                    personB = p.b.name,
                    meetingDate = p.f.meetingDate
                )
        )
```

生成的SQL为：

```sql
SELECT
    "t4"."c1" AS "c1",
    "t4"."c2" AS "c2",
    "t4"."c3" AS "c3"
FROM
    GRAPH_TABLE(
        "friend_graph"
        MATCH
            ("t1" IS "person") -["t2" IS "friendship" WHERE "t2"."person_a_id" > 1]->{1,10} ("t3" IS "person")
        WHERE
            "t1"."id" > 1
        COLUMNS(
            "t1"."name" AS "c1",
            "t3"."name" AS "c2",
            "t2"."meeting_date" AS "c3"
        )
    ) AS "t4"
```
