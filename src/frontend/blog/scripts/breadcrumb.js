/**
 * v2.1 文章页面包屑导航注入脚本
 *
 * 在文章页正文前注入面包屑：首页 › 分类 › 文章标题
 * 通过匹配文章页 URL（/yyyy/mm/dd/slug/index.html）识别文章页，
 * 从 Post 数据模型中读取文章分类与标题。
 */
hexo.extend.filter.register('after_render:html', function (html, data) {
  if (!data.path) return html;

  // 匹配文章页路径：2026/05/24/slug/index.html
  var match = data.path.match(/^(\d{4}\/\d{2}\/\d{2}\/.+\/)index\.html$/);
  if (!match) return html;

  var postPath = match[1];
  // warehouse 的 findOne 对带斜杠的 path 值查询不可靠，改用 filter
  var matched = hexo.model('Post').filter(function (p) { return p.path === postPath; }).data;
  if (!matched || matched.length === 0) return html;
  var post = matched[0];

  var urlFor = hexo.extend.helper.get('url_for').bind(hexo);

  // 取第一个分类作为面包屑分类节点
  var category = null;
  if (post.categories && post.categories.length > 0) {
    category = post.categories.data[0];
  }

  var breadcrumb = '<nav class="jio-breadcrumb" aria-label="breadcrumb">' +
    '<a class="jio-breadcrumb-link" href="/">' +
    '<i class="iconfont icon-home-fill"></i>首页</a>' +
    '<span class="jio-breadcrumb-sep">›</span>';

  if (category) {
    breadcrumb += '<a class="jio-breadcrumb-link" href="' + urlFor(category.path) + '">' +
      escHtml(category.name) + '</a>' +
      '<span class="jio-breadcrumb-sep">›</span>';
  }

  breadcrumb += '<span class="jio-breadcrumb-current">' + escHtml(post.title) + '</span>' +
    '</nav>';

  // 注入到文章内容容器之前
  var anchor = '<article class="post-content mx-auto">';
  if (html.indexOf(anchor) === -1) return html;
  html = html.replace(anchor, breadcrumb + anchor);

  return html;

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
});
