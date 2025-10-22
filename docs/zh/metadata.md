# 元数据配置

在使用sqala创建查询之前，我们创建与数据表对应的实体类并添加sqala需要的元数据信息。

## 引入依赖

在使用sqala之前，确保引入sqala的依赖：

```scala
libraryDependencies += "com.wz7982" % "sqala-jdbc_3" % "latest.integration"
```

元数据相关的设置通常需要`import sqala.static.metadata.*`。

## 基础配置

在以后的文档中，我们通常以用户、频道、帖子、评论四级的数据模型为例介绍sqala，建表语句和示例数据如下：

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
('小黑'), ('小白'), ('小红'), ('小蓝'), 
('小绿'), ('小紫'), ('小黄'), ('小青');

INSERT INTO `channel` (`name`) VALUES
('美食'), ('健康'), ('旅行'), ('摄影'), 
('读书'), ('电影'), ('运动'), ('音乐');

INSERT INTO `post` (`title`, `author_id`, `channel_id`, `create_time`, `view_count`, `like_count`, `state`) VALUES
('红烧肉做法', 1, 1, '2024-03-01 10:00:00', 1250, 45, 1),
('意大利面技巧', 2, 1, '2024-03-02 14:30:00', 890, 32, 1),
('烘焙入门', 3, 1, '2024-03-03 09:15:00', 670, 28, 1),
('夏日凉菜', 1, 1, '2024-03-04 16:45:00', 530, 19, 1),
('火锅底料', 4, 1, '2024-03-05 11:20:00', 480, 22, 1),
('健身计划', 5, 2, '2024-03-06 13:10:00', 980, 38, 1),
('营养搭配', 6, 2, '2024-03-07 15:30:00', 850, 29, 1),
('旅行', 7, 3, '2024-03-08 10:45:00', 720, 31, 1),
('自驾', 8, 3, '2024-03-09 14:20:00', 610, 24, 1),
('人像摄影', 4, 4, '2024-03-10 09:30:00', 550, 26, 1),
('好书推荐', 5, 5, '2024-03-11 16:15:00', 490, 21, 1),
('电影推荐', 6, 6, '2024-03-12 11:40:00', 420, 18, 1),
('跑步训练', 7, 7, '2024-03-13 13:50:00', 380, 16, 1),
('音乐欣赏', 8, 8, '2024-03-14 15:25:00', 350, 19, 1),
('已删除帖', 1, 1, '2024-03-15 10:00:00', 50, 2, 0);

INSERT INTO `comment` (`post_id`, `author_id`, `content`, `create_time`, `parent_id`, `like_count`, `state`) VALUES
(1, 2, '看起来很好吃', '2024-03-01 11:00:00', 0, 8, 1),
(1, 3, '怎么做出来的', '2024-03-01 12:00:00', 1, 5, 1),
(1, 4, '需要什么材料', '2024-03-01 13:00:00', 2, 3, 1),
(1, 5, '可以用电饭锅吗', '2024-03-01 14:00:00', 3, 2, 1),
(1, 6, '期待更多分享', '2024-03-01 15:00:00', 1, 4, 1),
(2, 1, '煮的时间很关键', '2024-03-02 15:30:00', 0, 6, 1),
(2, 4, '酱料选择重要', '2024-03-02 16:00:00', 6, 4, 1),
(2, 5, '推荐橄榄油', '2024-03-02 17:00:00', 7, 3, 1),
(2, 6, '不同面条时间不同', '2024-03-02 18:00:00', 8, 2, 1),
(3, 2, '需要很多耐心', '2024-03-03 10:15:00', 0, 7, 1),
(3, 4, '温度控制重要', '2024-03-03 11:15:00', 10, 5, 1),
(4, 3, '很适合夏天', '2024-03-04 17:45:00', 0, 4, 1),
(5, 2, '自制更健康', '2024-03-05 12:20:00', 0, 3, 1),
(6, 3, '贵在坚持', '2024-03-06 14:10:00', 0, 5, 1),
(7, 4, '搭配很重要', '2024-03-07 16:30:00', 0, 4, 1),
(8, 5, '美食很多', '2024-03-08 11:45:00', 0, 7, 1),
(9, 6, '自驾很自由', '2024-03-09 15:20:00', 0, 5, 1),
(10, 7, '需要多练习', '2024-03-10 10:30:00', 0, 6, 1),
(1, 7, '加土豆一起炖', '2024-03-01 16:00:00', 4, 1, 1),
(1, 8, '炒色是关键', '2024-03-01 17:00:00', 13, 2, 1),
(2, 7, '罗勒叶重要', '2024-03-02 19:00:00', 8, 3, 1),
(2, 8, '煮面加盐更好', '2024-03-02 20:00:00', 15, 2, 1),
(1, 5, '已删除评论', '2024-03-01 18:00:00', 0, 0, 0);
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
('小黑'), ('小白'), ('小红'), ('小蓝'), 
('小绿'), ('小紫'), ('小黄'), ('小青');

INSERT INTO "channel" ("name") VALUES
('美食'), ('健康'), ('旅行'), ('摄影'), 
('读书'), ('电影'), ('运动'), ('音乐');

INSERT INTO "post" ("title", "author_id", "channel_id", "create_time", "view_count", "like_count", "state") VALUES
('红烧肉做法', 1, 1, '2024-03-01 10:00:00', 1250, 45, 1),
('意大利面技巧', 2, 1, '2024-03-02 14:30:00', 890, 32, 1),
('烘焙入门', 3, 1, '2024-03-03 09:15:00', 670, 28, 1),
('夏日凉菜', 1, 1, '2024-03-04 16:45:00', 530, 19, 1),
('火锅底料', 4, 1, '2024-03-05 11:20:00', 480, 22, 1),
('健身计划', 5, 2, '2024-03-06 13:10:00', 980, 38, 1),
('营养搭配', 6, 2, '2024-03-07 15:30:00', 850, 29, 1),
('旅行', 7, 3, '2024-03-08 10:45:00', 720, 31, 1),
('自驾', 8, 3, '2024-03-09 14:20:00', 610, 24, 1),
('人像摄影', 4, 4, '2024-03-10 09:30:00', 550, 26, 1),
('好书推荐', 5, 5, '2024-03-11 16:15:00', 490, 21, 1),
('电影推荐', 6, 6, '2024-03-12 11:40:00', 420, 18, 1),
('跑步训练', 7, 7, '2024-03-13 13:50:00', 380, 16, 1),
('音乐欣赏', 8, 8, '2024-03-14 15:25:00', 350, 19, 1),
('已删除帖', 1, 1, '2024-03-15 10:00:00', 50, 2, 0);

INSERT INTO "comment" ("post_id", "author_id", "content", "create_time", "parent_id", "like_count", "state") VALUES
(1, 2, '看起来很好吃', '2024-03-01 11:00:00', 0, 8, 1),
(1, 3, '怎么做出来的', '2024-03-01 12:00:00', 1, 5, 1),
(1, 4, '需要什么材料', '2024-03-01 13:00:00', 2, 3, 1),
(1, 5, '可以用电饭锅吗', '2024-03-01 14:00:00', 3, 2, 1),
(1, 6, '期待更多分享', '2024-03-01 15:00:00', 1, 4, 1),
(2, 1, '煮的时间很关键', '2024-03-02 15:30:00', 0, 6, 1),
(2, 4, '酱料选择重要', '2024-03-02 16:00:00', 6, 4, 1),
(2, 5, '推荐橄榄油', '2024-03-02 17:00:00', 7, 3, 1),
(2, 6, '不同面条时间不同', '2024-03-02 18:00:00', 8, 2, 1),
(3, 2, '需要很多耐心', '2024-03-03 10:15:00', 0, 7, 1),
(3, 4, '温度控制重要', '2024-03-03 11:15:00', 10, 5, 1),
(4, 3, '很适合夏天', '2024-03-04 17:45:00', 0, 4, 1),
(5, 2, '自制更健康', '2024-03-05 12:20:00', 0, 3, 1),
(6, 3, '贵在坚持', '2024-03-06 14:10:00', 0, 5, 1),
(7, 4, '搭配很重要', '2024-03-07 16:30:00', 0, 4, 1),
(8, 5, '美食很多', '2024-03-08 11:45:00', 0, 7, 1),
(9, 6, '自驾很自由', '2024-03-09 15:20:00', 0, 5, 1),
(10, 7, '需要多练习', '2024-03-10 10:30:00', 0, 6, 1),
(1, 7, '加土豆一起炖', '2024-03-01 16:00:00', 4, 1, 1),
(1, 8, '炒色是关键', '2024-03-01 17:00:00', 13, 2, 1),
(2, 7, '罗勒叶重要', '2024-03-02 19:00:00', 8, 3, 1),
(2, 8, '煮面加盐更好', '2024-03-02 20:00:00', 15, 2, 1),
(1, 5, '已删除评论', '2024-03-01 18:00:00', 0, 0, 0);
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
('小黑'), ('小白'), ('小红'), ('小蓝'), 
('小绿'), ('小紫'), ('小黄'), ('小青');

INSERT INTO "channel" ("name") VALUES
('美食'), ('健康'), ('旅行'), ('摄影'), 
('读书'), ('电影'), ('运动'), ('音乐');

INSERT INTO "post" ("title", "author_id", "channel_id", "create_time", "view_count", "like_count", "state") VALUES 
('红烧肉做法', 1, 1, TO_TIMESTAMP('2024-03-01 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1250, 45, 1),
('意大利面技巧', 2, 1, TO_TIMESTAMP('2024-03-02 14:30:00', 'YYYY-MM-DD HH24:MI:SS'), 890, 32, 1),
('烘焙入门', 3, 1, TO_TIMESTAMP('2024-03-03 09:15:00', 'YYYY-MM-DD HH24:MI:SS'), 670, 28, 1),
('夏日凉菜', 1, 1, TO_TIMESTAMP('2024-03-04 16:45:00', 'YYYY-MM-DD HH24:MI:SS'), 530, 19, 1),
('火锅底料', 4, 1, TO_TIMESTAMP('2024-03-05 11:20:00', 'YYYY-MM-DD HH24:MI:SS'), 480, 22, 1),
('健身计划', 5, 2, TO_TIMESTAMP('2024-03-06 13:10:00', 'YYYY-MM-DD HH24:MI:SS'), 980, 38, 1),
('营养搭配', 6, 2, TO_TIMESTAMP('2024-03-07 15:30:00', 'YYYY-MM-DD HH24:MI:SS'), 850, 29, 1),
('旅行', 7, 3, TO_TIMESTAMP('2024-03-08 10:45:00', 'YYYY-MM-DD HH24:MI:SS'), 720, 31, 1),
('自驾', 8, 3, TO_TIMESTAMP('2024-03-09 14:20:00', 'YYYY-MM-DD HH24:MI:SS'), 610, 24, 1),
('人像摄影', 4, 4, TO_TIMESTAMP('2024-03-10 09:30:00', 'YYYY-MM-DD HH24:MI:SS'), 550, 26, 1),
('好书推荐', 5, 5, TO_TIMESTAMP('2024-03-11 16:15:00', 'YYYY-MM-DD HH24:MI:SS'), 490, 21, 1),
('电影推荐', 6, 6, TO_TIMESTAMP('2024-03-12 11:40:00', 'YYYY-MM-DD HH24:MI:SS'), 420, 18, 1),
('跑步训练', 7, 7, TO_TIMESTAMP('2024-03-13 13:50:00', 'YYYY-MM-DD HH24:MI:SS'), 380, 16, 1),
('音乐欣赏', 8, 8, TO_TIMESTAMP('2024-03-14 15:25:00', 'YYYY-MM-DD HH24:MI:SS'), 350, 19, 1),
('已删除帖', 1, 1, TO_TIMESTAMP('2024-03-15 10:00:00', 'YYYY-MM-DD HH24:MI:SS'), 50, 2, 0);

INSERT INTO "comment" ("post_id", "author_id", "content", "create_time", "parent_id", "like_count", "state") VALUES 
(1, 2, '看起来很好吃', TO_TIMESTAMP('2024-03-01 11:00:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 8, 1),
(1, 3, '怎么做出来的', TO_TIMESTAMP('2024-03-01 12:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1, 5, 1),
(1, 4, '需要什么材料', TO_TIMESTAMP('2024-03-01 13:00:00', 'YYYY-MM-DD HH24:MI:SS'), 2, 3, 1),
(1, 5, '可以用电饭锅吗', TO_TIMESTAMP('2024-03-01 14:00:00', 'YYYY-MM-DD HH24:MI:SS'), 3, 2, 1),
(1, 6, '期待更多分享', TO_TIMESTAMP('2024-03-01 15:00:00', 'YYYY-MM-DD HH24:MI:SS'), 1, 4, 1),
(2, 1, '煮的时间很关键', TO_TIMESTAMP('2024-03-02 15:30:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 6, 1),
(2, 4, '酱料选择重要', TO_TIMESTAMP('2024-03-02 16:00:00', 'YYYY-MM-DD HH24:MI:SS'), 6, 4, 1),
(2, 5, '推荐橄榄油', TO_TIMESTAMP('2024-03-02 17:00:00', 'YYYY-MM-DD HH24:MI:SS'), 7, 3, 1),
(2, 6, '不同面条时间不同', TO_TIMESTAMP('2024-03-02 18:00:00', 'YYYY-MM-DD HH24:MI:SS'), 8, 2, 1),
(3, 2, '需要很多耐心', TO_TIMESTAMP('2024-03-03 10:15:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 7, 1),
(3, 4, '温度控制重要', TO_TIMESTAMP('2024-03-03 11:15:00', 'YYYY-MM-DD HH24:MI:SS'), 10, 5, 1),
(4, 3, '很适合夏天', TO_TIMESTAMP('2024-03-04 17:45:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 4, 1),
(5, 2, '自制更健康', TO_TIMESTAMP('2024-03-05 12:20:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 3, 1),
(6, 3, '贵在坚持', TO_TIMESTAMP('2024-03-06 14:10:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 5, 1),
(7, 4, '搭配很重要', TO_TIMESTAMP('2024-03-07 16:30:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 4, 1),
(8, 5, '美食很多', TO_TIMESTAMP('2024-03-08 11:45:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 7, 1),
(9, 6, '自驾很自由', TO_TIMESTAMP('2024-03-09 15:20:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 5, 1),
(10, 7, '需要多练习', TO_TIMESTAMP('2024-03-10 10:30:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 6, 1),
(1, 7, '加土豆一起炖', TO_TIMESTAMP('2024-03-01 16:00:00', 'YYYY-MM-DD HH24:MI:SS'), 4, 1, 1),
(1, 8, '炒色是关键', TO_TIMESTAMP('2024-03-01 17:00:00', 'YYYY-MM-DD HH24:MI:SS'), 13, 2, 1),
(2, 7, '罗勒叶重要', TO_TIMESTAMP('2024-03-02 19:00:00', 'YYYY-MM-DD HH24:MI:SS'), 8, 3, 1),
(2, 8, '煮面加盐更好', TO_TIMESTAMP('2024-03-02 20:00:00', 'YYYY-MM-DD HH24:MI:SS'), 15, 2, 1),
(1, 5, '已删除评论', TO_TIMESTAMP('2024-03-01 18:00:00', 'YYYY-MM-DD HH24:MI:SS'), 0, 0, 0);
```
:::

我们在Scala里创建对应的`case class`实体类：

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

`case class`的字段名和类型与数据库表结构对应，可空字段使用`Option`。

在默认情况下，sqala将**驼峰风格字段名映射到蛇形风格**的数据库列名。

sqala无需像其他查询库那样额外定义一个表结构对象，在创建好`case class`后，我们就可以使用实体类的**伴生对象**来构建查询了：

```scala
import sqala.static.dsl.*

val q = query:
    from(User).filter(d => d.id == 1)
```

## 自定义字段类型

sqala内置支持的基础字段类型为：

|字段类型                |字段类型               |字段类型               |
|:---------------------:|:---------------------:|:---------------------:|
|scala.Int              |scala.Long             |scala.Float            |
|scala.Double           |scala.String           |scala.Boolean          |
|scala.math.BigDecimal  |java.time.LocalDate    |java.time.LocalTime    |
|java.time.LocalDateTime|java.time.OffsetTime   |java.time.OffsetDateTime|
|scala.Option[T]        |scala.Array[T]         |                        |

其中`Option`和`Array`均支持跟以上类型组合使用，比如`Option[Array[Option[Int]]]`。

此外，为了支持SQL中的`JSON`数据和向量、空间数据，在`sqala.static.metadata`包中定义了下面的数据类型（这些类型均定义为`opaque type X = String`，以降低运行时开销）。

但除了`Json`类型之外，由于JDBC没有此类数据类型的标准，各数据库驱动实现差异较大，所以sqala没有内置反序列化实现，需要在构建查询时配合对应类型的SQL函数等操作转为基础数据类型：

|字段类型                |字段类型               |字段类型                 |
|:---------------------:|:---------------------:|:---------------------:|
|Json                   |Vector                 |                       |
|Point                  |LineString             |Polygon                 |
|MultiPoint             |MultiLineString        |MultiPolygon            |
|GeometryCollection     |Geometry               |                        |

所以在上面的例子中，我们使用`Int`来接收帖子和评论表的`state`字段，但是使用`Int`管理这样的枚举字段，既不安全，魔法数值也没有实际意义，因此我们更希望使用Scala3的`enum`来管理这样的字段：

```scala
enum DataState:
    case Active
    case Deleted
```

然后我们将实体类改为：

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

但当我们构建查询时：

```scala
import sqala.static.dsl.*

val q = query:
    from(Post).filter(p => p.state == DataState.Active)
```

sqala会返回一个编译错误。原因是sqala不知道如何处理这样的字段，为其生成查询，或从查询结果中反序列化。

因此我们需要为自定义类型提供`trait CustomField`的实现，为了避免构建查询时频繁导入，建议将实现放入自定义类型的伴生对象中：

```scala
import sqala.static.metadata.*

enum DataState:
    case Active
    case Deleted

object DataState:
    given CustomField[DataState, Int] with
        override def fromValue(x: Int): DataState = x match
            case 1 => Active
            case 0 => Deleted

        override def toValue(x: DataState): Int = x match
            case Active => 1
            case Deleted => 0
```

`Custom`的两个类型参数分别为要实现的类型，和要映射到的基础类型；`fromValue`方法处理如何从基础类型创建自定义类型的值，`toValue`方法含义反之。

这样，就可以正常使用枚举字段构造查询了。

## 设置主键

sqala支持`primaryKey`和`autoInc`注解标记主键字段和自增主键字段，由于上文中我们创建的示例表主键都是自增主键，因此我们把实体类定义改为：

```scala
import sqala.static.metadata.*

import java.time.LocalDateTime

case class User(
    @autoInc id: Int,
    name: String
)

case class Channel(
    @autoInc id: Int,
    name: String
)

case class Post(
    @autoInc id: Int,
    title: String,
    authorId: Int,
    channelId: Int,
    createTime: LocalDateTime,
    viewCount: Int,
    likeCount: Int,
    state: DataState
)

case class Comment(
    @autoInc id: Int,
    postId: Int,
    authorId: Int,
    content: String,
    createTime: LocalDateTime,
    parentId: Option[Int],
    likeCount: Int,
    state: DataState
)
```

sqala支持一个实体类中有多个`primaryKey`字段，但只支持一个`autoInc`字段。

## 自定义名称

如果实体类和数据库表不符合驼峰风格字段名映射到蛇形风格规则的话，可以使用`entityTable`和`column`注解手动管理名称：

```scala
import sqala.static.metadata.*

@entityTable("T_SOME_TABLE")
case class SomeTable(
    @autoInc @column("ID") id: Int
)
```

在完成元数据配置后，就可以开始使用sqala构建查询和增删改语句了。