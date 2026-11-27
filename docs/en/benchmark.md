# Benchmark

This page presents JMH benchmark results comparing sqala with common JVM database access frameworks. The benchmark code lives in the [benchmark](https://github.com/wz7982/sqala/tree/main/benchmark) module of the sqala repository, so the results can be reproduced locally.

Benchmark results depend on hardware, database version, connection pool settings, and JVM configuration, and should not be treated as absolute performance guarantees.

## Environment

- JDK 17.0.8
- Scala 3.9.0
- PostgreSQL 16.3 on `localhost:5432`
- All frameworks share the same HikariCP pool (maximumPoolSize = 32, minimumIdle = 8)
- Table `bench_user` with 100,000 rows and 10 columns, including nullable fields
- JMH: 1 fork, 8 threads, 3 × 1s warmup, 5 × 1s measurement, `-Xms2g -Xmx4g`
- sqala uses the PostgreSQL dialect; Hibernate, jOOQ, and Slick use their own PostgreSQL dialect / profile

Frameworks:

- Plain JDBC
- MyBatis 3.5.19
- Hibernate ORM 6.6.4
- jOOQ 3.19.15
- Slick 3.6.1
- sqala

Parsers:

- Alibaba Druid 1.2.23
- Apache Calcite 1.38.0
- JSqlParser 5.0
- sqala's built-in parser

## Workloads

1. **Point query**: look up a random primary key, read all 10 columns, and decode the row into an object.
2. **Range query**: start at a random id, return 10,000 consecutive rows, read all 10 columns, and decode every row.
3. **SQL parser**: parse the same analytical SQL statement, containing JOIN, BETWEEN, aggregates, HAVING, ORDER BY, and LIMIT/OFFSET.

## Point Query

| Implementation | Throughput (ops/s) | Relative to sqala | 8-thread latency (µs/op) |
| --- | ---: | ---: | ---: |
| Plain JDBC | 184,453 | 1.13x | 44.661 |
| **sqala** | **163,960** | **1.00x** | **49.842** |
| Hibernate | 162,893 | 0.99x | 49.843 |
| MyBatis | 144,305 | 0.88x | 52.845 |
| jOOQ | 131,174 | 0.80x | 59.990 |
| Slick | 122,490 | 0.75x | 66.066 |

![Point query throughput](/benchmark/en/01-point-throughput.png)

Point queries are dominated by the database round trip, so the differences between frameworks are relatively small. sqala is essentially on par with Hibernate.

## Range Query

| Implementation | Throughput (ops/s) | Relative to sqala | Row throughput (rows/s) | 8-thread latency (ms/op) |
| --- | ---: | ---: | ---: | ---: |
| Plain JDBC | 1,013.4 | 1.06x | 10,134,000 | 7.930 |
| **sqala** | **956.1** | **1.00x** | **9,561,000** | **8.285** |
| Slick | 846.5 | 0.89x | 8,465,000 | 9.352 |
| MyBatis | 625.8 | 0.65x | 6,258,000 | 12.754 |
| Hibernate | 486.6 | 0.51x | 4,866,000 | 15.953 |
| jOOQ | 440.6 | 0.46x | 4,406,000 | 17.886 |

![Range query throughput](/benchmark/en/03-range-throughput.png)

Batch-decoding 10,000 rows better highlights the differences between decoding implementations; sqala reaches about 94% of plain JDBC throughput.

## SQL Parsers

| Parser | Throughput (ops/s) | Relative to sqala | 8-thread latency (µs/op) |
| --- | ---: | ---: | ---: |
| Alibaba Druid | 2,258,782 | 1.65x | 3.654 |
| **sqala** | **1,371,140** | **1.00x** | **6.098** |
| Apache Calcite | 187,206 | 0.14x | 43.679 |
| JSqlParser | 7,292 | 0.005x | 1,090.824 |

![SQL parser throughput](/benchmark/en/05-parser-throughput.png)

Parser results are independent of the database. sqala's hand-written recursive-descent parser reaches about 61% of Druid's throughput but is substantially faster than Calcite and JSqlParser.

## Latency Charts

![Point query latency](/benchmark/en/02-point-latency.png)

![Range query latency](/benchmark/en/04-range-latency.png)

![SQL parser latency](/benchmark/en/06-parser-latency.png)

## Takeaways

- Point query throughput: sqala reaches about 164k ops/s, essentially on par with Hibernate and at about 89% of plain JDBC.
- Range query throughput: sqala reaches about 956 ops/s, or about 9.56 million rows/s, roughly 94% of plain JDBC and clearly ahead of MyBatis, Hibernate, and jOOQ.
- With 8 threads, point-query scaling is about 5.2–5.6x and range-query scaling is about 6.0–6.8x, and throughput is already starting to be limited by PostgreSQL's concurrency capacity.
- Parser throughput: Druid about 2.26M ops/s, sqala about 1.37M ops/s, Calcite about 187k ops/s, and JSqlParser about 7,300 ops/s.
- JMH `AverageTime` with multiple threads reports the mean of per-thread average time per operation, not aggregate throughput. Throughput is measured separately with `-bm thrpt -tu s`.

## Reproducing

```bash
# 8-thread average latency
sbt "benchmark/Jmh/run -rf json -rff benchmark/target/jmh-result-pg-mt-latency.json"

# 8-thread throughput
sbt "benchmark/Jmh/run -bm thrpt -tu s -rf json -rff benchmark/target/jmh-result-pg-mt-thrpt.json"

# Run a single workload
sbt "benchmark/Jmh/run -bm thrpt -tu s .*PointQueryBenchmark.*"
sbt "benchmark/Jmh/run -bm thrpt -tu s .*RangeQueryBenchmark.*"
sbt "benchmark/Jmh/run -bm thrpt -tu s .*ParserBenchmark.*"
```
