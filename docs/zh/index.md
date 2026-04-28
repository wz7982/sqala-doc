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

3. **支持类型安全的主键查询**：按主键查询数据无需创建DSL，直接从实体类配置中读取主键类型作为参数类型并创建查询：

    ```scala
    // 返回类型为：List[User]
    val result = db.fetchByPrimaryKey[User](1)
    ```

4. **支持类型安全的命名查询**：简单查询无需创建DSL，sqala支持从方法名称中获取查询参数类型，并生成查询，而且无需预先定义方法：

    ```scala
    // 返回类型为：List[User]
    val result = db.fetchByIdAndNameOrderByIdDesc[User](1, "小黑")
    ```

5. **极致的类型安全**：sqala使用类型系统建模SQL语义，因此sqala的类型检查不仅可以拦截诸如“字段不存在”，“比较运算符两侧类型不兼容”等简单的错误，还可以拦截更多语义错误：

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

6. **极致性能**：使用Scala3的`inline`能力生成高性能的反序列化代码，其反序列化速度通常可达基于反射的Java主流查询库的数倍。

7. **透明性**：sqala不是传统ORM，查询DSL几乎会1比1生成查询，不会产生诸如N + 1等黑盒操作，性能可预测。

8. **多方言支持**：支持PostgreSQL、MySQL、Oracle、SQLServer在内的多种方言，同一个查询表达式传入不同的方言参数即可生成不同的SQL，在查询部分文档中将详细列出各数据库最新版本实测的支持程度。

9.  **强大的查询功能**：不仅是CRUD，sqala还支持多维分组、`LATERAL`子查询、透视表、递归查询、行模式识别、JSON表、属性图查询等高级功能。从简单场景到复杂数据分析，sqala为您提供一站式解决方案。

10. **专业场景支持**：支持`ISO/IEC 13249`标准定义的空间操作，为地理信息计算场景提供了专业支持。

11. **标准兼容**：内置兼容`ISO/IEC 9075` SQL 2023和`ISO/IEC 13249` SQL空间扩展的抽象语法树和通用SQL生成器，只需少量代码即可兼容更多数据库方言。

12. **轻量化**：除Scala、Java官方库外，没有额外依赖。

## 注意事项

1. 由于sqala目前没有基于Scala3 LTS版本构建，在Scala3 3.9 LTS版本之前，应用在生产环境需谨慎。

2. 请确保Scala版本在`3.8.2`及以上。

3. 推荐使用Scala官方的metals插件配合VSCode、Vim等工具使用，以获得更好的编写体验。

## 并发模型和错误处理

sqala使用同步JDBC，推荐配合JVM 21+的虚拟线程使用。

虚拟线程让同步代码获得异步级并发性能，但无需引入Effect系统的复杂度。

sqala目前使用异常机制处理数据库错误。

待 Scala3的实验性特性[CanThrow Capabilities](https://nightly.scala-lang.org/docs/reference/experimental/canthrow.html)成熟后，将升级为编译期可追溯的错误类型。

届时同步代码同时具备：简洁语法、虚拟线程高并发、以及类型安全错误管理。

## 使用场景建议

sqala支持查询DSL、使用方法名创建查询和原生SQL三种模式，使用建议如下：

| 场景           | 查询 DSL       | 方法名查询     | 原生 SQL               |
|---------------|---------------|---------------|-----------------------|
| 简单条件查询    | ✅ 推荐       | ✅ 推荐       | ⚠️ 可用              |
| 复杂查询       | ✅ 推荐       | ❌ 不支持     | ⚠️ 可用              |
| 类型安全       | ✅ 编译期检查 | ✅ 编译期检查 | ⚠️ 静态查询编译期检查 |
| 开发效率       | ✅ 高         | ✅ 极高       | ⚠️ 中等             |