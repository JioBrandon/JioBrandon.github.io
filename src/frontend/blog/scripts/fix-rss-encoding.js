/**
 * 修复 RSS 订阅的两个问题：
 *
 * 1. XML 声明：hexo-generator-feed + feedsmith 生成 utf-8（小写），替换为标准 UTF-8
 * 2. HTTP Content-Type：浏览器对 application/atom+xml 等 *+xml 类型当纯文本处理，
 *    不读取 XML 内部的 encoding 声明，必须通过 HTTP 响应头传递 charset=utf-8
 *
 * 参考：
 * - https://sumver.cn/archives/1934/
 * - https://github.com/hexojs/hexo-generator-feed/issues/39
 */
'use strict';

// 修复 #1：after_generate 阶段改 route 中的 XML 编码声明
hexo.extend.filter.register('after_generate', function () {
  var files = ['atom.xml', 'rss2.xml'];

  files.forEach(function (filename) {
    var entry = hexo.route.get(filename);
    if (!entry) return;

    // route.get() 返回 Readable Stream，内部数据在 _data 中
    var content = entry._data;
    if (!content) return;

    if (Buffer.isBuffer(content)) {
      content = content.toString('utf8');
    }

    if (typeof content !== 'string') return;

    var fixed = content.replace(
      '<?xml version="1.0" encoding="utf-8"?>',
      '<?xml version="1.0" encoding="UTF-8"?>'
    );

    if (fixed !== content) {
      hexo.route.set(filename, fixed);
      hexo.log.info('[RSS Encoding] Route fixed: ' + filename);
    }
  });
});

// 修复 #2：抢先设置 Content-Type charset，route 中间件检测到已有 header 就不会覆盖
hexo.extend.filter.register('server_middleware', function (app) {
  function xmlCharset(req, res, next) {
    if (/\.xml(\?|$)/.test(req.url)) {
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    }
    next();
  }

  // 插入到栈最前面，确保在 route 中间件之前执行
  app.stack.unshift({ route: '', handle: xmlCharset });
});
