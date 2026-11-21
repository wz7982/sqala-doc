import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'sqala',
  description: '类型安全的Scala3查询库',
  base: '/sqala-doc',
  rewrites: {
    'zh/:rest*': ':rest*',
  },
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/wz7982/sqala' }],
    search: {
      provider: 'local',
    },
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-Hans',
      themeConfig: {
        langMenuLabel: '多语言',
        nav: [{ text: '主页', link: '/' }],
        sidebar: {
          '/': {
            base: '/',
            items: [
              { text: '元数据配置', link: 'metadata' },
              { text: '数据库交互', link: 'database' },
              { text: 'Spring Boot 集成', link: 'spring-boot' },
              { text: 'ZIO 集成', link: 'zio' },
              { text: '性能基准', link: 'benchmark' },
              {
                text: '查询',
                collapsed: false,
                items: [
                  { text: '基础查询', link: 'query' },
                  { text: '关联表', link: 'query-join' },
                  { text: '分组查询', link: 'query-group' },
                  { text: '集合操作', link: 'query-set' },
                  { text: '子查询', link: 'query-sub' },
                  { text: '条件构建查询', link: 'query-cond' },
                  { text: '递归查询', link: 'query-recursive' },
                  { text: 'JSON表', link: 'query-json' },
                  { text: '函数表', link: 'query-func' },
                  { text: '行模式识别', link: 'query-recognize' },
                  { text: '属性图查询', link: 'query-graph' },
                ]
              },
              {
                text: '表达式',
                collapsed: false,
                items: [
                  { text: '基础表达式', link: 'expr' },
                  { text: '聚合函数', link: 'expr-agg' },
                  { text: '窗口函数', link: 'expr-window' },
                  { text: '时间操作', link: 'expr-time' },
                  { text: 'JSON操作', link: 'expr-json' },
                  { text: '空间操作', link: 'expr-spatial' },
                  { text: '自定义表达式', link: 'expr-custom' },
                ]
              },
              { text: '增删改DSL', link: 'update' },
              { text: '动态查询', link: 'dynamic' },
              { text: '原生SQL', link: 'native' },
            ],
          },
        },
      },
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      themeConfig: {
        nav: [{ text: 'Home', link: '/en/' }],
        sidebar: {
          '/en/': {
            base: '/en/',
            items: [
              { text: 'Getting Started', link: 'introduction' },
              { text: 'Metadata Configuration', link: 'metadata' },
              { text: 'Database Interaction', link: 'database' },
              { text: 'Spring Boot Integration', link: 'spring-boot' },
              { text: 'ZIO Integration', link: 'zio' },
              { text: 'Benchmark', link: 'benchmark' },
              {
                text: 'Query',
                collapsed: false,
                items: [
                  { text: 'Basic Query', link: 'query' },
                  { text: 'Joins', link: 'query-join' },
                  { text: 'Grouping', link: 'query-group' },
                  { text: 'Set Operations', link: 'query-set' },
                  { text: 'Subqueries', link: 'query-sub' },
                  { text: 'Conditional Query Building', link: 'query-cond' },
                  { text: 'Recursive Queries', link: 'query-recursive' },
                  { text: 'JSON Tables', link: 'query-json' },
                  { text: 'Function Tables', link: 'query-func' },
                  { text: 'Row Pattern Recognition', link: 'query-recognize' },
                  { text: 'Property Graph Queries', link: 'query-graph' },
                ]
              },
              {
                text: 'Expressions',
                collapsed: false,
                items: [
                  { text: 'Basic Expressions', link: 'expr' },
                  { text: 'Aggregate Functions', link: 'expr-agg' },
                  { text: 'Window Functions', link: 'expr-window' },
                  { text: 'Time Operations', link: 'expr-time' },
                  { text: 'JSON Operations', link: 'expr-json' },
                  { text: 'Spatial Operations', link: 'expr-spatial' },
                  { text: 'Custom Expressions', link: 'expr-custom' },
                ]
              },
              { text: 'CUD DSL', link: 'update' },
              { text: 'Dynamic Queries', link: 'dynamic' },
              { text: 'Native SQL', link: 'native' },
            ],
          },
        },
      },
    },
  },
});