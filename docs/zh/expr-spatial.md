# 空间操作

## 空间函数

sqala支持ISO/IEC 13249中定义的部分标准空间操作，支持MySQL和PostgreSQL的PostGIS插件。

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