/**
 * 首页双栏布局注入脚本
 * 仅在首页的文章列表区域注入右侧栏，不影响 Banner 和 loading 动画
 */
hexo.extend.filter.register('after_render:html', function (html, data) {
  if (!data.path || data.path !== 'index.html') return html;

  var theme = hexo.theme.config;
  var config = hexo.config;

  // 构建右侧栏 HTML
  var sidebarHtml = buildSidebar(hexo, theme);

  // 替换 col-12 容器为新的双栏结构
  var colOpen = '<div class="col-12 col-md-10 m-auto">';
  var wrapperOpen = '<div class="jio-index-col"><div class="jio-index-layout"><div class="jio-main-column">';
  html = html.replace(colOpen, wrapperOpen);

  // 在文章列表末尾注入 sidebar（放在第1和第2个闭合 div 之间）
  var endPattern = /              <\/div>\n            <\/div>\n          <\/div>/;
  var endReplacement = '              </div>' +
    '<aside class="jio-sidebar">' + sidebarHtml + '</aside>\n' +
    '            </div>\n          </div>';
  html = html.replace(endPattern, endReplacement);

  return html;
});

/**
 * 构建右侧栏 HTML
 */
function buildSidebar(hexo, theme) {
  var html = '';

  // --- 作者卡片 ---
  var avatar = theme.about && theme.about.avatar ? hexo.extend.helper.get('url_for').call(hexo, theme.about.avatar) : '';
  var name = (theme.about && theme.about.name) || hexo.config.author || '';
  var intro = (theme.about && theme.about.intro) || hexo.config.subtitle || '';
  var icons = theme.about && theme.about.icons ? theme.about.icons : [];

  html += '<div class="jio-sidebar-card jio-author-card">';
  if (avatar) {
    html += '<img class="jio-author-avatar" src="' + avatar + '" alt="' + escHtml(name) + '">';
  }
  html += '<h3 class="jio-author-name">' + escHtml(name) + '</h3>';
  html += '<p class="jio-author-intro">' + escHtml(intro) + '</p>';
  if (icons.length > 0) {
    html += '<div class="jio-author-socials">';
    for (var i = 0; i < icons.length; i++) {
      var icon = icons[i];
      html += '<a href="' + escAttr(icon.link || '#') + '" class="' + escAttr(icon['class'] || '') + '"';
      if (icon.tip) html += ' title="' + escAttr(icon.tip) + '"';
      html += ' target="_blank" rel="noopener"></a>';
    }
    html += '</div>';
  }
  html += '</div>';

  // --- 文章分类（可展开，直接链接到文章） ---
  var categories = hexo.model('Category');
  if (categories && categories.length > 0) {
    html += '<div class="jio-sidebar-card jio-categories-card">';
    html += '<h4 class="jio-sidebar-card-title"><i class="iconfont icon-category-fill"></i> 文章分类</h4>';
    html += '<div class="jio-cat-list">';
    var sortedCats = categories.sort('name');
    sortedCats.each(function (cat) {
      if (cat.parent) return;
      var postCount = cat.posts.length;
      html += '<details class="jio-cat-group">';
      html += '<summary class="jio-cat-summary">';
      html += '<span class="jio-cat-name">' + escHtml(cat.name) + '</span>';
      html += '<span class="jio-cat-count">' + postCount + '</span>';
      html += '</summary>';
      html += '<ul class="jio-cat-posts">';
      cat.posts.sort('date', -1).each(function (post) {
        var postUrl = hexo.extend.helper.get('url_for').call(hexo, post.path);
        html += '<li><a href="' + escAttr(postUrl) + '">' + escHtml(post.title) + '</a></li>';
      });
      html += '</ul>';
      html += '</details>';
    });
    html += '</div></div>';
  }

  // --- 文章标签 ---
  var tags = hexo.model('Tag');
  if (tags && tags.length > 0) {
    html += '<div class="jio-sidebar-card jio-tags-card">';
    html += '<h4 class="jio-sidebar-card-title"><i class="iconfont icon-tags-fill"></i> 文章标签</h4>';
    html += '<div class="jio-tag-cloud">';
    var sortedTags = tags.sort('name');
    sortedTags.each(function (tag) {
      if (tag.posts.length === 0) return;
      html += '<a href="' + escAttr(hexo.extend.helper.get('url_for').call(hexo, tag.path)) + '" class="jio-tag-item">' + escHtml(tag.name) + '</a>';
    });
    html += '</div></div>';
  }

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
