/**
 * 关于页 Steam/Bangumi 内容注入脚本
 * 读取插件缓存数据，在 about/index.html 对应卡片内注入紧凑展示内容
 */
var fs = require('fs');
var path = require('path');

hexo.extend.filter.register('after_render:html', function (html, data) {
  if (!data.path || data.path !== 'about/index.html') return html;

  // --- Steam 游戏库 ---
  var steamPlaceholder = '<p style="text-align:center; color: #718096; padding: 20px 0;">\n      前往 <a href="/steamgames/" target="_blank">Steam 游戏库</a> 查看我的游戏收藏\n    </p>';
  var steamData = loadSteamData();
  if (steamData.length > 0) {
    var steamHtml = buildSteamContent(steamData);
    html = html.replace(steamPlaceholder, steamHtml);
  }

  // --- 追番列表 ---
  var bangumiPlaceholder = '<p style="text-align:center; color: #718096; padding: 20px 0;">\n      前往 <a href="/bangumi.html" target="_blank">番剧清单</a> 查看我的追番列表\n    </p>';
  var bangumiData = loadBangumiData();
  if (bangumiData.length > 0) {
    var bangumiHtml = buildBangumiContent(bangumiData);
    html = html.replace(bangumiPlaceholder, bangumiHtml);
  }

  return html;
});

/**
 * 加载 Steam 缓存数据
 */
function loadSteamData() {
  var steamId = hexo.config.steam && hexo.config.steam.steamId;
  if (!steamId) return [];
  var filePath = path.join(hexo.source_dir, '_data', steamId + '.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    var games = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // 按游玩时间降序排列
    games.sort(function (a, b) { return b.playtime_forever - a.playtime_forever; });
    return games;
  } catch (e) {
    return [];
  }
}

/**
 * 加载 Bangumi 缓存数据
 */
function loadBangumiData() {
  var filePath = path.join(hexo.source_dir, '_data', 'bangumi-gallery', 'bangumi.json');
  if (!fs.existsSync(filePath)) return [];
  try {
    var raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    var list = raw.completed || [];
    // 按评分降序
    list.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    return list;
  } catch (e) {
    return [];
  }
}

/**
 * 构建 Steam 展示 HTML
 * 紧凑行列表：缩略图 + 游戏名 + 游玩时长，容器固定高度可滚动
 */
function buildSteamContent(games) {
  var html = '<div class="jio-steam-list">';
  for (var i = 0; i < games.length; i++) {
    var g = games[i];
    var hours = (g.playtime_forever / 60).toFixed(1);
    var url = 'https://store.steampowered.com/app/' + g.appid + '/';
    var img = 'https://cdn.cloudflare.steamstatic.com/steam/apps/' + g.appid + '/capsule_184x69.jpg';
    html += '<a class="jio-steam-row" href="' + escAttr(url) + '" target="_blank" rel="noopener">';
    html += '<img class="jio-steam-thumb" src="' + escAttr(img) + '" alt="' + escAttr(g.name) + '" loading="lazy" referrerpolicy="no-referrer">';
    html += '<span class="jio-steam-name">' + escHtml(g.name) + '</span>';
    if (g.playtime_forever > 0) {
      html += '<span class="jio-steam-hours">' + hours + ' h</span>';
    }
    html += '</a>';
  }
  html += '</div>';
  return html;
}

/**
 * 构建 Bangumi 展示 HTML
 * 紧凑网格：封面图 + 名称，容器固定高度可滚动
 */
function buildBangumiContent(list) {
  var html = '<div class="jio-bangumi-list">';
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    var img = 'https://lain.bgm.tv/pic/cover/l' + (item.image || '');
    var bgmUrl = 'https://bgm.tv/subject/' + (item.subject_id || '');
    html += '<a class="jio-bangumi-item" href="' + escAttr(bgmUrl) + '" target="_blank" rel="noopener" title="' + escAttr(item.name) + (item.score ? ' ★' + item.score : '') + '">';
    html += '<img class="jio-bangumi-cover" src="' + escAttr(img) + '" alt="' + escAttr(item.name) + '" loading="lazy" referrerpolicy="no-referrer">';
    html += '<span class="jio-bangumi-name">' + escHtml(item.name) + '</span>';
    if (item.score) {
      html += '<span class="jio-bangumi-score">★' + item.score + '</span>';
    }
    html += '</a>';
  }
  html += '</div>';
  return html;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
