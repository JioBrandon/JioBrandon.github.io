/**
 * 友链页面内容注入
 * Fluid 主题的 _links generator 会用 theme data 覆盖 source/links/index.md 的页面对象，
 * 导致 links.ejs 布局渲染时 page.content 为空。
 * 此脚本从 Post 模型中取出原始页面的渲染内容，在 after_render:html 阶段注入到 HTML 中。
 */
hexo.extend.filter.register('after_render:html', function (html, data) {
  // 仅处理友链页面
  if (!data.path || !/^links\/index\.html$/.test(data.path)) {
    return html;
  }

  // Fluid 的 generator 覆盖了 locals.pages 中的页面对象，
  // 需要从 Page 模型中按 source 字段找到原始页面
  var Page = hexo.model('Page');
  var sourcePage = Page.findOne({ source: 'links/index.md' });
  if (!sourcePage || !sourcePage.content || !sourcePage.content.trim()) {
    return html;
  }

  var pageContentHtml = '<article class="page-content">' + sourcePage.content + '</article>';

  // 在友链卡片列表前插入页面正文
  html = html.replace('<div class="row links">', pageContentHtml + '\n<div class="row links">');

  return html;
});
