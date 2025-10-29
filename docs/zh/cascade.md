# 级联映射

sqala的查询虽然支持复杂查询，和各种关联结果，并可以将其自动映射到命名元组结构，但是，sqala并不是一个ORM框架，因此返回的结果都是平铺结构，如果我们想将查询结果映射到一个级联结构，比如：

```scala
case class ChannelVO(
    id: Int,
    name: String,
    posts: List[PostVO]
)

case class PostVO(
    id: Int,
    title: String,
    likeCount: Int,
    comments: List[CommentVO]
)

case class CommentVO(
    id: Int,
    content: String
)
```

不免需要编写一些样板代码。

为了减少样板代码，sqala支持使用宏，通过注解生成将平铺结果查询到级联结构的代码，核心注解有两个：

```scala
import sqala.static.metadata.*

@view(prefix = "channel", key = "id")
case class ChannelVO(
    id: Int,
    name: String,
    @nested
    posts: List[PostVO]
)

@view(prefix = "post", key = "id")
case class PostVO(
    id: Int,
    title: String,
    likeCount: Int,
    @nested
    comments: List[CommentVO]
)

@view(prefix = "comment", key = "id")
case class CommentVO(
    id: Int,
    content: String
)
```

`view`注解标记一个映射结构，`prefix`参数声明获取平铺结构字段时的字段前缀，`key`参数声明主键；

`nested`注解标记级联结构字段。

这样，我们就可以通过`toView`方法将平铺结构转换成级联结构：

```scala
val q = query:
    from:
        Channel
            .leftJoin(Post).on((c, p) => c.id == p.channelId)
            .leftJoin(Comment).on((_, p, c) => p.id == c.postId)
    .map: (c, p, ct) =>
        (
            channelId = c.id,
            channelName = c.name,
            postId = p.id,
            postTitle = p.title,
            postLikeCount = p.likeCount,
            commentId = ct.id,
            commentContent = ct.content
        )

// 返回类型为`List[ChannelVO]`
val result = db.fetch(q).toView[ChannelVO]
```

此外，`derivedField`注解标记派生字段，比如我们需要加一个热帖字段，规则是点赞数大于一定值，就可以使用`derivedField`：

```scala
@view(prefix = "channel", key = "id")
case class ChannelVO(
    id: Int,
    name: String,
    @nested
    posts: List[PostVO]
)

@view(prefix = "post", key = "id")
case class PostVO(
    id: Int,
    title: String,
    likeCount: Int,
    // source参数标记来源字段
    // mapper参数是转换函数
    @derivedField[Int, Boolean](source = "likeCount", mapper = _ > 10)
    hot: Boolean,
    @nested
    comments: List[CommentVO]
)

@view(prefix = "comment", key = "id")
case class CommentVO(
    id: Int,
    content: String
)
```

这样，sqala就能自动处理这样的派生字段了。

级联映射功能可以减少样板代码，但只对查询结果进行处理，不会带来诸如N + 1，懒加载等ORM的额外运行成本和学习成本。