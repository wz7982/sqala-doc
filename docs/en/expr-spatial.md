# Spatial Operations

> The features on this page belong to the `sqala-static-ext` module. Add this module as a dependency and import the following:
>
> ```scala
> import sqala.static.dsl.*
> import sqala.static.ext.dsl.*
> ```


## Spatial Functions

sqala supports a subset of the standard spatial operations defined in ISO/IEC 13249. It supports MySQL and the PostGIS extension for PostgreSQL.

Except for `stGeomFromText`, which requires a string as its first argument and a number as its second, the operands of all other functions must be geometry-typed expressions; passing an expression of another type causes a compile error.

|     Function            |      Corresponding SQL Function |
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

## Geometry Value Types

`sqala.metadata` provides the geometry value types: `Geometry`, `Point`, `LineString`, `Polygon`, `MultiPoint`, `MultiLineString`, `MultiPolygon`, and `GeometryCollection`. They share the same structure: `value` is a WKT string and `srid` is the spatial reference system identifier. For example:

```scala
import sqala.metadata.Point

val p = Point("POINT(1 2)", 4326)
```

Entity fields can be declared directly as these types to participate in spatial queries; geometry columns in query results are also decoded into the corresponding value types.
