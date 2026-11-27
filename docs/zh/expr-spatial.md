# 空间操作

> 本页功能属于 `sqala-static-ext` 模块，需要额外引入该模块，并导入：
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


## 空间函数

sqala支持ISO/IEC 13249中定义的部分标准空间操作，兼容MySQL与PostgreSQL的PostGIS插件。

除`stGeomFromText`要求第一个参数为字符串、第二个参数为数值外，其余函数的操作数均须为几何类型表达式，传入其它类型会产生编译错误。

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

## 几何值类型

`sqala.metadata`提供了几何值类型：`Geometry`、`Point`、`LineString`、`Polygon`、`MultiPoint`、`MultiLineString`、`MultiPolygon`、`GeometryCollection`。它们的结构一致：`value`为WKT字符串，`srid`为空间参考系统标识，例如：

```scala
import sqala.metadata.Point

val p = Point("POINT(1 2)", 4326)
```

实体字段可直接声明为这些类型以参与空间查询；查询结果中的几何列也会解码为对应的值类型。
