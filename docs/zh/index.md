# sqala简介

sqala 是一个专为 Scala3设计的类型安全SQL查询库。它融合了Scala的表达力与SQL的强大功能，通过Scala3强大的类型系统保障数据库操作的高效与安全。其名称源自Scala与SQL的结合。

使用sqala，你可以：

1. **使用面向对象和类似集合库的方式构建查询**：类型安全的查询构建器将在编译期过滤掉大部分错误SQL，并且能自动推导返回数据类型：

    ```scala
    case class User(id: Int, name: String)

    val q = query:
        from(User)
            .filter(u => u.id == 1)
            .map(u => u.name)

    // 返回类型为：List[String]
    val result = db.fetch(q)
    ```

2. **使用Scala3新特性命名元组管理查询**：无需为投影、关联结果预先创建DTO，也无需`Map[String, Any]`，使用`.`调用返回字段且类型安全：

    ```scala
    val q = query:
        from(User).map(u => (id = u.id))

    // 返回类型为：List[(id: Int)]
    val result = db.fetch(q)

    for r <- result do
        println(r.id)
    ```

3. **无缝原生SQL支持**：sqala内建了原生SQL插值器，其不仅可以避免SQL注入，还支持将固定模板查询在编译期发送到数据库检查，计算查询返回类型，为您快速搭建Demo助力：

    ```scala
    val id = 1
    val result = db.fetch(sql"select id as userId, name as userName from user where id = $id")

    // 返回类型为：List[Record{ val userId: Int, val userName: String }]
    for r <- result do
        println(r.userId)
        println(r.userName)
    ```

    但我们相信，由于sqala提供了功能足够丰富的类型安全查询构建器，您几乎无需手写容易出错的原生SQL。

4. **支持主键查询**：按主键查询数据无需创建DSL，直接从实体类配置中读取主键类型并创建查询：

    ```scala
    // 回类型为：List[User]
    val result = db.fetchByPrimaryKey[User](1)
    ```

5. **支持命名查询**：简单查询无需创建DSL，sqala支持从方法名称中获取查询参数类型，并生成查询，而且无需预先定义方法：

    ```scala
    // 回类型为：List[User]
    val result = db.fetchByIdAndNameOrderByIdDesc[User](1, "小黑")
    ```

6. **极致的类型安全**：sqala的类型检查不仅可以拦截诸如“字段不存在”，“比较运算符两侧类型不兼容”等简单的错误，还可以拦截更多语义错误：

    ```scala
    val q1 = query:
        // 编译错误：WHERE子句不能包含聚合函数
        from(A).filter(a => a.x > count())

    val q2 = query:
        // 编译错误：a.x需要在分组中，或是在聚合函数中出现
        from(A).map(a => (a.x, count()))

    val q3 = query:
        // 编译错误：作为表达式的子查询返回多行数据
        from(A).map(a => from(A).map(_.a))

    // 等等
    ```

7. **极致性能**：使用Scala3的`inline`能力生成高性能的反序列化代码，其反序列化速度通常可达基于反射的Java主流查询库的数倍。

8. **多方言支持**：支持MySQL、PostgreSQL、Oracle在内的多种方言，同一个查询表达式传入不同的方言参数即可生成不同的SQL。

9. **强大的查询功能**：不仅是CRUD，sqala还支持多维分组、`LATERAL`子查询、透视表、递归查询、行模式识别、JSON表、属性图查询等高级功能。从简单场景到复杂数据分析，sqala为您提供一站式解决方案。

10. **专业场景支持**：支持向量和空间操作，为AI、地理信息计算场景也提供了专业支持。

11. **标准兼容**：内置兼容`ISO/IEC 9075` SQL 2023和`ISO/IEC 13249` SQL空间扩展的抽象语法树和通用SQL生成器，只需少量代码即可兼容更多数据库方言。

12. **轻量化**：除Scala、Java官方库外，没有额外依赖。

## 注意事项

1. 由于sqala目前没有基于Scala3 LTS版本构建，在Scala3发布下一个LTS版本之前，应用在生产环境需谨慎。

2. 请确保Scala版本在`3.7.0`及以上。

3. 尽量使用Scala官方的metals插件配合VSCode、Vim等工具使用，IDEA系列目前无法获得编写提示，也无法正确显示查询返回的数据类型。

## 使用场景建议

sqala支持查询DSL、使用方法名创建查询和原生SQL三种模式，使用建议如下：

| 场景           | 查询 DSL       | 方法名查询     | 原生 SQL               |
|---------------|---------------|---------------|-----------------------|
| 简单条件查询    | ✅ 推荐       | ✅ 推荐       | ⚠️ 可用              |
| 复杂查询       | ✅ 推荐       | ❌ 不支持     | ⚠️ 可用              |
| 类型安全       | ✅ 编译期检查 | ✅ 编译期检查 | ⚠️ 静态查询编译期检查 |
| 开发效率       | ✅ 高         | ✅ 极高       | ⚠️ 中等             |