# sqala简介

sqala是一个专为Scala 3设计的类型安全SQL查询库。它融合了Scala的表达力与SQL的强大功能，借助Scala 3强大的类型系统保障数据库操作的高效与安全。其名称源自Scala与SQL的结合。

使用sqala，你可以：

1. **使用面向对象和类似集合库的方式构建查询**：类型安全的查询构建器会在编译期检查字段、运算符和结果类型，拦截诸如“字段不存在”“比较运算符两侧类型不兼容”等错误，并自动推导返回数据类型：

    ```scala
    case class User(id: Int, name: String)

    val query =
        from(User)
            .filter(u => u.id === 1)
            .map(u => u.name)

    // 返回类型为：List[String]
    val result = db.fetch(query)
    ```

2. **使用Scala 3新特性命名元组管理查询**：无需为投影、关联结果预先创建DTO，也无需`Map[String, Any]`，通过`.`访问返回字段且保持类型安全：

    ```scala
    val query =
        from(User).map(u => (id = u.id))

    // 返回类型为：List[(id: Int)]
    val result = db.fetch(query)

    for r <- result do
        println(r.id)
    ```

3. **支持类型安全的主键查询**：按主键查询数据无需编写DSL，直接从实体类配置中读取主键类型作为参数类型并生成查询：

    ```scala
    // 返回类型为：Option[User]
    val result = db.findByPrimaryKey[User](1)
    ```

4. **SQL 语义安全**：sqala还使用类型系统建模SQL语义，因此能在编译期拦截更多类型系统之外的SQL语义错误。这里的“安全”仅指编译期可判定的SQL语义，不覆盖动态查询、原生SQL、`unsafeExpr`、数据库schema漂移和运行时数据问题：

    ```scala
    val q1 =
        // 编译错误：WHERE子句不能包含聚合函数
        from(A).filter(a => a.x > count())

    val q2 =
        // 编译错误：a.x需要在分组中，或是在聚合函数中出现
        from(A).map(a => (a.x, count()))

    val q3 =
        // 编译错误：作为表达式的子查询返回多行数据
        from(A).map(a => from(A).map(_.a))

    val q4 =
        // 编译错误：聚合函数不能嵌套调用
        from(A).map(a => count(sum(a.x)))

    // 等等
    ```

5. **动态查询**：在拖拽式报表平台等场景，sqala提供动态查询功能：

    ```scala
    val query =
        select(column("b").as("col1"), column("c").as("col2"))
            .from(table("t"))
            .where(column("a") === value(1))
    ```

6. **SQL 解析器**：`core` 模块内置手写的递归下降 SQL 解析器，不依赖任何第三方解析器库，动态查询 DSL 通过`unsafeExpr`等方法基于它解析SQL片段。

7. **批量解码性能突出**：使用Scala 3的`inline`能力在编译期生成解码代码。在10,000行批量查询中，解码吞吐接近手写JDBC（约94%），通常高于MyBatis、Hibernate、jOOQ等基于反射/代理映射的框架。

8. **透明性**：sqala不是传统ORM，查询DSL几乎会1比1生成查询，不会产生诸如N + 1等黑盒操作，性能可预测。

9.  **多方言支持**：支持PostgreSQL、MySQL、Oracle等多种方言，同一个查询表达式传入不同的方言参数即可生成不同的SQL，在查询部分文档中将详细列出各数据库最新版本实测的支持程度。

10. **强大的查询功能**：不仅是CRUD，sqala还支持多维分组、`LATERAL`子查询、递归查询、行模式识别、JSON表、属性图查询等高级功能。从简单场景到复杂数据分析，sqala为您提供一站式解决方案。

11. **专业场景支持**：支持`ISO/IEC 13249`标准定义的空间操作，为地理信息计算场景提供了专业支持。

12. **标准兼容**：内置兼容`ISO/IEC 9075` SQL 2023和`ISO/IEC 13249` SQL空间扩展的抽象语法树和通用SQL生成器，只需少量代码即可兼容更多数据库方言。

13. **0依赖**：sqala的核心模块只依赖Scala、Java标准库，没有任何第三方依赖；只有`sqala-slf4j`和`sqala-spring-boot-starter`等可选集成模块会按需引入对应框架。

## 注意事项

1. sqala基于Scala 3.9.0 LTS版本构建，请确保Scala版本在`3.9.0`及以上。

2. 推荐使用Scala官方的metals插件配合VSCode、Vim等工具使用，以获得更好的编写体验。

## 并发模型和错误处理

sqala使用同步JDBC，推荐配合JVM 21+的虚拟线程使用。

虚拟线程让同步代码获得异步级并发性能，但无需引入Effect系统的复杂度。

sqala目前使用异常机制处理数据库错误。

待Scala 3的实验性特性[CanThrow Capabilities](https://nightly.scala-lang.org/docs/reference/experimental/canthrow.html)成熟后，将升级为编译期可追溯的错误类型。

届时同步代码同时具备：简洁语法、虚拟线程高并发、以及类型安全错误管理。

## 使用场景建议

sqala支持查询DSL和原生SQL两种模式，使用建议如下：

| 场景           | 查询 DSL       | 原生 SQL               |
|---------------|---------------|-----------------------|
| 简单条件查询    | ✅ 推荐       | ⚠️ 可用              |
| 复杂查询       | ✅ 推荐       | ⚠️ 可用              |
| 类型安全与语义安全 | ✅ 编译期检查 | ⚠️ 静态查询编译期检查 |
| 开发效率       | ✅ 高         | ⚠️ 中等             |