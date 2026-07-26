/**
 * 在导航栏暗色模式切换按钮右边添加 Dog 图标，
 * 点击跳转到 Bilibili 大狗巴掌玩具页面。
 */
'use strict';

hexo.extend.filter.register('after_render:html', function (html) {
  var urlFor = hexo.extend.helper.get('url_for').bind(hexo);

  var dogHtml = '<li class="nav-item" id="dog-btn">' +
    '<a class="nav-link" target="_blank" rel="noopener" href="https://www.bilibili.com/toy/Dagou-Tap/index.html" aria-label="Dog">' +
    '<img src="' + urlFor('/assets/Dog.png') + '" alt="Dog" class="nav-dog-icon">' +
    '</a>' +
    '</li>';

  // 优先插入到暗色模式切换按钮后面，否则插在搜索按钮后面
  if (html.indexOf('id="color-toggle-btn"') !== -1) {
    html = html.replace(
      /(<li class="nav-item" id="color-toggle-btn">[\s\S]*?<\/li>)/,
      '$1\n          ' + dogHtml
    );
  } else if (html.indexOf('id="search-btn"') !== -1) {
    html = html.replace(
      /(<li class="nav-item" id="search-btn">[\s\S]*?<\/li>)/,
      '$1\n          ' + dogHtml
    );
  }

  return html;
});
