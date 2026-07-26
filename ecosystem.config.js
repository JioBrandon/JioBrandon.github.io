/**
 * PM2 进程管理配置
 *
 * 使用方式：
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *
 * 更多配置项：https://pm2.keymetrics.io/docs/usage/application-declaration/
 */
module.exports = {
  apps: [{
    name: 'blog-admin',
    script: 'src/backend/blog/server.js',
    cwd: '/opt/self_blog',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
    },
    // 日志
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: '/opt/self_blog/logs/error.log',
    out_file: '/opt/self_blog/logs/out.log',
    merge_logs: true,
    // 崩溃自动重启
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    // 内存保护（超过 500MB 自动重启）
    max_memory_restart: '500M',
  }],
};
