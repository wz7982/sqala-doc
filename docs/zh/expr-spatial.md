# 空间和向量操作

sqala支持空间和向量方面的专用操作，为专业场景提供支持。

## 空间操作

sqala支持ISO/IEC 13249中定义的部分标准时间操作，支持MySQL和PostgreSQL的PostGIS插件。

|     函数                |      对应的SQL函数             |
|:-----------------------:|:-----------------------------:|
|`stGeomFromText(a, srid)`|`ST_GeomFromText(a, srid)`     |
|`stAsText(a)`            |`ST_AsText(a)`                 |
|`stAsGeoJson(a)`         |`ST_AsGeoJSON(a)`              |
|`stGeometryType(a)`      |`ST_GeometryType(a)`           |
|`stX(a)`                 |`ST_X(a)`                      |
|`stY(a)`                 |`ST_Y(a)`                      |
|`stArea(a)`              |`ST_Area(a)`                   |
|`stLength(a)`            |`ST_Length(a)`                 |
|`stDistance(a, b)`       |`ST_Distance(a, b)`            |
|`stContains(a, b)`       |`ST_Contains(a, b)`            |
|`stWithin(a, b)`         |`ST_Within(a, b)`              |
|`stIntersects(a, b)`     |`ST_Intersects(a, b)`          |
|`stTouches(a, b)`        |`ST_Touches(a, b)`             |
|`stOverlaps(a, b)`       |`ST_Overlaps(a, b)`            |
|`stCrosses(a, b)`        |`ST_Crosses(a, b)`             |
|`stDisjoint(a, b)`       |`ST_Disjoint(a, b)`            |
|`stIntersection(a, b)`   |`ST_Intersection(a, b)`        |
|`stUnion(a, b)`          |`ST_Union(a, b)`               |
|`stDifference(a, b)`     |`ST_Difference(a, b)`          |
|`stSymDifference(a, b)`  |`ST_SymDifference(a, b)`       |

## 向量操作

随着AI应用日渐火热，各种关系型数据库也陆续推出了向量运算功能，sqala也支持了向量运算符并做了一些数据库兼容工作，将字段类型设置成`sqala.metadata.Vector`即可应用此类运算符，方法名和转换规则如下：

|   方法                  | 含义      | PostgreSQL(pgvector插件) | Oracle 23ai       | MySQL 9.0(HeatWave)          |
|:-----------------------:|:---------:|:----------------------:|:------------------:|:----------------------------:|
|`euclideanDistance(a, b)`|欧氏距离   |`a <-> b`                |`L2_DISTANCE(a, b)` | `DISTANCE(a, b, 'EUCLIDEAN')`|
|`cosineDistance(a, b)`   |余弦距离   |`a <=> b`                |`COSINE_DISTANCE(a, b)`|`DISTANCE(a, b, 'COSINE')` |
|`dotDistance(a, b)`      | 负内积    |`a <#> b`                |`INNER_PRODUCT(a, b) * -1`|`DISTANCE(a, b, 'DOT')` |
|`manhattanDistance(a, b)`|曼哈顿距离 |`a <+> b`                |`L1_DISTANCE(a, b)`    | ❌                        |