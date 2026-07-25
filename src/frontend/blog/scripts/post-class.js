/**
 * 给文章详情页 <html> 添加 jio-post-page 类，
 * 使 CSS 可以用简单类选择器替代 :has()，兼容所有浏览器。
 */
hexo.extend.filter.register('after_render:html', function (html, data) {
  // 通过路径特征匹配文章页：YYYY/MM/DD/slug/ 或包含 _posts 的源路径
  var isPost = data.layout === 'post'
    || (data.path && /^\d{4}\/\d{2}\/\d{2}\//.test(data.path))
    || (data.source && data.source.indexOf('_posts') !== -1);

  if (!isPost) return html;

  html = html.replace(/<html/, '<html class="jio-post-page"');
  return html;
});
