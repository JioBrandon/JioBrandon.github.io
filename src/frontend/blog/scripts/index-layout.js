/**
 * 首页双栏布局注入脚本（已禁用）
 *
 * v2.1 首页已改用 Bento 网格（index-bento.js），Bento 内部已包含
 * 关于我、热门标签、友链、最新文章等模块，因此旧版右侧边栏不再注入。
 *
 * 本文件保留为空壳，仅作为历史记录；如需恢复旧版双栏，可还原此前的实现。
 */
hexo.extend.filter.register('after_render:html', function (html, data) {
  // 不再修改首页 HTML，直接返回原内容
  return html;
});
