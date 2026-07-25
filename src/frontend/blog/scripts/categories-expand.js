/**
 * 分类页默认展开第一层
 * PRD 3.3 三.4：分类页默认展开第一层分类，减少一次点击
 */
hexo.extend.filter.register('after_render:html', function (html, data) {
  if (!data.path || data.path !== 'categories/index.html') {
    return html;
  }

  var marker = '<div class="category row nomargin-x">';
  var parts = html.split(marker);

  // parts[0] 是 category-list 开头之前的 HTML
  // 后面每个 part 是一个第一层分类块，可能还跟着其他分类或结尾
  for (var i = 1; i < parts.length; i++) {
    var block = parts[i];

    // 找到这个分类块的结束位置：下一个 <div class="category 或 </div></div>（category-list 结束）
    var endIdx = findBlockEnd(block);
    if (endIdx === -1) continue;

    var categoryHtml = block.substring(0, endIdx);
    var afterHtml = block.substring(endIdx);

    // 只修改当前第一层分类块内的第一个折叠容器和触发按钮
    categoryHtml = categoryHtml.replace(
      /<div class="category-collapse collapse\s/,
      '<div class="category-collapse collapse show '
    );
    categoryHtml = categoryHtml.replace(
      /<a class="category-item collapsed/,
      '<a class="category-item'
    );
    categoryHtml = categoryHtml.replace(
      /aria-expanded="false"/,
      'aria-expanded="true"'
    );

    parts[i] = categoryHtml + afterHtml;
  }

  return parts.join(marker);

  function findBlockEnd(str) {
    // 优先匹配下一个同层分类开始
    var nextCat = str.search(/<div class="category (?:row|sub row) nomargin-x">/);
    if (nextCat !== -1) return nextCat;

    // 否则匹配 category-list 结束：两个连续闭合 div
    var endMatch = str.match(/<\/div>\s*<\/div>\s*$/);
    if (endMatch) {
      return endMatch.index;
    }

    return -1;
  }
});
