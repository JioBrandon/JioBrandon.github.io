/**
 * 管理员密码初始化工具
 * 运行: npm run init-password
 * 自动将 bcrypt 哈希写入 .env 文件
 */

'use strict';

const path = require('path');
const fs = require('fs');

// 将博客的 node_modules 加入模块搜索路径
const BLOG_DIR = path.resolve(__dirname, '..', '..', 'frontend', 'blog');
const blogNodeModules = path.join(BLOG_DIR, 'node_modules');
module.paths.unshift(blogNodeModules);

const bcrypt = require('bcryptjs');
const readline = require('readline');

// .env 文件路径（blog 根目录）
const ENV_FILE = path.resolve(__dirname, '..', '..', 'frontend', 'blog', '.env');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

console.log('\n  Blog Admin - 密码初始化\n');

function askPassword() {
  return new Promise(resolve => {
    rl.question('  请输入管理员密码: ', resolve);
  });
}

function askConfirm() {
  return new Promise(resolve => {
    rl.question('  请再次输入确认: ', resolve);
  });
}

(async () => {
  const password = await askPassword();
  if (!password || password.length < 4) {
    console.log('\n  [!] 密码长度至少 4 位\n');
    rl.close();
    process.exit(1);
  }

  const confirm = await askConfirm();
  if (password !== confirm) {
    console.log('\n  [!] 两次输入的密码不一致\n');
    rl.close();
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);

  // 读取或创建 .env 文件
  let envContent = '';
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  }

  // 替换或追加 ADMIN_PASSWORD_HASH
  if (envContent.match(/^ADMIN_PASSWORD_HASH=/m)) {
    envContent = envContent.replace(/^ADMIN_PASSWORD_HASH=.*$/m, `ADMIN_PASSWORD_HASH=${hash}`);
  } else {
    if (envContent && !envContent.endsWith('\n')) {
      envContent += '\n';
    }
    envContent += `ADMIN_PASSWORD_HASH=${hash}\n`;
  }

  fs.writeFileSync(ENV_FILE, envContent, 'utf-8');

  console.log('\n  [ok] 密码已更新！\n');
  if (!process.env.ADMIN_PORT) {
    console.log('  如果 .env 文件不存在以下变量，请补充：');
    console.log('    ADMIN_PORT=3000');
    console.log('    JWT_SECRET=your-secret-key\n');
  }
  rl.close();
})();