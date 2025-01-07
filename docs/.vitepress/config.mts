import { defineConfig } from 'vitepress';
import { fetchItems } from './fetch_sidebar.mts';

export default defineConfig({
  title: 'sqala',
  description: '类型安全的Scala3查询库',
  base: '/sqala-doc',
  rewrites: {
    'zh/:rest*': ':rest*',
  },
  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/wz7982/sqala' },
    ],
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
              { text: '元数据配置', link: 'zh/metadata' },
              { text: '查询', link: 'zh/query' },
              { text: '数据库交互', link: 'zh/database' }
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
            items: fetchItems('en'),
          },
        },
      },
    },
  },
});
