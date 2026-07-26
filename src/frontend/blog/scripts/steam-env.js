/**
 * 从环境变量注入 Steam API Key
 * 避免将敏感密钥硬编码在 _config.yml 中
 *
 * 使用方式：
 *   在 .env 文件中设置 STEAM_API_KEY=your_key
 *   或 export STEAM_API_KEY=your_key
 */
'use strict';

// 加载博客根目录下的 .env 文件
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

if (hexo.config.steam && hexo.config.steam.enable) {
  const apiKey = process.env.STEAM_API_KEY;
  if (apiKey) {
    hexo.config.steam.apiKey = apiKey;
    hexo.log.info('[steam-env] Steam API Key 已从环境变量注入');
  } else if (!hexo.config.steam.apiKey || hexo.config.steam.apiKey === 'YOUR_STEAM_API_KEY') {
    hexo.log.warn('[steam-env] 未设置 STEAM_API_KEY 环境变量，Steam 游戏库功能将不可用');
    hexo.log.warn('[steam-env] 请在 .env 文件中添加: STEAM_API_KEY=你的Steam API密钥');
    // 禁用 steam 避免报错
    hexo.config.steam.enable = false;
  }
}
