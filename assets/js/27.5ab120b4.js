(window.webpackJsonp=window.webpackJsonp||[]).push([[27],{309:function(t,a,s){"use strict";s.r(a);var n=s(14),e=Object(n.a)({},(function(){var t=this,a=t.$createElement,s=t._self._c||a;return s("ContentSlotsDistributor",{attrs:{"slot-key":t.$parent.slotKey}},[s("h1",{attrs:{id:"json支持"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#json支持"}},[t._v("#")]),t._v(" JSON支持")]),t._v(" "),s("p",[t._v("sqala为JSON提供了支持，我们可以导入"),s("code",[t._v("import sqala.data.json.*")]),t._v("来将查询结果生成JSON，或是从JSON映射到实体结果。")]),t._v(" "),s("p",[t._v("首先添加依赖：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[t._v("libraryDependencies "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("+=")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"com.wz7982"')]),t._v(" "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("%")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"sqala-data_3"')]),t._v(" "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("%")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"latest.integration"')]),t._v("\n")])])]),s("h2",{attrs:{id:"生成json"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#生成json"}},[t._v("#")]),t._v(" 生成JSON")]),t._v(" "),s("p",[t._v("使用"),s("code",[t._v("toJson")]),t._v("方法，可以将一个对象映射到JSON字符串：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("import")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("sqala"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("data"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("json"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")])]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("*")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("class")]),t._v(" People"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("id"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("Int")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" name"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" birthday"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" LocalDate"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" address"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Option"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" emails"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" List"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" people "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" People"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"小黑"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" LocalDate"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("parse"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"1990-01-01"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" None"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" List"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"xxxx@xxxx.com"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"yyyy@yyyy.com"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" json"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" people"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("toJson\n")])])]),s("p",[t._v("上面的代码会生成JSON：")]),t._v(" "),s("div",{staticClass:"language-json extra-class"},[s("pre",{pre:!0,attrs:{class:"language-json"}},[s("code",[s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"id"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"name"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"小黑"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"birthday"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"1990-01-01 00:00:00"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"address"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token null keyword"}},[t._v("null")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"emails"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"xxxx@xxxx.com"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"yyyy@yyyy.com"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),s("p",[t._v("sqala的JSON模块内置支持的字段类型有：")]),t._v(" "),s("table",[s("thead",[s("tr",[s("th",{staticStyle:{"text-align":"center"}},[t._v("字段类型")]),t._v(" "),s("th",{staticStyle:{"text-align":"center"}},[t._v("字段类型")])])]),t._v(" "),s("tbody",[s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Int")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.String")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Long")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Boolean")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Float")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("java.util.Date")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Double")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("java.time.LocalDate")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.math.BigDecimal")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("java.time.LocalDateTime")])])])]),t._v(" "),s("p",[t._v("以及这些类型对应的"),s("code",[t._v("Option")]),t._v("和"),s("code",[t._v("List")]),t._v("类型，其中"),s("code",[t._v("Option")]),t._v("的"),s("code",[t._v("None")]),t._v("会映射成JSON的"),s("code",[t._v("null")]),t._v("，"),s("code",[t._v("List")]),t._v("会映射成JSON的数组。")]),t._v(" "),s("p",[t._v("使用以上类型组成的"),s("code",[t._v("case class")]),t._v("和"),s("code",[t._v("enum")]),t._v("都可以自动生成"),s("code",[t._v("toJson")]),t._v("的实现。")]),t._v(" "),s("p",[t._v("下面来看一个"),s("code",[t._v("enum")]),t._v("的例子：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("import")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("sqala"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("data"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("json"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")])]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("*")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("enum")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Off\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" On\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("enum")]),t._v(" Result"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),t._v("T"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Success"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("data"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" T"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Failure"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("code"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("Int")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" msg"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("class")]),t._v(" User"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("id"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("Int")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" name"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" state"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" r1 "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" Result"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("User"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"小黑"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("On"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" json1 "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" r1"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("toJson\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" r2 "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" Result"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),t._v("User"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"错误"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" json2 "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" r2"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("toJson\n")])])]),s("p",[t._v("会分别生成JSON：")]),t._v(" "),s("div",{staticClass:"language-json extra-class"},[s("pre",{pre:!0,attrs:{class:"language-json"}},[s("code",[s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"Success"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n        "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"id"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n        "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"name"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"小黑"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n        "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"state"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"On"')]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),s("p",[t._v("和")]),t._v(" "),s("div",{staticClass:"language-json extra-class"},[s("pre",{pre:!0,attrs:{class:"language-json"}},[s("code",[s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"Failure"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("{")]),t._v("\n        "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"code"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v("\n        "),s("span",{pre:!0,attrs:{class:"token property"}},[t._v('"msg"')]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"错误"')]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("}")]),t._v("\n")])])]),s("h2",{attrs:{id:"json反序列化"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#json反序列化"}},[t._v("#")]),t._v(" JSON反序列化")]),t._v(" "),s("p",[t._v("使用"),s("code",[t._v("fromJson")]),t._v("方法可以将JSON字符串映射回对象，映射过程中可能产生"),s("code",[t._v("JsonDecodeException")]),t._v("，所以我们要"),s("code",[t._v("import scala.language.experimental.saferExceptions")]),t._v("，并在"),s("code",[t._v("try")]),t._v("表达式中使用它：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("import")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("sqala"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("data"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("json"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")])]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("*")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("import")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("scala"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("language"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("experimental"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("saferExceptions")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" json "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token triple-quoted-string string"}},[t._v('"""\n{\n    "id": 1,\n    "name": "小黑",\n    "birthday": "1990-01-01 00:00:00",\n    "address": null,\n    "emails": ["xxxx@xxxx.com", "yyyy@yyyy.com"]\n}\n"""')]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("try")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("val")]),t._v(" people "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" fromJson"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),t._v("People"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("json"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n    println"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("people"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("catch")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" e"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" JsonDecodeException "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("=>")]),t._v(" println"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("e"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("msg"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),s("h2",{attrs:{id:"json注解"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#json注解"}},[t._v("#")]),t._v(" JSON注解")]),t._v(" "),s("p",[t._v("sqala提供了两个JSON相关注解，分别是"),s("code",[t._v("@jsonAlias")]),t._v("和"),s("code",[t._v("@jsonIgnore")]),t._v("。")]),t._v(" "),s("p",[s("code",[t._v("@jsonAlias")]),t._v("可以对字段起别名，序列化和反序列化会使用字段的别名：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("import")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("sqala"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("data"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("json"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")])]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("*")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("class")]),t._v(" A"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token annotation punctuation"}},[t._v("@jsonAlias")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"xx"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" x"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("Int")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),s("p",[s("code",[t._v("jsonIgnore")]),t._v("标记可以忽略的字段，这样的字段会在生成JSON时被忽略；")]),t._v(" "),s("p",[t._v("在反序列化时，如果JSON字符串中没有提供这个字段的值，sqala将会尝试使用默认值进行填充，填充的优先级为"),s("strong",[t._v("JSON提供的值 > case class字段的默认值 > 类型默认值")]),t._v("，比如：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("import")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("sqala"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("data"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("json"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")])]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("*")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("class")]),t._v(" B"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token annotation punctuation"}},[t._v("@jsonIgnore")]),t._v(" x"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("Int")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token annotation punctuation"}},[t._v("@jsonIgnore")]),t._v(" y"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("Int")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),s("p",[t._v("如果提供的JSON为一个空对象，此时生成的结果为：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[t._v("B"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("0")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),s("p",[t._v("sqala提供的类型默认值为：")]),t._v(" "),s("table",[s("thead",[s("tr",[s("th",{staticStyle:{"text-align":"center"}},[t._v("字段类型")]),t._v(" "),s("th",{staticStyle:{"text-align":"center"}},[t._v("默认值")])])]),t._v(" "),s("tbody",[s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Int")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("0")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Long")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("0L")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Float")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("0F")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Double")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("0D")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.math.BigDecimal")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("BigDecimal(0)")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.String")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v('""')])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Boolean")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("false")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("java.util.Date")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("new Date")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("java.time.LocalDate")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("LocalDate.now()")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("java.time.LocalDateTime")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("LocalDateTime.now()")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.Option")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("None")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("scala.List")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("Nil")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("case class")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("使用字段默认值构建的实例")])]),t._v(" "),s("tr",[s("td",{staticStyle:{"text-align":"center"}},[t._v("enum")]),t._v(" "),s("td",{staticStyle:{"text-align":"center"}},[t._v("枚举的第一项")])])])]),t._v(" "),s("h2",{attrs:{id:"日期格式"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#日期格式"}},[t._v("#")]),t._v(" 日期格式")]),t._v(" "),s("p",[t._v("sqala的JSON模块默认将会使用"),s("code",[t._v("yyyy-MM-dd HH:mm:ss")]),t._v("进行日期格式处理，如果想替换掉默认的日期格式，在作用域中"),s("strong",[t._v("添加或导入")]),t._v("一个"),s("code",[t._v("given JsonDateFormat")]),t._v("即可：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("import")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("sqala"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("data"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("json"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")])]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("*")]),t._v("\n\n"),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("given")]),t._v(" JsonDateFormat "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" JsonDateFormat"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"yyyy-MM-ddTHH:mm:ss"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),s("p",[t._v("此时生成JSON和反序列化都可以使用该日期格式进行处理。")]),t._v(" "),s("h2",{attrs:{id:"自定义实现"}},[s("a",{staticClass:"header-anchor",attrs:{href:"#自定义实现"}},[t._v("#")]),t._v(" 自定义实现")]),t._v(" "),s("p",[t._v("sqala的JSON操作使用Scala3的"),s("code",[t._v("类型类推导")]),t._v("机制，因此我们可以非常方便地替换掉某部分的实现，而无需在需要定制化的场景中手动编写全部的序列化/反序列化代码，在了解如何自定义实现之前，我们需要先了解sqala提供的"),s("code",[t._v("JsonNode")]),t._v("。")]),t._v(" "),s("p",[s("code",[t._v("JsonNode")]),t._v("是一个Scala3的"),s("code",[t._v("enum")]),t._v("，sqala的JSON操作都使用"),s("code",[t._v("JsonNode")]),t._v("作为中间结构，其定义如下：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("enum")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Num"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("number"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Number"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Str"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("string"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Bool"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("boolean"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("Boolean")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Null\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Object"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("items"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" Map"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),s("span",{pre:!0,attrs:{class:"token builtin"}},[t._v("String")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(",")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Array"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("items"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" List"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),t._v("JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),s("p",[t._v("枚举项涵盖了JSON的基础结构，下面我们来尝试自定义一个字段类型的JSON实现。")]),t._v(" "),s("p",[t._v("有如下枚举：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("enum")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" Off\n    "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" On\n")])])]),s("p",[t._v("我们希望在生成JSON时，不使用枚举项的名字，而是使用替代的状态码，可以提供一个"),s("code",[t._v("JsonEncoder")]),t._v("的实例：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("given")]),t._v(" JsonEncoder"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),t._v("State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("with")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("override")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("def")]),t._v(" encode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("x"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("using")]),t._v(" JsonDateFormat"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" JsonNode "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" x "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("match")]),t._v("\n        "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Off "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("=>")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Num"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("0")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n        "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("On "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("=>")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Num"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v("\n")])])]),s("p",[t._v("同时我们希望，前端无论是传递状态码、枚举项名称、或是其代表的含义时，都可以成功反序列化，可以提供一个"),s("code",[t._v("JsonDecoder")]),t._v("实例：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("given")]),t._v(" JsonDecoder"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),t._v("State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("with")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("override")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("def")]),t._v(" decode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),t._v("node"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("using")]),t._v(" JsonDateFormat"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" State throws JsonDecodeException "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v("\n        node "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("match")]),t._v("\n            "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Num"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token number"}},[t._v("1")]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Str"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"On"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("|")]),t._v(" JsonNode"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Str"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("(")]),s("span",{pre:!0,attrs:{class:"token string"}},[t._v('"开启"')]),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(")")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("=>")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("On\n            "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("case")]),t._v(" _ "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("=>")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Off\n")])])]),s("p",[t._v("如果我们想调整反序列化的默认值，可以提供一个"),s("code",[t._v("JsonDefaultValue")]),t._v("实例：")]),t._v(" "),s("div",{staticClass:"language-scala extra-class"},[s("pre",{pre:!0,attrs:{class:"language-scala"}},[s("code",[s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("given")]),t._v(" JsonDefaultValue"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("[")]),t._v("State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v("]")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("with")]),t._v("\n    "),s("span",{pre:!0,attrs:{class:"token namespace"}},[t._v("override")]),t._v(" "),s("span",{pre:!0,attrs:{class:"token keyword"}},[t._v("def")]),t._v(" defaultValue"),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v(":")]),t._v(" State "),s("span",{pre:!0,attrs:{class:"token operator"}},[t._v("=")]),t._v(" State"),s("span",{pre:!0,attrs:{class:"token punctuation"}},[t._v(".")]),t._v("Off\n")])])]),s("p",[t._v("如果需要使用sqala没有内置支持的字段类型，同样为该类型提供这三个"),s("code",[t._v("trait")]),t._v("的实现即可。")])])}),[],!1,null,null,null);a.default=e.exports}}]);