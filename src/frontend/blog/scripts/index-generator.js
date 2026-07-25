/**
 * 移除 Fluid 的 sticky 排序（置顶文章仅由 Bento 展示）。
 * 通过临时清零 sticky 值使 Fluid generator 的 sticky sort 变为 no-op。
 *
 * priority=100 确保本 filter 在主题 post-filter.js（默认 priority=10）之后执行，
 * 此时 locals.posts / locals.index_posts 已创建完毕。
 */
'use strict';

hexo.extend.filter.register('before_generate', function () {
  const posts = this.locals.get('posts');
  if (!posts || !posts.data) return;

  posts.data.forEach(function (p) {
    p.__sticky_backup = p.sticky;
    p.sticky = 0;
  });
}, 100);

hexo.extend.filter.register('after_generate', function () {
  const posts = this.locals.get('posts');
  if (!posts || !posts.data) return;

  posts.data.forEach(function (p) {
    if (p.__sticky_backup !== undefined) {
      p.sticky = p.__sticky_backup;
      delete p.__sticky_backup;
    }
  });
}, 100);
