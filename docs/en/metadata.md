# Metadata Configuration

Before building queries with sqala, we create entity classes corresponding to the database tables and add the metadata that sqala requires.

## Adding Dependencies

Before using sqala, make sure you have added the sqala dependency:

```scala
libraryDependencies += "cn.sqala" % "sqala-jdbc_3" % "latest.integration"
```

Metadata-related settings usually require `import sqala.metadata.*`.

## Basic Configuration

In the rest of the documentation, we typically use a four-level data model of users, channels, posts, and comments to introduce sqala. The table creation statements and sample data are as follows:

::: code-group
```sql [MySQL]
CREATE TABLE `user` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL
);

CREATE TABLE `channel` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(50) NOT NULL
);

CREATE TABLE `post` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(100) NOT NULL,
    `author_id` INT NOT NULL,
    `channel_id` INT NOT NULL,
    `create_time` DATETIME NOT NULL,
    `view_count` INT NOT NULL,
    `like_count` INT NOT NULL,
    `state` INT NOT NULL
);

CREATE TABLE `comment` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `post_id` INT NOT NULL,
    `author_id` INT NOT NULL,
    `content` VARCHAR(200) NOT NULL,
    `create_time` DATETIME NOT NULL,
    `parent_id` INT DEFAULT 0,
    `like_count` INT NOT NULL,
    `state` INT NOT NULL
);

INSERT INTO `user` (`name`) VALUES
('Alice'), ('Bob'), ('Carol'), ('Dave'),
('Eve'), ('Frank'), ('Grace'), ('Heidi');

INSERT INTO `channel` (`name`) VALUES
('Food'), ('Health'), ('Travel'), ('Photography'),
('Reading'), ('Movies'), ('Sports'), ('Music');

INSERT INTO `post` (`title`, `author_id`, `channel_id`, `create_time`, `view_count`, `like_count`, `state`) VALUES
('Braised Pork Recipe', 1, 1, '2024-03-01 10:00:00', 1250, 45, 1),
('Pasta Tips', 2, 1, '2024-03-02 14:30:00', 890, 32, 1),
('Baking for Beginners', 3, 1, '2024-03-03 09:15:00', 670, 28, 1),
('Summer Cold Dishes', 1, 1, '2024-03-04 16:45:00', 530, 19, 1),
('Hot Pot Base', 4, 1, '2024-03-05 11:20:00', 480, 22, 1),
('Fitness Plan', 5, 2, '2024-03-06 13:10:00', 980, 38, 1),
('Nutrition Pairing', 6, 2, '2024-03-07 15:30:00', 850, 29, 1),
('Travel', 7, 3, '2024-03-08 10:45:00', 720, 31, 1),
('Road Trip', 8, 3, '2024-03-09 14:20:00', 610, 24, 1),
('Portrait Photography', 4, 4, '2024-03-10 09:30:00', 550, 26, 1),
('Book Recommendations', 5, 5, '2024-03-11 16:15:00', 490, 21, 1),
('Movie Recommendations', 6, 6, '2024-03-12 11:40:00', 420, 18, 1),
('Running Training', 7, 7, '2024-03-13 13:50:00', 380, 16, 1),
('Music Appreciation', 8, 8, '2024-03-14 15:25:00', 350, 19, 1),
('Deleted Post', 1, 1, '2024-03-15 10:00:00', 50, 2, 0);

INSERT INTO `comment` (`post_id`, `author_id`, `content`, `create_time`, `parent_id`, `like_count`, `state`) VALUES
(1, 2, 'Looks delicious', '2024-03-01 11:00:00', 0, 8, 1),
(1, 3, 'How did you make it', '2024-03-01 12:00:00', 1, 5, 1),
(1, 4, 'What ingredients are needed', '2024-03-01 13:00:00', 2, 3, 1),
(1, 5, 'Can I use a rice cooker', '2024-03-01 14:00:00', 3, 2, 1),
(1, 6, 'Looking forward to more posts', '2024-03-01 15:00:00', 1, 4, 1),
(2, 1, 'Cooking time is key', '2024-03-02 15:30:00', 0, 6, 1),
(2, 4, 'Sauce choice matters', '2024-03-02 16:00:00', 6, 4, 1),
(2, 5, 'Olive oil is recommended', '2024-03-02 17:00:00', 7, 3, 1),
(2, 6, 'Different pasta needs different times', '2024-03-02 18:00:00', 8, 2, 1),
(3, 2, 'Needs a lot of patience', '2024-03-03 10:15:00', 0, 7, 1),
(3, 4, 'Temperature control matters', '2024-03-03 11:15:00', 10, 5, 1),
(4, 3, 'Great for summer', '2024-03-04 17:45:00', 0, 4, 1),
(5, 2, 'Homemade is healthier', '2024-03-05 12:20:00', 0, 3, 1),
(6, 3, 'Consistency is key', '2024-03-06 14:10:00', 0, 5, 1),
(7, 4, 'Pairing is important', '2024-03-07 16:30:00', 0, 4, 1),
(8, 5, 'Lots of good food', '2024-03-08 11:45:00', 0, 7, 1),
(9, 6, 'Road trips are freeing', '2024-03-09 15:20:00', 0, 5, 1),
(10, 7, 'Needs more practice', '2024-03-10 10:30:00', 0, 6, 1),
(1, 7, 'Add potatoes and stew together', '2024-03-01 16:00:00', 4, 1, 1),
(1, 8, 'Caramelizing is key', '2024-03-01 17:00:00', 13, 2, 1),
(2, 7, 'Basil leaves matter', '2024-03-02 19:00:00', 8, 3, 1),
(2, 8, 'Add salt when boiling pasta', '2024-03-02 20:00:00', 15, 2, 1),
(1, 5, 'Deleted comment', '2024-03-01 18:00:00', 0, 0, 0);
```

```sql [PostgreSQL]
CREATE TABLE "user" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL
);

CREATE TABLE "channel" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(50) NOT NULL
);

CREATE TABLE "post" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR(100) NOT NULL,
    "author_id" INT NOT NULL,
    "channel_id" INT NOT NULL,
    "create_time" TIMESTAMP NOT NULL,
    "view_count" INT NOT NULL,
    "like_count" INT NOT NULL,
    "state" INT NOT NULL
);

CREATE TABLE "comment" (
    "id" SERIAL PRIMARY KEY,
    "post_id" INT NOT NULL,
    "author_id" INT NOT NULL,
    "content" VARCHAR(200) NOT NULL,
    "create_time" TIMESTAMP NOT NULL,
    "parent_id" INT DEFAULT 0,
    "like_count" INT NOT NULL,
    "state" INT NOT NULL
);

INSERT INTO "user" ("name") VALUES
('Alice'), ('Bob'), ('Carol'), ('Dave'),
('Eve'), ('Frank'), ('Grace'), ('Heidi');

INSERT INTO "channel" ("name") VALUES
('Food'), ('Health'), ('Travel'), ('Photography'),
('Reading'), ('Movies'), ('Sports'), ('Music');

INSERT INTO "post" ("title", "author_id", "channel_id", "create_time", "view_count", "like_count", "state") VALUES
('Braised Pork Recipe', 1, 1, '2024-03-01 10:00:00', 1250, 45, 1),
('Pasta Tips', 2, 1, '2024-03-02 14:30:00', 890, 32, 1),
('Baking for Beginners', 3, 1, '2024-03-03 09:15:00', 670, 28, 1),
('Summer Cold Dishes', 1, 1, '2024-03-04 16:45:00', 530, 19, 1),
('Hot Pot Base', 4, 1, '2024-03-05 11:20:00', 480, 22, 1),
('Fitness Plan', 5, 2, '2024-03-06 13:10:00', 980, 38, 1),
('Nutrition Pairing', 6, 2, '2024-03-07 15:30:00', 850, 29, 1),
('Travel', 7, 3, '2024-03-08 10:45:00', 720, 31, 1),
('Road Trip', 8, 3, '2024-03-09 14:20:00', 610, 24, 1),
('Portrait Photography', 4, 4, '2024-03-10 09:30:00', 550, 26, 1),
('Book Recommendations', 5, 5, '2024-03-11 16:15:00', 490, 21, 1),
('Movie Recommendations', 6, 6, '2024-03-12 11:40:00', 420, 18, 1),
('Running Training', 7, 7, '2024-03-13 13:50:00', 380, 16, 1),
('Music Appreciation', 8, 8, '2024-03-14 15:25:00', 350, 19, 1),
('Deleted Post', 1, 1, '2024-03-15 10:00:00', 50, 2, 0);

INSERT INTO "comment" ("post_id", "author_id", "content", "create_time", "parent_id", "like_count", "state") VALUES
(1, 2, 'Looks delicious', '2024-03-01 11:00:00', 0, 8, 1),
(1, 3, 'How did you make it', '2024-03-01 12:00:00', 1, 5, 1),
(1, 4, 'What ingredients are needed', '2024-03-01 13:00:00', 2, 3, 1),
(1, 5, 'Can I use a rice cooker', '2024-03-01 14:00:00', 3, 2, 1),
(1, 6, 'Looking forward to more posts', '2024-03-01 15:00:00', 1, 4, 1),
(2, 1, 'Cooking time is key', '2024-03-02 15:30:00', 0, 6, 1),
(2, 4, 'Sauce choice matters', '2024-03-02 16:00:00', 6, 4, 1),
(2, 5, 'Olive oil is recommended', '2024-03-02 17:00:00', 7, 3, 1),
(2, 6, 'Different pasta needs different times', '2024-03-02 18:00:00', 8, 2, 1),
(3, 2, 'Needs a lot of patience', '2024-03-03 10:15:00', 0, 7, 1),
(3, 4, 'Temperature control matters', '2024-03-03 11:15:00', 10, 5, 1),
(4, 3, 'Great for summer', '2024-03-04 17:45:00', 0, 4, 1),
(5, 2, 'Homemade is healthier', '2024-03-05 12:20:00', 0, 3, 1),
(6, 3, 'Consistency is key', '2024-03-06 14:10:00', 0, 5, 1),
(7, 4, 'Pairing is important', '2024-03-07 16:30:00', 0, 4, 1),
(8, 5, 'Lots of good food', '2024-03-08 11:45:00', 0, 7, 1),
(9, 6, 'Road trips are freeing', '2024-03-09 15:20:00', 0, 5, 1),
(10, 7, 'Needs more practice', '2024-03-10 10:30:00', 0, 6, 1),
(1, 7, 'Add potatoes and stew together', '2024-03-01 16:00:00', 4, 1, 1),
(1, 8, 'Caramelizing is key', '2024-03-01 17:00:00', 13, 2, 1),
(2, 7, 'Basil leaves matter', '2024-03-02 19:00:00', 8, 3, 1),
(2, 8, 'Add salt when boiling pasta', '2024-03-02 20:00:00', 15, 2, 1),
(1, 5, 'Deleted comment', '2024-03-01 18:00:00', 0, 0, 0);
```

```sql [Oracle]
CREATE TABLE "user" (
    "id" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "name" VARCHAR2(50) NOT NULL
);

CREATE TABLE "channel" (
    "id" NUMBER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "name" VARCHAR2(50) NOT NULL
);

CREATE TABLE "post" (
    "id" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "title" VARCHAR2(100) NOT NULL,
    "author_id" INTEGER NOT NULL,
    "channel_id" INTEGER NOT NULL,
    "create_time" TIMESTAMP NOT NULL,
    "view_count" INTEGER NOT NULL,
    "like_count" INTEGER NOT NULL,
    "state" INTEGER NOT NULL
);

CREATE TABLE "comment" (
    "id" INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    "post_id" INTEGER NOT NULL,
    "author_id" INTEGER NOT NULL,
    "content" VARCHAR2(200) NOT NULL,
    "create_time" TIMESTAMP NOT NULL,
    "parent_id" INTEGER DEFAULT 0,
    "like_count" INTEGER NOT NULL,
    "state" INTEGER NOT NULL
);

INSERT INTO "user" ("name") VALUES
('Alice'), ('Bob'), ('Carol'), ('Dave'),
('Eve'), ('Frank'), ('Grace'), ('Heidi');

INSERT INTO "channel" ("name") VALUES
('Food'), ('Health'), ('Travel'), ('Photography'),
('Reading'), ('Movies'), ('Sports'), ('Music');

INSERT INTO "post" ("title", "author_id", "channel_id", "create_time", "view_count", "like_count", "state") VALUES
('Braised Pork Recipe', 1, 1, TO_TIMESTAMP('2024-03-01 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1250, 45, 1),
('Pasta Tips', 2, 1, TO_TIMESTAMP('2024-03-02 14:30:00', 'YYYY-MM-DD HH24:MI:SS'), 890, 32, 1),
('Baking for Beginners', 3, 1, TO_TIMESTAMP('2024-03-03 09:15:00', 'YYYY-MM-DD HH24:MI:SS'), 670, 28, 1),
('Summer Cold Dishes', 1, 1, TO_TIMESTAMP('2024-03-04 16:45:00', 'YYYY-MM-DD HH24:MI:SS'), 530, 19, 1),
('Hot Pot Base', 4, 1, TO_TIMESTAMP('2024-03-05 11:20:00', 'YYYY-MM-DD HH24:MI:SS'), 480, 22, 1),
('Fitness Plan', 5, 2, TO_TIMESTAMP('2024-03-06 13:10:00', 'YYYY-MM-DD HH24:MI:SS'), 980, 38, 1),
('Nutrition Pairing', 6, 2, TO_TIMESTAMP('2024-03-07 15:30:00', 'YYYY-MM-DD HH24:MI:SS'), 850, 29, 1),
('Travel', 7, 3, TO_TIMESTAMP('2024-03-08 10:45:00', 'YYYY-MM-DD HH24:MI:SS'), 720, 31, 1),
('Road Trip', 8, 3, TO_TIMESTAMP('2024-03-09 14:20:00', 'YYYY-MM-DD HH24:MI:SS'), 610, 24, 1),
('Portrait Photography', 4, 4, TO_TIMESTAMP('2024-03-10 09:30:00', 'YYYY-MM-DD HH24:MI:SS'), 550, 26, 1),
('Book Recommendations', 5, 5, TO_TIMESTAMP('2024-03-11 16:15:00', 'YYYY-MM-DD HH24:MI:SS'), 490, 21, 1),
('Movie Recommendations', 6, 6, TO_TIMESTAMP('2024-03-12 11:40:00', 'YYYY-MM-DD HH24:MI:SS'), 420, 18, 1),
('Running Training', 7, 7, TO_TIMESTAMP('2024-03-13 13:50:00', 'YYYY-MM-DD HH24:MI:SS'), 380, 16, 1),
('Music Appreciation', 8, 8, TO_TIMESTAMP('2024-03-14 15:25:00', 'YYYY-MM-DD HH24:MI:SS'), 350, 19, 1),
('Deleted Post', 1, 1, TO_TIMESTAMP('2024-03-15 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 50, 2, 0);

INSERT INTO "comment" ("post_id", "author_id", "content", "create_time", "parent_id", "like_count", "state") VALUES
(1, 2, 'Looks delicious', TO_TIMESTAMP('2024-03-01 11:00:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 8, 1),
(1, 3, 'How did you make it', TO_TIMESTAMP('2024-03-01 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1, 5, 1),
(1, 4, 'What ingredients are needed', TO_TIMESTAMP('2024-03-01 13:00:00', 'YYYY-MM-DD HH24:MI:SS'), 2, 3, 1),
(1, 5, 'Can I use a rice cooker', TO_TIMESTAMP('2024-03-01 14:00:00', 'YYYY-MM-DD HH24:MI:SS'), 3, 2, 1),
(1, 6, 'Looking forward to more posts', TO_TIMESTAMP('2024-03-01 15:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1, 4, 1),
(2, 1, 'Cooking time is key', TO_TIMESTAMP('2024-03-02 15:30:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 6, 1),
(2, 4, 'Sauce choice matters', TO_TIMESTAMP('2024-03-02 16:00:00', 'YYYY-MM-DD HH24:MI:SS'), 6, 4, 1),
(2, 5, 'Olive oil is recommended', TO_TIMESTAMP('2024-03-02 17:00:00', 'YYYY-MM-DD HH24:MI:SS'), 7, 3, 1),
(2, 6, 'Different pasta needs different times', TO_TIMESTAMP('2024-03-02 18:00:00', 'YYYY-MM-DD HH24:MI:SS'), 8, 2, 1),
(3, 2, 'Needs a lot of patience', TO_TIMESTAMP('2024-03-03 10:15:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 7, 1),
(3, 4, 'Temperature control matters', TO_TIMESTAMP('2024-03-03 11:15:00', 'YYYY-MM-DD HH24:MI:SS'), 10, 5, 1),
(4, 3, 'Great for summer', TO_TIMESTAMP('2024-03-04 17:45:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 4, 1),
(5, 2, 'Homemade is healthier', TO_TIMESTAMP('2024-03-05 12:20:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 3, 1),
(6, 3, 'Consistency is key', TO_TIMESTAMP('2024-03-06 14:10:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 5, 1),
(7, 4, 'Pairing is important', TO_TIMESTAMP('2024-03-07 16:30:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 4, 1),
(8, 5, 'Lots of good food', TO_TIMESTAMP('2024-03-08 11:45:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 7, 1),
(9, 6, 'Road trips are freeing', TO_TIMESTAMP('2024-03-09 15:20:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 5, 1),
(10, 7, 'Needs more practice', TO_TIMESTAMP('2024-03-10 10:30:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 6, 1),
(1, 7, 'Add potatoes and stew together', TO_TIMESTAMP('2024-03-01 16:00:00', 'YYYY-MM-DD HH24:MI:SS'), 4, 1, 1),
(1, 8, 'Caramelizing is key', TO_TIMESTAMP('2024-03-01 17:00:00', 'YYYY-MM-DD HH24:MI:SS'), 13, 2, 1),
(2, 7, 'Basil leaves matter', TO_TIMESTAMP('2024-03-02 19:00:00', 'YYYY-MM-DD HH24:MI:SS'), 8, 3, 1),
(2, 8, 'Add salt when boiling pasta', TO_TIMESTAMP('2024-03-02 20:00:00', 'YYYY-MM-DD HH24:MI:SS'), 15, 2, 1),
(1, 5, 'Deleted comment', TO_TIMESTAMP('2024-03-01 18:00:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 0, 0);
```

:::

We create the corresponding `case class` entity classes in Scala:

```scala
import java.time.LocalDateTime

case class User(
    id: Int,
    name: String
)

case class Channel(
    id: Int,
    name: String
)

case class Post(
    id: Int,
    title: String,
    authorId: Int,
    channelId: Int,
    createTime: LocalDateTime,
    viewCount: Int,
    likeCount: Int,
    state: Int
)

case class Comment(
    id: Int,
    postId: Int,
    authorId: Int,
    content: String,
    createTime: LocalDateTime,
    parentId: Option[Int],
    likeCount: Int,
    state: Int
)
```

The field names and types of the `case class` correspond to the database table structure. Use `Option` for nullable fields.

By default, sqala maps **camelCase field names to snake_case** database column names.

Unlike other query libraries, sqala does not require an additional table structure object. After creating the `case class`, we can use the entity class's **companion object** to build queries:

```scala
import sqala.static.dsl.*

val query =
    from(User).filter(d => d.id === 1)
```

## Supported Field Types

The basic field types supported by sqala out of the box are:

|Type                   |                       |                       |
|:---------------------:|:---------------------:|:---------------------:|
|scala.Int              |scala.Long             |scala.Float            |
|scala.Double           |scala.String           |scala.Boolean          |
|scala.math.BigDecimal  |java.time.LocalDate    |java.time.LocalTime    |
|java.time.LocalDateTime|java.time.OffsetTime   |java.time.OffsetDateTime|
|scala.Option[T]        |scala.Array[T]         |                        |

Both `Option` and `Array` can be combined with the types above, for example `Option[Array[Option[Int]]]`.

In addition, to support `JSON` data and spatial data in SQL, the following data types are defined in the `sqala.metadata` package.

However, apart from the `Json` type, since JDBC has no standard for such data types and database driver implementations differ significantly, sqala does not provide built-in deserialization. When building queries, you need to convert them to basic data types using the corresponding SQL functions:

|Type                   |                       |                       |
|:---------------------:|:---------------------:|:---------------------:|
|Point                  |LineString             |Polygon                |
|MultiPoint             |MultiLineString        |MultiPolygon            |
|GeometryCollection     |Geometry               |Json                    |

## Custom Field Types

In the example above, we use `Int` for the `state` field of the post and comment tables. However, managing such an enum field with `Int` is unsafe, and magic numbers carry no real meaning, so we would rather use Scala 3's `enum` for such fields:

```scala
enum DataState:
    case Active
    case Deleted
```

Then we change the entity class to:

```scala
case class Post(
    id: Int,
    title: String,
    authorId: Int,
    channelId: Int,
    createTime: LocalDateTime,
    viewCount: Int,
    likeCount: Int,
    state: DataState
)
```

But when we build a query:

```scala
import sqala.static.dsl.*

val query =
    from(Post).filter(p => p.state === DataState.Active)
```

sqala reports a compile error. The reason is that sqala does not know how to handle such a field: how to generate a query for it, or how to deserialize it from query results.

Therefore, the custom type needs a `CustomField` implementation. To avoid importing it at every query site, put the implementation in the type's companion object.

For a parameterless Scala 3 enum, sqala derives the implementation from annotations. Declare the database value on each case and add one `given`:

### Integer mapping

```scala
import sqala.metadata.*

enum DataState:
    @enumValue(1) case Active
    @enumValue(0) case Deleted

object DataState:
    given CustomField[DataState, Int] = CustomField.derived
```

`@enumValue` is required. sqala never falls back to `ordinal`, because reordering cases would silently change stored data.

### String mapping

```scala
import sqala.metadata.*

enum Status:
    @enumName("ACTIVE") case Active
    case Deleted

object Status:
    given CustomField[Status, String] = CustomField.derived
```

`@enumName` is optional; when it is absent, the case name is used. Renaming a case therefore changes the stored value, so declare `@enumName` explicitly when the value must stay stable.

### Usage

```scala
case class Post(
    // other fields omitted
    state: DataState
)

val query =
    from(Post).filter(p => p.state === DataState.Active)
```

`Option[DataState]`, query parameters, inserts, updates and result decoding all work without further declarations.

### Compile-time checks

The macro rejects:

- enums with type parameters or case parameters
- integer-mapped cases without `@enumValue`
- annotations that do not match the storage type, such as `@enumName` on an `Int` mapping
- duplicate database values
- non-literal annotation arguments

### Runtime checks

Decoding an unknown database value throws `EnumDecodeException`, which contains the enum name and the actual value. This usually means the database holds a value the enum does not cover, or the column lacks a check constraint.

### Manual implementation

Write `CustomField` manually when:

- the enum has parameters, such as `enum Color(val code: Int)`
- the type is a Java enum
- the database value comes from another field or external logic

```scala
object DataState:
    given CustomField[DataState, Int] with
        override def fromValue(x: Int): DataState = x match
            case 1 => Active
            case 0 => Deleted

        override def toValue(x: DataState): Int = x match
            case Active => 1
            case Deleted => 0
```

The two type parameters of `CustomField` are the type to implement and the basic type to map to. `fromValue` creates a custom value from the basic type, and `toValue` does the reverse.

## Setting Primary Keys

sqala supports the `primaryKey` and `autoInc` annotations to mark primary key fields and auto-increment fields. Since the primary keys of the sample tables created above are all auto-increment, we change the entity class definitions to:

```scala
import sqala.metadata.*

import java.time.LocalDateTime

case class User(
    @autoInc @primaryKey id: Int,
    name: String
)

case class Channel(
    @autoInc @primaryKey id: Int,
    name: String
)

case class Post(
    @autoInc @primaryKey id: Int,
    title: String,
    authorId: Int,
    channelId: Int,
    createTime: LocalDateTime,
    viewCount: Int,
    likeCount: Int,
    state: DataState
)

case class Comment(
    @autoInc @primaryKey id: Int,
    postId: Int,
    authorId: Int,
    content: String,
    createTime: LocalDateTime,
    parentId: Option[Int],
    likeCount: Int,
    state: DataState
)
```

sqala supports multiple `primaryKey` fields in one entity class, but only one `autoInc` field.

## Custom Names

If the entity class and database table do not follow the camelCase-to-snake_case rule, you can use the `table` and `column` annotations to specify names manually:

```scala
import sqala.metadata.*

@table("T_SOME_TABLE")
case class SomeTable(
    @autoInc @primaryKey @column("ID") id: Int
)
```

Once the metadata configuration is complete, you can start using sqala to build queries and create, update, and delete statements.
