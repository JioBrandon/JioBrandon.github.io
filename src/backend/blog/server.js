/**
 * Blog Admin Server
 * 轻量级 Express 后端，提供管理员认证、内容管理和图片上传功能
 *
 * 启动方式：
 * - 开发: npx hexo server (localhost:4000) + node src/backend/blog/server.js (localhost:3000)
 * - 生产: node src/backend/blog/server.js (localhost:3000 同时提供 API 和静态文件)
 */

'use strict';

const path = require('path');

// 博客根目录：server.js 在 src/backend/blog/ 下，博客根目录在 src/frontend/blog/
const BLOG_DIR = path.resolve(__dirname, '..', '..', 'frontend', 'blog');

// 将博客的 node_modules 加入模块搜索路径（跨平台，无需 NODE_PATH 环境变量）
const blogNodeModules = path.join(BLOG_DIR, 'node_modules');
if (!module.paths.includes(blogNodeModules)) {
  module.paths.unshift(blogNodeModules);
}

require('dotenv').config({ path: path.join(BLOG_DIR, '.env'), override: true });

const express = require('express');
const multer = require('multer');
const yaml = require('js-yaml');
const fs = require('fs');
const crypto = require('crypto');
const { SignJWT, jwtVerify } = require('jose');
const bcrypt = require('bcryptjs');
const { spawn } = require('child_process');

// ============================================
// 配置
// ============================================
const PORT = parseInt(process.env.ADMIN_PORT || '3000', 10);
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex')
);
const JWT_EXPIRES = '24h';
const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || '';

const SOURCE_DIR = path.join(BLOG_DIR, 'source');
const POSTS_DIR = path.join(SOURCE_DIR, '_posts');
const ASSETS_DIR = path.join(SOURCE_DIR, 'assets');
const ABOUT_FILE = path.join(SOURCE_DIR, 'about', 'index.md');

const CATEGORIES_FILE = path.join(SOURCE_DIR, 'categories', 'index.md');
const LINKS_FILE = path.join(SOURCE_DIR, 'links', 'index.md');
const CONFIG_FILE = path.join(BLOG_DIR, '_config.fluid.yml');
const PUBLIC_DIR = path.join(BLOG_DIR, 'public');
const DATA_DIR = path.join(__dirname, 'data');

// 确保必要目录存在
[ASSETS_DIR, POSTS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ============================================
// JWT 工具函数
// ============================================
async function signToken() {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES)
    .sign(JWT_SECRET);
}

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

// ============================================
// 认证中间件
// ============================================
async function authMiddleware(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }
  if (!token && req.cookies) {
    token = req.cookies.admin_token;
  }

  if (!token) {
    return res.status(401).json({ error: '未登录' });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: '登录已过期' });
  }
  next();
}

// ============================================
// Markdown Front-matter 工具
// ============================================
function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontMatter: {}, body: raw, yaml: '' };
  }
  try {
    const parsed = yaml.load(match[1]) || {};
    return { frontMatter: parsed, body: match[2], yaml: match[1] };
  } catch {
    return { frontMatter: {}, body: raw, yaml: match[1] };
  }
}

function serializeFrontMatter(frontMatter, body) {
  const yamlStr = yaml.dump(frontMatter, { lineWidth: -1 }).trim();
  return `---\n${yamlStr}\n---\n${body || ''}`;
}

// ============================================
// Hexo 构建触发器（异步，排队防并发）
// ============================================
let building = false;
let pending = false;

function triggerBuild() {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  pending = false;

  console.log('[build] 开始 hexo generate ...');
  const start = Date.now();
  const child = spawn('npx', ['hexo', 'generate'], {
    cwd: BLOG_DIR,
    shell: true,
    env: { ...process.env, PATH: process.env.PATH },
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', d => { stdout += d.toString(); });
  child.stderr.on('data', d => { stderr += d.toString(); });

  child.on('close', code => {
    building = false;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    if (code === 0) {
      console.log(`[build] 完成 (${elapsed}s)`);
    } else {
      console.error(`[build] 失败 (exit ${code}): ${stderr || stdout}`);
    }
    if (pending) {
      setTimeout(triggerBuild, 500);
    }
  });
}

// ============================================
// 路径安全校验
// ============================================
function safePath(base, filename) {
  const resolved = path.resolve(base, filename);
  if (!resolved.startsWith(path.resolve(base))) {
    throw new Error('路径越权');
  }
  return resolved;
}

// ============================================
// Express 应用初始化
// ============================================
const app = express();

app.use(express.json({ limit: '5mb' }));

// 简易 cookie 解析
app.use((req, res, next) => {
  req.cookies = {};
  const header = req.headers.cookie;
  if (header) {
    header.split(';').forEach(c => {
      const parts = c.trim().split('=');
      if (parts.length >= 2) {
        req.cookies[parts[0].trim()] = decodeURIComponent(parts.slice(1).join('='));
      }
    });
  }
  next();
});

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Multer 配置（图片上传）
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ASSETS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    const name = `upload-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    cb(null, name);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('仅支持图片文件'));
    }
    cb(null, true);
  },
});

// ============================================
// API 路由
// ============================================

// --- 认证 ---
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: '请输入密码' });
    }
    if (!PASSWORD_HASH) {
      return res.status(500).json({ error: '服务器未配置管理员密码' });
    }
    const valid = await bcrypt.compare(password, PASSWORD_HASH);
    if (!valid) {
      return res.status(401).json({ error: '密码错误' });
    }
    const token = await signToken();
    res.cookie('admin_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.json({ token });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ loggedIn: true, role: 'admin' });
});

// --- 文章管理 ---

app.get('/api/posts', authMiddleware, (req, res) => {
  try {
    const files = fs.readdirSync(POSTS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => {
        const filePath = path.join(POSTS_DIR, f);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const { frontMatter } = parseFrontMatter(raw);
        const stat = fs.statSync(filePath);
        return {
          filename: f,
          title: frontMatter.title || f,
          date: frontMatter.date ? new Date(frontMatter.date).toISOString() : stat.mtime.toISOString(),
          categories: frontMatter.categories || [],
          tags: frontMatter.tags || [],
          index_img: frontMatter.index_img || null,
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(files);
  } catch (err) {
    console.error('[posts list]', err);
    res.status(500).json({ error: '读取文章列表失败' });
  }
});

app.get('/api/posts/:filename', authMiddleware, (req, res) => {
  try {
    const filePath = safePath(POSTS_DIR, decodeURIComponent(req.params.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文章不存在' });
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const { frontMatter, body, yaml: yamlStr } = parseFrontMatter(raw);
    res.json({
      filename: path.basename(filePath),
      frontMatter,
      yaml: yamlStr,
      body,
      raw,
    });
  } catch (err) {
    if (err.message === '路径越权') return res.status(403).json({ error: '禁止访问' });
    console.error('[posts get]', err);
    res.status(500).json({ error: '读取文章失败' });
  }
});

app.post('/api/posts/:filename', authMiddleware, (req, res) => {
  try {
    const filename = decodeURIComponent(req.params.filename);
    const filePath = safePath(POSTS_DIR, filename);
    const { frontMatter, body } = req.body;

    if (!body && !frontMatter) {
      return res.status(400).json({ error: '缺少文章内容' });
    }

    let finalFm = frontMatter || {};
    if (fs.existsSync(filePath)) {
      const existing = parseFrontMatter(fs.readFileSync(filePath, 'utf-8'));
      finalFm = { ...existing.frontMatter, ...frontMatter };
    }

    // 移除值为 null 或空字符串的字段，允许前端显式清空字段（如 index_img）
    for (const key of Object.keys(finalFm)) {
      if (finalFm[key] === null || finalFm[key] === '') {
        delete finalFm[key];
      }
    }

    const content = serializeFrontMatter(finalFm, body);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`[posts] 已保存: ${filename}`);
    triggerBuild();
    res.json({ success: true, filename: path.basename(filePath) });
  } catch (err) {
    if (err.message === '路径越权') return res.status(403).json({ error: '禁止访问' });
    console.error('[posts save]', err);
    res.status(500).json({ error: '保存文章失败' });
  }
});

app.delete('/api/posts/:filename', authMiddleware, (req, res) => {
  try {
    const filePath = safePath(POSTS_DIR, decodeURIComponent(req.params.filename));
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: '文章不存在' });
    }
    fs.unlinkSync(filePath);
    console.log(`[posts] 已删除: ${req.params.filename}`);
    triggerBuild();
    res.json({ success: true });
  } catch (err) {
    if (err.message === '路径越权') return res.status(403).json({ error: '禁止访问' });
    console.error('[posts delete]', err);
    res.status(500).json({ error: '删除文章失败' });
  }
});

// --- 页面管理（关于页） ---

app.get('/api/pages/about', authMiddleware, (req, res) => {
  try {
    if (!fs.existsSync(ABOUT_FILE)) {
      return res.status(404).json({ error: '关于页面不存在' });
    }
    const raw = fs.readFileSync(ABOUT_FILE, 'utf-8');
    const { frontMatter, body, yaml: yamlStr } = parseFrontMatter(raw);
    res.json({ frontMatter, yaml: yamlStr, body, raw });
  } catch (err) {
    console.error('[about get]', err);
    res.status(500).json({ error: '读取关于页面失败' });
  }
});

app.post('/api/pages/about', authMiddleware, (req, res) => {
  try {
    const { frontMatter, body } = req.body;
    if (typeof body !== 'string') {
      return res.status(400).json({ error: '缺少页面内容' });
    }
    let finalFm = frontMatter || {};
    if (fs.existsSync(ABOUT_FILE)) {
      const existing = parseFrontMatter(fs.readFileSync(ABOUT_FILE, 'utf-8'));
      finalFm = { ...existing.frontMatter, ...frontMatter };
    }
    const content = serializeFrontMatter(finalFm, body);
    fs.writeFileSync(ABOUT_FILE, content, 'utf-8');
    console.log('[about] 已保存');
    triggerBuild();
    res.json({ success: true });
  } catch (err) {
    console.error('[about save]', err);
    res.status(500).json({ error: '保存关于页面失败' });
  }
});

// --- 分类页面管理 ---

app.get('/api/pages/categories', authMiddleware, (req, res) => {
  try {
    if (!fs.existsSync(CATEGORIES_FILE)) {
      return res.status(404).json({ error: '分类页面不存在' });
    }
    const raw = fs.readFileSync(CATEGORIES_FILE, 'utf-8');
    const { frontMatter, body, yaml: yamlStr } = parseFrontMatter(raw);
    res.json({ frontMatter, yaml: yamlStr, body, raw });
  } catch (err) {
    console.error('[categories get]', err);
    res.status(500).json({ error: '读取分类页面失败' });
  }
});

app.post('/api/pages/categories', authMiddleware, (req, res) => {
  try {
    const { frontMatter, body } = req.body;
    if (typeof body !== 'string') {
      return res.status(400).json({ error: '缺少页面内容' });
    }
    let finalFm = frontMatter || {};
    if (fs.existsSync(CATEGORIES_FILE)) {
      const existing = parseFrontMatter(fs.readFileSync(CATEGORIES_FILE, 'utf-8'));
      finalFm = { ...existing.frontMatter, ...frontMatter };
    }
    const content = serializeFrontMatter(finalFm, body);
    fs.writeFileSync(CATEGORIES_FILE, content, 'utf-8');
    console.log('[categories] 已保存');
    triggerBuild();
    res.json({ success: true });
  } catch (err) {
    console.error('[categories save]', err);
    res.status(500).json({ error: '保存分类页面失败' });
  }
});

// --- 友链页面管理 ---

app.get('/api/pages/links', authMiddleware, (req, res) => {
  try {
    if (!fs.existsSync(LINKS_FILE)) {
      return res.status(404).json({ error: '友链页面不存在' });
    }
    const raw = fs.readFileSync(LINKS_FILE, 'utf-8');
    const { frontMatter, body, yaml: yamlStr } = parseFrontMatter(raw);
    res.json({ frontMatter, yaml: yamlStr, body, raw });
  } catch (err) {
    console.error('[links get]', err);
    res.status(500).json({ error: '读取友链页面失败' });
  }
});

app.post('/api/pages/links', authMiddleware, (req, res) => {
  try {
    const { frontMatter, body } = req.body;
    if (typeof body !== 'string') {
      return res.status(400).json({ error: '缺少页面内容' });
    }
    let finalFm = frontMatter || {};
    if (fs.existsSync(LINKS_FILE)) {
      const existing = parseFrontMatter(fs.readFileSync(LINKS_FILE, 'utf-8'));
      finalFm = { ...existing.frontMatter, ...frontMatter };
    }
    const content = serializeFrontMatter(finalFm, body);
    fs.writeFileSync(LINKS_FILE, content, 'utf-8');
    console.log('[links] 已保存');
    triggerBuild();
    res.json({ success: true });
  } catch (err) {
    console.error('[links save]', err);
    res.status(500).json({ error: '保存友链页面失败' });
  }
});

// --- 友链配置管理（_config.fluid.yml 中 links.items） ---

app.get('/api/config/links', authMiddleware, (req, res) => {
  try {
    const config = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const items = (config.links && config.links.items) ? config.links.items : [];
    res.json(items);
  } catch (err) {
    console.error('[links config get]', err);
    res.status(500).json({ error: '读取友链配置失败' });
  }
});

app.post('/api/config/links', authMiddleware, (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items 必须是数组' });
    }

    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config = yaml.load(raw);
    if (!config.links) config.links = {};
    config.links.items = items;

    const newYaml = yaml.dump(config, { lineWidth: -1, quotingType: '"' });
    fs.writeFileSync(CONFIG_FILE, newYaml, 'utf-8');
    console.log('[links config] 已保存 ' + items.length + ' 个友链');
    triggerBuild();
    res.json({ success: true, items });
  } catch (err) {
    console.error('[links config save]', err);
    res.status(500).json({ error: '保存友链配置失败' });
  }
});

// --- 背景图配置 ---

app.get('/api/config/banner', authMiddleware, (req, res) => {
  try {
    const config = yaml.load(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    const banners = {};
    if (config.index) banners.index = config.index.banner_img || '';
    if (config.post) banners.post = config.post.banner_img || '';
    if (config.about) banners.about = config.about.banner_img || '';
    if (config.category) banners.category = config.category.banner_img || '';
    if (config.tag) banners.tag = config.tag.banner_img || '';
    if (config.archive) banners.archive = config.archive.banner_img || '';
    if (config.page) banners.page = config.page.banner_img || '';
    if (config.links) banners.links = config.links.banner_img || '';
    res.json(banners);
  } catch (err) {
    console.error('[banner get]', err);
    res.status(500).json({ error: '读取背景图配置失败' });
  }
});

app.post('/api/config/banner', authMiddleware, (req, res) => {
  try {
    const { page, url } = req.body;
    if (!page || !url) {
      return res.status(400).json({ error: '缺少 page 或 url 参数' });
    }

    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const config = yaml.load(raw);

    if (config[page]) {
      config[page].banner_img = url;
    } else {
      config[page] = { banner_img: url };
    }

    const lines = raw.split('\n');
    let found = false;
    const key = `${page}:`;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim() === key) {
        for (let j = i + 1; j < lines.length; j++) {
          const trimmed = lines[j].trim();
          if (trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('-') &&
              trimmed.match(/^[a-z_]+\s*:/) && !trimmed.startsWith('banner_img')) {
            break;
          }
          if (trimmed.startsWith('banner_img:')) {
            lines[j] = lines[j].replace(/banner_img:\s*.*/, `banner_img: ${url}`);
            found = true;
            break;
          }
        }
        break;
      }
    }

    if (!found) {
      const newYaml = yaml.dump(config, { lineWidth: -1, quotingType: '"' });
      fs.writeFileSync(CONFIG_FILE, newYaml, 'utf-8');
    } else {
      fs.writeFileSync(CONFIG_FILE, lines.join('\n'), 'utf-8');
    }

    console.log(`[banner] 已更新 ${page}.banner_img = ${url}`);
    triggerBuild();
    res.json({ success: true, page, url });
  } catch (err) {
    console.error('[banner save]', err);
    res.status(500).json({ error: '更新背景图配置失败' });
  }
});

// --- 图片上传 ---

app.post('/api/upload', authMiddleware, (req, res) => {
  upload.single('image')(req, res, err => {
    if (err) {
      const msg = err.code === 'LIMIT_FILE_SIZE' ? '文件过大，最大 5MB' :
                  err.message || '上传失败';
      return res.status(400).json({ error: msg });
    }
    if (!req.file) {
      return res.status(400).json({ error: '请选择文件' });
    }
    const url = `/assets/${req.file.filename}`;
    console.log(`[upload] ${url}`);
    triggerBuild();
    res.json({ success: true, url, filename: req.file.filename });
  });
});

// --- 健康检查 ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ============================================
// 静态文件托管
// ============================================
if (fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));
}

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API 不存在' });
  }
  res.status(404).send('<h1>404 - Page Not Found</h1>');
});

// ============================================
// 启动
// ============================================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Blog Admin Server`);
  console.log(`  API:    http://localhost:${PORT}/api`);
  console.log(`  Static: http://localhost:${PORT}/\n`);

  if (!PASSWORD_HASH) {
    console.warn('  [!] 警告: 未设置 ADMIN_PASSWORD_HASH 环境变量！');
    console.warn('  [!] 运行 "npm run init-password" 初始化密码\n');
  }
});