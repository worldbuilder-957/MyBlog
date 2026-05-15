# Project Instructions

This file provides context for AI assistants working on this project.

## Project Overview

- **Type**: Hexo 静态博客站点
- **Site name**: Worldbuilder957
- **Domain**: http://worldbuilder957.com
- **Author**: Worldbuilder957
- **Email**: worldbuilder957@gmail.com
- **GitHub**: https://github.com/worldbuilder-957
- **Language**: 中文内容为主，配置为英文

## Tech Stack

- **框架**: Hexo 8.x (^8.0.0)
- **主题**: hexo-theme-keep v4.2.5 (主题文档: https://keep-docs.xpoet.cn)
- **渲染器**:
  - hexo-renderer-ejs (模板)
  - hexo-renderer-marked (Markdown)
  - hexo-renderer-stylus (样式)
- **包管理**: npm
- **部署方式**: 待定 (deploy.type 为空)

## Commands

| 命令 | 作用 |
|------|------|
| `npm install` | 安装依赖 |
| `npm run build` / `npx hexo generate` | 生成静态文件到 public/ |
| `npm run server` / `npx hexo server` | 本地预览 (默认 http://localhost:4000) |
| `npm run clean` / `npx hexo clean` | 清除 public/ 和缓存 |
| `npm run deploy` / `npx hexo deploy` | 部署 |
| `npx hexo new post "标题"` | 新建博文 |
| `npx hexo new page "页面名"` | 新建页面 |
| `npx hexo new draft "标题"` | 新建草稿 |

## Directory Structure

```
my_blog/
├── _config.yml              # Hexo 主配置
├── _config.keep.yml         # Keep 主题配置 (347行, 活动主题)
├── _config.landscape.yml    # Landscape 主题配置 (备用, 当前为空)
├── package.json             # 依赖与脚本
├── scaffolds/               # 模板 (post.md, page.md, draft.md)
├── source/                  # 内容源目录
│   ├── _posts/              # 博文 (4篇中文文章)
│   ├── about/index.md       # 关于页面
│   ├── links/index.md       # 友链页面
│   ├── tags/index.md        # 标签页面
│   ├── nav/                 # 自定义导航页 (独立HTML, 不经过Hexo模板)
│   │   ├── index.html       # 导航页主文件 (429行)
│   │   ├── style.css        # 导航页样式
│   │   ├── script.js        # 导航页逻辑
│   │   ├── sw.js            # Service Worker (PWA)
│   │   └── manifest.json    # PWA manifest
│   ├── images/              # 图片资源
│   └── MyWorks/             # 作品展示 (index.html)
└── themes/                  # 主题目录
```

## Key Configuration Notes

### _config.yml (Hexo 主配置)
- 主题: `keep`
- 语法高亮: highlight.js (非 prismjs)
- 首页分页: 每页10篇
- 永久链接格式: `:year/:month/:day/:title/`
- new_post_name: `:title.md`

### _config.keep.yml (Keep 主题配置)
- 主色: `#0066cc`
- 首页首屏: 启用, 描述 "Amor Fati."
- 导航菜单: home, archives, tags, links, about (categories 被注释)
- 滚动隐藏 header: 启用
- 首页显示标签: 启用
- 文章显示字数/阅读时间: 启用
- 文章作者徽章: 启用 (level_badge 模式)
- RSS: 启用 (依赖 hexo-generator-feed)
- 评论: 全部禁用
- 代码块工具栏: 禁用
- TOC: 禁用
- 搜索: 禁用
- PJAX: 禁用
- 懒加载: 禁用
- CDN: 禁用

## Blog Posts (source/_posts/)

| 文件 | 标题 | 日期 | 标签 |
|------|------|------|------|
| first-blog.md | first blog | 2025-11-19 | 随笔 |
| hello-world.md | Hello World | 2025-11-20 | - |
| 学习探索的乐趣.md | 学习探索的乐趣 | 2025-12-10 | - |
| 配置Linux系统的历程.md | 配置Linux系统的历程 | 2025-12-24 | 随笔 |

## Custom Navigation Page (source/nav/)

独立的导航起始页，不经过 Hexo 模板渲染（`layout: false`），功能包括：
- 多引擎搜索 (Google / Bing / Baidu / Yandex)
- 实时时钟与日期
- 周数 / 校历周显示
- 天气 (珠海)
- 股票行情 (上证/深证/创业板/道指/纳斯达克/标普500)
- 汇率 (USD/EUR/GBP/JPY → CNY)
- 待办事项列表 (支持本地存储与云端同步)
- 日历与日程管理 (FullCalendar + rrule)
- 快捷链接: AI工具 (Gemini/ChatGPT/Claude), 视频平台, 开发者链接
- PWA 支持 (manifest.json + service worker)

## Guidelines

- 遵循现有代码风格和模式
- 新功能编写测试
- 修改聚焦且原子化
- 文档化公开 API
- 博文使用中文, 文件名可使用中文
- 主题配置修改在 `_config.keep.yml` 中进行
- 自定义导航页修改在 `source/nav/` 中进行

## Important Notes

- 项目未安装 `hexo-generator-feed`，但 Keep 配置中 RSS 已启用；如需 RSS 功能需先 `npm install hexo-generator-feed`
- 导航页是独立页面（`layout: false`），不走 Hexo 模板和主题
- `public/` 目录在 .gitignore 中，是构建输出目录
- `node_modules/` 和 `.deepseek/` 在 .gitignore 中
- 当前有 4 篇博文，标签体系较简单（仅有"随笔"标签）
