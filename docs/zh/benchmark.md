# 性能基准

本页给出 sqala 与主流 JVM 数据库访问框架的 JMH 基准对比结果。基准代码位于 sqala 仓库的 [benchmark](https://github.com/wz7982/sqala/tree/main/benchmark) 模块，可自行复现。

基准结果受硬件、数据库版本、连接池参数和 JVM 配置的影响，不应视为绝对的性能承诺。

## 测试环境

- JDK 17.0.8
- Scala 3.9.0
- PostgreSQL 16.3，单机 `localhost:5432`
- 所有框架共用同一个 HikariCP 连接池（maximumPoolSize = 32，minimumIdle = 8）
- 测试表 `bench_user`，共 100,000 行、10 列，包含可空字段
- JMH：1 fork、8 threads、3 × 1s warmup、5 × 1s measurement，堆内存 `-Xms2g -Xmx4g`
- sqala 使用 PostgreSQL 方言；Hibernate、jOOQ、Slick 分别使用各自的 PostgreSQL 方言 / Profile

对比实现：

- 纯 JDBC
- MyBatis 3.5.19
- Hibernate ORM 6.6.4
- jOOQ 3.19.15
- Slick 3.6.1
- sqala

解析器对比：

- Alibaba Druid 1.2.23
- Apache Calcite 1.38.0
- JSqlParser 5.0
- sqala 内置解析器

## 测试内容

1. **点查**：按随机主键查询，读取全部 10 列并反序列化为对象。
2. **范围查询**：从随机起点返回连续 10,000 行，读取全部 10 列并反序列化。
3. **SQL 解析器**：解析同一条包含 JOIN、BETWEEN、聚合、HAVING、ORDER BY、LIMIT/OFFSET 的分析型 SQL。

## 点查

| 实现 | 吞吐 (ops/s) | 相对 sqala | 8 线程延迟 (µs/op) |
| --- | ---: | ---: | ---: |
| 纯 JDBC | 184,453 | 1.13x | 44.661 |
| **sqala** | **163,960** | **1.00x** | **49.842** |
| Hibernate | 162,893 | 0.99x | 49.843 |
| MyBatis | 144,305 | 0.88x | 52.845 |
| jOOQ | 131,174 | 0.80x | 59.990 |
| Slick | 122,490 | 0.75x | 66.066 |

![随机主键点查吞吐](/benchmark/01-point-throughput.png)

点查耗时主要来自数据库往返，各框架之间的差距相对较小，sqala 与 Hibernate 基本持平。

## 范围查询

| 实现 | 吞吐 (ops/s) | 相对 sqala | 行吞吐 (行/s) | 8 线程延迟 (ms/op) |
| --- | ---: | ---: | ---: | ---: |
| 纯 JDBC | 1,013.4 | 1.06x | 10,134,000 | 7.930 |
| **sqala** | **956.1** | **1.00x** | **9,561,000** | **8.285** |
| Slick | 846.5 | 0.89x | 8,465,000 | 9.352 |
| MyBatis | 625.8 | 0.65x | 6,258,000 | 12.754 |
| Hibernate | 486.6 | 0.51x | 4,866,000 | 15.953 |
| jOOQ | 440.6 | 0.46x | 4,406,000 | 17.886 |

![随机范围查询吞吐](/benchmark/03-range-throughput.png)

10,000 行的批量解码更能体现各反序列化实现的差异，sqala 的吞吐约为纯 JDBC 的 94%。

## SQL 解析器

| 解析器 | 吞吐 (ops/s) | 相对 sqala | 8 线程延迟 (µs/op) |
| --- | ---: | ---: | ---: |
| Alibaba Druid | 2,258,782 | 1.65x | 3.654 |
| **sqala** | **1,371,140** | **1.00x** | **6.098** |
| Apache Calcite | 187,206 | 0.14x | 43.679 |
| JSqlParser | 7,292 | 0.005x | 1,090.824 |

![SQL 解析器吞吐](/benchmark/05-parser-throughput.png)

解析器测试与数据库无关。sqala 的手写递归下降解析器吞吐约为 Druid 的 61%，但明显高于 Calcite 与 JSqlParser。

## 延迟图表

![随机主键点查延迟](/benchmark/02-point-latency.png)

![随机范围查询延迟](/benchmark/04-range-latency.png)

![SQL 解析器延迟](/benchmark/06-parser-latency.png)

## 结论

- 点查吞吐：sqala 约 16.4 万 ops/s，与 Hibernate 基本持平，约为纯 JDBC 的 89%。
- 范围查询吞吐：sqala 约 956 ops/s，即每秒约 956 万行，约为纯 JDBC 的 94%，明显领先 MyBatis、Hibernate 与 jOOQ。
- 8 线程下点查的扩展比约为 5.2～5.6 倍，范围查询约为 6.0～6.8 倍，且已开始受到 PostgreSQL 并发处理能力的限制。
- 解析器吞吐：Druid 约 226 万 ops/s，sqala 约 137 万 ops/s，Calcite 约 18.7 万 ops/s，JSqlParser 约 7,300 ops/s。
- JMH 的 `AverageTime` 在多线程下报告的是各线程平均每操作耗时的均值，不等同于聚合吞吐；吞吐指标通过 `-bm thrpt -tu s` 另行测量。

## 复现

```bash
# 8 线程平均延迟
sbt "benchmark/Jmh/run -rf json -rff benchmark/target/jmh-result-pg-mt-latency.json"

# 8 线程吞吐
sbt "benchmark/Jmh/run -bm thrpt -tu s -rf json -rff benchmark/target/jmh-result-pg-mt-thrpt.json"

# 只跑某一项
sbt "benchmark/Jmh/run -bm thrpt -tu s .*PointQueryBenchmark.*"
sbt "benchmark/Jmh/run -bm thrpt -tu s .*RangeQueryBenchmark.*"
sbt "benchmark/Jmh/run -bm thrpt -tu s .*ParserBenchmark.*"
```
