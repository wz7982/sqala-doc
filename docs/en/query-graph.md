# Property Graph Queries

> The features on this page belong to the `sqala-static-ext` module, which requires an additional dependency. Import:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


Property graph queries are a new feature introduced in the SQL 2023 standard for matching complex graph-shaped data. Currently, Oracle is the only mainstream relational database that supports this feature; PostgreSQL is expected to add support in version 19.

sqala implements this feature against the SQL standard first, so that once your database supports it, you can adopt it seamlessly without waiting for the query library to catch up.

First, describe the graph data in sqala:

```scala
case class Person(id: Int, name: String)

case class Friendship(personAId: Int, personBId: Int, meetingDate: LocalDate)

// sqala does not care which fields the database actually uses to associate vertices and edges; it only cares about the types and label names of vertices and edges
val friendGraph = createGraph(name = "friend_graph")(
    person = vertex[Person](label = "person"),
    friends = edge[Friendship](label = "friendship")
)
```

Then, use `graphTable` to create a graph query:

```scala
val query =
    from:
        graphTable(friendGraph)(g =>
            g.matching:
                // The is method matches the label type; the fields of g are the vertex and edge fields we defined in createGraph
                // To avoid conflicts with the Scala keyword <- and the standard library method ->, and to avoid precedence issues, sqala wraps graph matching symbols in ||
                // Supported connectors are -, ~, <-, ->, <~, ~>

                // Edges can have their own filter conditions and quantifiers
                // Quantifiers support + * ?
                // least(n) corresponds to {n,}
                // most(n) corresponds to {,n}
                // between(m, n) corresponds to {m, n}
                // at(n) corresponds to {n}
                ("a" is g.person) |-| ("f" is g.friends.filter(f => f.personAId > 1).between(1, 10)) |->| ("b" is g.person)
            // The fields of p are the label names defined with strings in `matching`; sqala generates the corresponding fields automatically
            .filter(p => p.a.id > 1)
            // Define the returned fields using a named tuple
            .columns: p =>
                (
                    personA = p.a.name,
                    personB = p.b.name,
                    meetingDate = p.f.meetingDate
                )
        )
```

The generated SQL is:

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
