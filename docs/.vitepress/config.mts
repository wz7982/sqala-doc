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
              { text: '入门', link: 'introduction' },
              { text: '元数据配置', link: 'metadata' },
              { text: '数据库交互', link: 'database' },
              {
                text: '查询',
                collapsed: false,
                items: [
                  { text: '基础查询', link: 'query' },
                  { text: '关联表', link: 'query-join' },
                  { text: '分组查询', link: 'query-group' },
                  { text: '集合操作', link: 'query-set' },
                  { text: '子查询', link: 'query-sub' },
                  { text: '动态构建查询', link: 'query-dynamic' },
                  { text: '递归查询', link: 'query-recursive' },
                  { text: '透视表', link: 'query-pivot' },
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
                  { text: '空间和向量操作', link: 'expr-spatial' },
                  { text: '自定义表达式', link: 'expr-custom' },
                ]
              },
              { text: '增删改DSL', link: 'update' },
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
              { text: 'Query', link: 'query' },
              { text: 'Tips on Construct Queries', link: 'tips' },
              { text: 'Expressions', link: 'expr' },
              { text: 'Interact with Database', link: 'database' },
              { text: 'CUD Operation', link: 'update' },
              { text: 'Native SQL', link: 'native' },
              { text: 'Examples', link: 'example' },
              { text: 'Dynamic Query', link: 'dynamic' },
            ],
          },
        },
      },
    },
  },
});
