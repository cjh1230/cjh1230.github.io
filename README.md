# 崖岸笔记

> 一个清醒的体验派信徒在过程与跳跃之间写下的航海日志

这是我的个人博客项目，基于 [Astro](https://astro.build) 构建，主题使用 [Gyoza](https://github.com/lxchapu/astro-gyoza) 修改而成。

🌐 **在线访问**：https://cjh1230.github.io/

## ✨ 特性

- **轻量快速**：基于 Astro 的静态生成，极致的加载速度
- **响应式设计**：完美适配桌面、平板和移动设备
- **暗色/亮色主题**：支持系统主题跟随与手动切换
- **内容友好**：支持 Markdown 写作，代码高亮，数学公式渲染
- **渐进增强**：部分交互采用 Islands 架构，保持核心内容可访问性
- **搜索功能**：全站内容搜索支持
- **友链系统**：通过 GitHub PR 提交友链申请

## 🚀 本地开发

### 环境要求

- Node.js 18+
- pnpm（推荐）或 npm/yarn

### 安装与运行

```bash
# 克隆项目
git clone https://github.com/cjh1230/cjh1230.github.io.git
cd cjh1230.github.io

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

访问 http://localhost:4321 查看效果。

## 📁 项目结构

```
├── public/              # 静态资源
│   ├── img/            # 图片资源
│   └── fonts/          # 字体文件
├── src/
│   ├── components/     # Astro/React 组件
│   ├── content/        # 内容集合
│   │   ├── posts/     # 博客文章
│   │   └── friends/   # 友链数据
│   ├── layouts/       # 布局组件
│   ├── pages/         # 页面路由
│   ├── styles/        # 全局样式
│   └── utils/         # 工具函数
├── astro.config.mjs   # Astro 配置
├── tailwind.config.js # Tailwind CSS 配置
└── package.json
```

## 📝 内容管理

### 添加新文章

在 `src/content/posts/` 目录下创建新的 Markdown 文件：

```markdown
---
title: '文章标题'
date: '2024-01-01'
description: '文章简介'
tags: ['标签1', '标签2']
---

# 文章内容

使用标准 Markdown 语法写作...
```

### 文章 Frontmatter 字段

- `title`: 文章标题（必需）
- `date`: 发布日期（必需，ISO 格式）
- `description`: 文章描述（可选，用于 SEO 和预览）
- `tags`: 标签数组（可选）
- `draft`: 是否为草稿（可选，true/false）

## 🤝 友链申请

欢迎交换友链！申请流程：

1. Fork 本仓库
2. 在 `src/content/friends/` 目录下创建 `<short-name>.yaml` 文件
3. 按格式填写信息：
   ```yaml
   title: 网站名称
   description: 一句话介绍
   link: 网站地址
   avatar: 头像地址
   ```
4. 提交 Pull Request
5. 审核通过后自动部署

## 🛠️ 构建与部署

### 构建静态站点

```bash
pnpm build
```

构建结果将输出到 `dist/` 目录。

### 部署到 GitHub Pages

本项目已配置 GitHub Actions，自动构建并部署到 GitHub Pages。

- 主分支推送触发构建
- Pull Request 触发预览构建
- 自动生成 sitemap 和 RSS feed

## 🔧 技术栈

- **框架**: [Astro](https://astro.build)
- **UI 组件**: React + 部分原生 Web Components
- **样式**: Tailwind CSS
- **图标**: Iconfont 图标库
- **部署**: GitHub Pages + GitHub Actions
- **搜索**: 客户端全文搜索（基于 FlexSearch）
- **代码高亮**: Shiki

## 📄 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 📬 联系我

- 博客：https://cjh1230.github.io/
- GitHub：[@cjh1230](https://github.com/cjh1230)
- Email：2123277675@qq.com

---

> “我不设安全线，但相信过程会接住我。”  
> —— 写于某次硬磕到深夜后的清晨
