# Jio_Brandon's Blog

基于 [Hexo](https://hexo.io/) + [Fluid](https://github.com/fluid-dev/hexo-theme-fluid) 主题的个人博客，带管理员后台编辑功能。

## 项目结构

```
self-blog/
├── assets/                   # 全局静态资源
├── docs/                     # 文档
├── src/
│   ├── frontend/blog/        # Hexo 静态博客前端
│   │   ├── _config.yml       # Hexo 主配置
│   │   ├── _config.fluid.yml # Fluid 主题配置
│   │   ├── source/           # 博客源文件（文章、页面、自定义 CSS/JS）
│   │   └── package.json
│   └── backend/blog/         # Express 管理后台
│       ├── server.js         # API 服务（认证、文章/页面编辑、图片上传）
│       └── init-password.js  # 管理员密码初始化工具
└── README.md
```

## 快速开始

### 1. 环境要求

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9

### 2. 安装依赖

```bash
cd src/frontend/blog
npm install
```

### 3. 初始化管理员密码

```bash
npm run init-password
```

按提示输入两次密码，密码哈希会自动写入 `.env` 文件。

`.env` 文件示例：

```
ADMIN_PASSWORD_HASH=$2b$10$xxxxx
ADMIN_PORT=3000
JWT_SECRET=your-random-secret
```

### 4. 启动服务

```bash
# 同时启动前端（Hexo 预览）和后端（管理 API）
npm run dev

# 或者分别启动
npm run server   # Hexo 开发服务器 → http://localhost:4000
npm run admin    # 管理 API 服务 → http://localhost:3000
```

启动后：

| 服务 | 地址 |
|------|------|
| 博客前端 | http://localhost:4000 |
| 管理 API | http://localhost:3000/api |
| 健康检查 | http://localhost:3000/api/health |

### 5. 登录管理面板

- 访问博客任意页面，按 `Ctrl + Shift + A` 打开登录对话框
- 登录后，右下角会出现齿轮按钮，点击可打开管理面板

## 管理功能

| 功能 | 说明 |
|------|------|
| 新建/编辑/删除文章 | 支持 Markdown 编辑 + 实时预览，Ctrl+S 保存 |
| 更换 Banner 背景图 | 上传图片，自动应用于全站所有页面 |
| 编辑关于页面 | Markdown 编辑关于页内容 |
| 编辑标签页 | Markdown 编辑标签页内容 |
| 编辑友链页 | Markdown 编辑友链页内容 + JSON 管理友链列表 |
| 自动构建 | 所有修改自动触发 `hexo generate` 重建静态文件 |

## 常用命令

```bash
npm run build          # 生成静态文件到 public/
npm run clean          # 清除缓存和 public/
npm run server         # 启动 Hexo 预览服务器
npm run admin          # 启动管理后台
npm run dev            # 同时启动前端和后端
npm run init-password  # 初始化/修改管理员密码
```
