# Lecheeel.github.io

我的个人主页 — 用 **Astro 7** + **Tailwind CSS 4** 构建，部署于 GitHub Pages。

## ✨ 技术栈

- [Astro 7](https://astro.build) — Rust 编译器，极速构建
- [Tailwind CSS 4](https://tailwindcss.com) — CSS-first 配置，无 config 文件
- [Content Layer API](https://docs.astro.build/en/guides/content-collections/) — 类型安全的内容管理（Zod schema）
- GitHub Actions — 工作流模式持续部署，告别 gh-pages 分支

## 🚀 本地开发

```bash
pnpm install
pnpm dev        # 开发服务器 http://localhost:4321
pnpm build      # 构建到 dist/
pnpm preview    # 预览构建产物
```

## 📁 目录结构

```
src/
├── content.config.ts   # 内容层 schema（blog / projects / pages）
├── content/
│   ├── blog/           # 博客文章（Markdown）
│   ├── projects/       # 项目数据
│   └── pages/          # 单页内容（now / uses）
├── layouts/            # Base / PostLayout
├── components/         # Header / Footer / ThemeToggle
├── pages/              # 路由（含 RSS、404）
└── styles/global.css   # Tailwind 4 主题入口
```

## 📝 写作流程

1. 在 `src/content/blog/` 新建 `.md` 文件
2. 填写 frontmatter（title / description / pubDate / tags）
3. 推送 main 分支，GitHub Actions 自动构建部署

## 🔗 链接

- 站点: https://lecheeel.github.io
- 订阅: https://lecheeel.github.io/rss.xml
