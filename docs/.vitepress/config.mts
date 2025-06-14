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
              { text: '查询', link: 'query' },
              { text: '查询构造技巧', link: 'tips' },
              { text: '表达式', link: 'expr' },
              { text: '数据库交互', link: 'database' },
              { text: '增删改', link: 'update' },
              { text: '原生SQL', link: 'native' },
              { text: '示例', link: 'example' },
              { text: '动态查询', link: 'dynamic' },
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
