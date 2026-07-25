/**
 * v2.1 首页 Bento 区域注入脚本
 *
 * 方案 B：Banner 首屏（100vh）+ Bento 首页区域（100vh）+ 完整文章列表
 *
 * Bento 区域包含 6 个格子：
 * - 精选文章：管理员手动置顶（sticky > 0）的第一篇，未设置置顶则 fallback 最新一篇
 * - 关于我：头像、昵称、简介、社交链接
 * - 最新文章 5 篇：按日期倒序，可包含精选文章
 * - 热门标签：按标签下文章数量倒序
 * - 友链：取 _config.fluid.yml 中 links.items 前 6 个
 * - RSS 订阅入口
 *
 * 仅在首页第一页（index.html）注入；分页页面不注入。
 */
hexo.extend.filter.register('after_render:html', function (html, data) {
  if (!data.path || data.path !== 'index.html') return html;

  var theme = hexo.theme.config;
  var config = hexo.config;
  var urlFor = hexo.extend.helper.get('url_for').bind(hexo);

  // 首页 html 增加标识类，供 CSS 针对性设置首页布局（如文章列表与 Bento 对齐）
  html = html.replace(/<html /, '<html class="jio-home-page" ');

  var bentoHtml = buildBento();

  // 将 Bento 区域注入到 <main> 起始标签之后（位于 #board 文章列表之前）
  html = html.replace(/<main>\s*<div class="container nopadding-x-md">/,
    '<main>\n' + bentoHtml + '\n      <div class="container nopadding-x-md">');

  // 给文章列表区域添加「全部文章」标题
  var sectionHeader = '<div class="jio-section-header"><i class="iconfont icon-articles"></i><span>全部文章</span></div>';
  html = html.replace(
    /<h1 style="display: none">/,
    sectionHeader + '\n                <h1 style="display: none">'
  );

  return html;

  // ============================================
  // 构建 Bento 区域 HTML
  // ============================================
  function buildBento() {
    return '<section class="jio-bento-wrap" id="jio-bento">' +
      '<div class="jio-bento">' +
      buildFeatured() +
      buildAbout() +
      buildLatest() +
      buildTags() +
      buildLinks() +
      buildRss() +
      '</div>' +
      '</section>';
  }

  // --- 精选文章 ---
  function buildFeatured() {
    var posts = (hexo.model('Post').sort('-date').data || [])
      .filter(function (p) { return p.layout === 'post' || !p.layout; });

    // 管理员手动置顶：兼容 sticky 与 top 两种标记，数值越大优先级越高
    function getTopValue(p) {
      if (typeof p.sticky === 'number' && p.sticky > 0) return p.sticky;
      if (p.sticky === true) return 1;
      if (typeof p.top === 'number' && p.top > 0) return p.top;
      if (p.top === true) return 1;
      return 0;
    }

    var stickyPosts = posts.filter(function (p) { return getTopValue(p) > 0; })
      .sort(function (a, b) { return getTopValue(b) - getTopValue(a); });
    var featured = stickyPosts.length > 0 ? stickyPosts[0] : posts[0];

    if (!featured) return '<div class="jio-bento-cell jio-bento-featured"><div class="jio-bento-empty">暂无文章</div></div>';

    var postUrl = urlFor(featured.path);
    var cover = featured.index_img || (theme.post && theme.post.default_index_img) || '';
    var coverUrl = cover ? urlFor(cover) : '';
    var title = escHtml(featured.title);
    var category = (featured.categories && featured.categories.length > 0)
      ? featured.categories.data[0].name : '';
    var dateStr = featured.date ? featured.date.format('YYYY-MM-DD') : '';

    // 摘要：优先 description/excerpt，其次正文去标签截取
    var rawText = '';
    if (featured.description) {
      rawText = featured.description;
    } else if (featured.excerpt) {
      rawText = featured.excerpt;
    } else if (featured.content) {
      rawText = featured.content;
    }
    var excerpt = escHtml(stripTags(rawText).replace(/\s+/g, ' ').trim().substring(0, 120));

    // 阅读时长估算：中文按 400 字/分钟
    var wordCount = stripTags(featured.content || '').length;
    var minutes = Math.max(1, Math.round(wordCount / 400));

    var coverStyle = coverUrl
      ? ' style="background-image: url(\'' + coverUrl + '\');"'
      : '';

    return '<div class="jio-bento-cell jio-bento-featured">' +
      '<a href="' + postUrl + '" class="jio-featured-cover"' + coverStyle + '>' +
      '<span class="jio-featured-badge">置顶</span>' +
      '</a>' +
      '<div class="jio-featured-body">' +
      '<h2 class="jio-featured-title"><a href="' + postUrl + '">' + title + '</a></h2>' +
      '<p class="jio-featured-excerpt">' + excerpt + '</p>' +
      '<div class="jio-featured-meta">' +
      (category ? '<span class="jio-featured-cat">' + escHtml(category) + '</span>' : '') +
      (dateStr ? '<span class="jio-featured-date">' + dateStr + '</span>' : '') +
      '<span class="jio-featured-readtime">约 ' + minutes + ' 分钟</span>' +
      '</div>' +
      '</div>' +
      '</div>';
  }

  // --- 关于我 ---
  function buildAbout() {
    var about = theme.about || {};
    var avatar = about.avatar ? urlFor(about.avatar) : '';
    var name = about.name || config.author || '';
    var intro = about.intro || config.subtitle || '';
    var icons = Array.isArray(about.icons) ? about.icons : [];

    var socials = '';
    if (icons.length > 0) {
      socials = '<div class="jio-bento-about-socials">';
      icons.forEach(function (icon) {
        socials += '<a href="' + escAttr(icon.link || '#') + '" class="' + escAttr(icon['class'] || '') + '"' +
          (icon.tip ? ' title="' + escAttr(icon.tip) + '"' : '') +
          ' target="_blank" rel="noopener"></a>';
      });
      socials += '</div>';
    }

    return '<div class="jio-bento-cell jio-bento-about">' +
      '<h3 class="jio-bento-cell-title"><i class="iconfont icon-user-fill"></i>关于我</h3>' +
      (avatar ? '<img class="jio-bento-about-avatar" src="' + avatar + '" alt="' + escHtml(name) + '">' : '') +
      '<div class="jio-bento-about-name">' + escHtml(name) + '</div>' +
      '<p class="jio-bento-about-intro">' + escHtml(intro) + '</p>' +
      socials +
      '<a class="jio-bento-about-more" href="' + urlFor('/about/') + '">了解更多 →</a>' +
      '</div>';
  }

  // --- 最新文章 5 篇 ---
  function buildLatest() {
    var posts = (hexo.model('Post').sort('-date').data || [])
      .filter(function (p) { return p.layout === 'post' || !p.layout; })
      .slice(0, 5);

    var items = '';
    posts.forEach(function (post) {
      var dateStr = post.date ? post.date.format('MM-DD') : '';
      items += '<li class="jio-bento-latest-item">' +
        '<a href="' + urlFor(post.path) + '" title="' + escAttr(post.title) + '">' +
        '<span class="jio-bento-latest-title">' + escHtml(post.title) + '</span>' +
        '<span class="jio-bento-latest-date">' + dateStr + '</span>' +
        '</a>' +
        '</li>';
    });

    return '<div class="jio-bento-cell jio-bento-latest">' +
      '<h3 class="jio-bento-cell-title"><i class="iconfont icon-articles"></i>最新文章</h3>' +
      '<ul class="jio-bento-latest-list">' + items + '</ul>' +
      '<a class="jio-bento-cell-more" href="#board">全部文章 ↓</a>' +
      '</div>';
  }

  // --- 热门标签（按文章数量倒序，取前 10） ---
  function buildTags() {
    var tags = (hexo.model('Tag').sort('name').data || [])
      .filter(function (t) { return t.posts.length > 0; })
      .sort(function (a, b) { return b.posts.length - a.posts.length; })
      .slice(0, 10);

    var items = '';
    tags.forEach(function (tag) {
      items += '<a class="jio-bento-tag-item" href="' + urlFor(tag.path) + '">' +
        escHtml(tag.name) +
        '<span class="jio-bento-tag-count">' + tag.posts.length + '</span>' +
        '</a>';
    });

    return '<div class="jio-bento-cell jio-bento-tags">' +
      '<h3 class="jio-bento-cell-title"><i class="iconfont icon-tags-fill"></i>热门标签</h3>' +
      '<div class="jio-bento-tag-cloud">' + items + '</div>' +
      '</div>';
  }

  // --- 友链（前 6 个） ---
  function buildLinks() {
    var linksCfg = (theme.links && Array.isArray(theme.links.items)) ? theme.links.items : [];
    var items = '';
    linksCfg.slice(0, 6).forEach(function (item) {
      items += '<a class="jio-bento-link-item" href="' + escAttr(item.link || '#') + '" target="_blank" rel="noopener">' +
        '<span class="jio-bento-link-title">' + escHtml(item.title || '') + '</span>' +
        (item.intro ? '<span class="jio-bento-link-intro">' + escHtml(item.intro) + '</span>' : '') +
        '</a>';
    });

    return '<div class="jio-bento-cell jio-bento-links">' +
      '<h3 class="jio-bento-cell-title"><i class="iconfont icon-link-fill"></i>友链</h3>' +
      '<div class="jio-bento-link-list">' + items + '</div>' +
      '<a class="jio-bento-cell-more" href="' + urlFor('/links/') + '">全部友链 →</a>' +
      '</div>';
  }

  // --- RSS 订阅 ---
  function buildRss() {
    return '<a class="jio-bento-cell jio-bento-rss" href="' + urlFor('/atom.xml') + '" target="_blank" rel="noopener">' +
      '<div class="jio-bento-rss-inner">' +
      '<span class="jio-bento-rss-icon">📡</span>' +
      '<span class="jio-bento-rss-title">RSS 订阅</span>' +
      '<span class="jio-bento-rss-desc">订阅博客，第一时间获取更新</span>' +
      '</div>' +
      '</a>';
  }

  // ============================================
  // 工具函数
  // ============================================
  function stripTags(str) {
    return String(str || '').replace(/<[^>]*>/g, '');
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function escAttr(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
});
