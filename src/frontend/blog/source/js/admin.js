/**
 * Blog Admin - 前端管理脚本
 * 纯 Vanilla JS，无需额外框架
 *
 * 功能：
 * - 登录/登出（JWT 存储在 localStorage）
 * - 首页 Banner 背景图更换
 * - 文章内容编辑/删除
 * - 关于页面内容编辑
 * - 所有操作通过 API 持久化到文件
 */

(function() {
  'use strict';

  // ============================================
  // 配置
  // ============================================
  var API_BASE = window.__ADMIN_API_BASE__ || 'http://localhost:3000';
  var TOKEN_KEY = 'blog_admin_token';

  // ============================================
  // 状态管理
  // ============================================
  var state = {
    token: localStorage.getItem(TOKEN_KEY) || null,
    loggedIn: false,
    currentPage: null, // 'home' | 'post' | 'about' | 'other'
    postFilename: null,
  };

  // ============================================
  // API 请求封装
  // ============================================
  function api(path, options) {
    options = options || {};
    var headers = options.headers || {};
    if (state.token) {
      headers['Authorization'] = 'Bearer ' + state.token;
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }
    return fetch(API_BASE + path, {
      method: options.method || 'GET',
      headers: headers,
      body: options.body || undefined,
    }).then(function(res) {
      if (res.status === 401) {
        logout(true);
        throw new Error('登录已过期');
      }
      return res.json().then(function(data) {
        if (!res.ok) throw new Error(data.error || '请求失败');
        return data;
      });
    });
  }

  // ============================================
  // Toast 提示
  // ============================================
  function showToast(message, type) {
    type = type || 'info';
    var el = document.getElementById('admin-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'admin-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.className = type;
    // 强制 reflow 后添加 show class
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function() {
      el.classList.remove('show');
    }, 2500);
  }

  // ============================================
  // 检测当前页面类型
  // ============================================
  function detectPageType() {
    // URL 路径检测（最可靠）
    var pathname = window.location.pathname;
    if (pathname === '/' || pathname === '/index.html') {
      return 'home';
    }
    if (pathname.startsWith('/about')) {
      return 'about';
    }
    if (pathname.startsWith('/tags')) {
      return 'tags';
    }
    if (pathname.startsWith('/links')) {
      return 'links';
    }

    // DOM 检测作为备选
    if (document.querySelector('.about-content') || document.querySelector('.about-info')) {
      return 'about';
    }
    if (document.querySelector('.post-content') || document.querySelector('article.post-content')) {
      return 'post';
    }
    if (document.querySelector('.index-page') ||
        document.querySelector('.index-slogan') ||
        (document.querySelector('.header-inner') &&
         document.querySelector('.header-inner').style.height === '100vh')) {
      return 'home';
    }
    if (document.querySelector('.tagcloud') || document.querySelector('.tag-list')) {
      return 'tags';
    }
    if (document.querySelector('.links-content') || document.querySelector('.friend-links')) {
      return 'links';
    }
    return 'other';
  }

  // 获取当前文章文件名
  function getCurrentPostFilename() {
    var pathname = window.location.pathname;
    // Hexo 文章 URL 格式：/year/month/day/title/ 或 /year/month/day/title.html
    // 需要从页面标题推断文件名
    var seoHeader = document.getElementById('seo-header');
    if (seoHeader) {
      var title = seoHeader.textContent.trim();
      // 尝试通过 API 匹配
      return api('/api/posts').then(function(posts) {
        for (var i = 0; i < posts.length; i++) {
          if (posts[i].title === title) {
            return posts[i].filename;
          }
        }
        return null;
      }).catch(function() {
        return null;
      });
    }
    return Promise.resolve(null);
  }

  // ============================================
  // 登录 / 登出
  // ============================================
  function showLoginDialog() {
    removeExistingOverlay();
    var overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML =
      '<div class="admin-login-dialog">' +
        '<h3>管理员登录</h3>' +
        '<p class="admin-login-subtitle">请输入管理员密码以继续</p>' +
        '<input type="password" class="admin-input" id="admin-login-pwd" placeholder="请输入密码" autofocus>' +
        '<p class="admin-error" id="admin-login-error"></p>' +
        '<button class="admin-btn" id="admin-login-btn">登 录</button>' +
      '</div>';
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) removeOverlay(overlay);
    });

    var pwdInput = document.getElementById('admin-login-pwd');
    var errorEl = document.getElementById('admin-login-error');
    var btnEl = document.getElementById('admin-login-btn');

    function doLogin() {
      var password = pwdInput.value.trim();
      if (!password) {
        errorEl.textContent = '请输入密码';
        return;
      }
      btnEl.disabled = true;
      btnEl.textContent = '登录中...';
      errorEl.textContent = '';

      api('/api/auth/login', {
        method: 'POST',
        body: { password: password },
      }).then(function(data) {
        state.token = data.token;
        state.loggedIn = true;
        localStorage.setItem(TOKEN_KEY, data.token);
        removeOverlay(overlay);
        showToast('登录成功', 'success');
        showToolbar();
      }).catch(function(err) {
        errorEl.textContent = err.message;
        btnEl.disabled = false;
        btnEl.textContent = '登 录';
      });
    }

    btnEl.addEventListener('click', doLogin);
    pwdInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') doLogin();
    });
  }

  function logout(silent) {
    state.token = null;
    state.loggedIn = false;
    localStorage.removeItem(TOKEN_KEY);
    hideToolbar();
    removeExistingOverlay();
    if (!silent) {
      showToast('已退出登录', 'success');
    }
  }

  // ============================================
  // 管理工具栏
  // ============================================
  function createToolbar() {
    // 创建工具栏按钮
    var btn = document.getElementById('admin-toolbar-btn');
    if (!btn) {
      btn = document.createElement('button');
      btn.id = 'admin-toolbar-btn';
      btn.title = '管理';
      btn.innerHTML = '&#9881;'; // 齿轮图标
      document.body.appendChild(btn);
    }
    btn.addEventListener('click', togglePanel);

    // 创建管理面板
    var panel = document.getElementById('admin-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'admin-panel';
      panel.innerHTML =
        '<div class="admin-panel-header">' +
          '<span>管理面板</span>' +
          '<button class="admin-logout-btn" id="admin-logout-btn">退出</button>' +
        '</div>' +
        '<div class="admin-panel-body" id="admin-panel-body">' +
        '</div>';
      document.body.appendChild(panel);
    }

    document.getElementById('admin-logout-btn').addEventListener('click', function() {
      logout(false);
    });

    updatePanelItems();
  }

  function updatePanelItems() {
    var body = document.getElementById('admin-panel-body');
    if (!body) return;

    // 每次都重新检测页面类型（避免 state 过期）
    var pageType = detectPageType();
    state.currentPage = pageType;

    var items = '';

    // 新文章
    items += '<button class="admin-panel-item" data-action="new-post">+ 新建文章</button>';
    items += '<div class="admin-panel-divider"></div>';

    // 背景图（所有页面可见）
    items += '<button class="admin-panel-item" data-action="edit-banner">更换背景图</button>';

    // 文章页功能
    if (pageType === 'post') {
      items += '<button class="admin-panel-item" data-action="edit-post">编辑当前文章</button>';
      items += '<button class="admin-panel-item danger" data-action="delete-post">删除当前文章</button>';
    }

    // 关于页功能
    if (pageType === 'about') {
      items += '<button class="admin-panel-item" data-action="edit-about">编辑关于内容</button>';
    }

    // 标签页功能
    if (pageType === 'tags') {
      items += '<button class="admin-panel-item" data-action="edit-tags">编辑标签页内容</button>';
    }

    // 友链页功能
    if (pageType === 'links') {
      items += '<button class="admin-panel-item" data-action="edit-links">编辑友链页内容</button>';
      items += '<button class="admin-panel-item" data-action="edit-links-config">管理友链列表</button>';
    }

    // 首页功能
    if (pageType === 'home') {
      items += '<button class="admin-panel-item" data-action="edit-banner">更换首页背景</button>';
    }

    body.innerHTML = items;

    // 绑定事件
    var itemEls = body.querySelectorAll('.admin-panel-item');
    for (var i = 0; i < itemEls.length; i++) {
      itemEls[i].addEventListener('click', function() {
        var action = this.getAttribute('data-action');
        handleAction(action);
        closePanel();
      });
    }
  }

  function showToolbar() {
    createToolbar();
    var btn = document.getElementById('admin-toolbar-btn');
    if (btn) btn.classList.add('visible');
  }

  function hideToolbar() {
    var btn = document.getElementById('admin-toolbar-btn');
    if (btn) btn.classList.remove('visible');
    var panel = document.getElementById('admin-panel');
    if (panel) panel.classList.remove('open');
  }

  function togglePanel() {
    var panel = document.getElementById('admin-panel');
    if (panel) {
      panel.classList.toggle('open');
      if (panel.classList.contains('open')) {
        updatePanelItems();
      }
    }
  }

  function closePanel() {
    var panel = document.getElementById('admin-panel');
    if (panel) panel.classList.remove('open');
  }

  // ============================================
  // 构建状态指示
  // ============================================
  function showBuildStatus(msg) {
    var el = document.getElementById('admin-build-status');
    if (!el) {
      el = document.createElement('div');
      el.id = 'admin-build-status';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function() {
      el.classList.remove('show');
    }, 3000);
  }

  // ============================================
  // 操作处理
  // ============================================
  function handleAction(action) {
    switch (action) {
      case 'edit-banner':
        openBannerEditor();
        break;
      case 'edit-post':
        openPostEditor();
        break;
      case 'delete-post':
        confirmDeletePost();
        break;
      case 'edit-about':
        openAboutEditor();
        break;
      case 'edit-tags':
        openTagsEditor();
        break;
      case 'edit-links':
        openLinksEditor();
        break;
      case 'edit-links-config':
        openLinksConfigEditor();
        break;
      case 'new-post':
        openNewPostEditor();
        break;
    }
  }

  // ============================================
  // 背景图编辑
  // ============================================
  function openBannerEditor() {
    removeExistingOverlay();

    // 先获取当前背景图配置
    api('/api/config/banner').then(function(banners) {
      var currentUrl = banners.index || '/assets/background.png';
      var overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';

      var dialog = document.createElement('div');
      dialog.className = 'admin-banner-dialog';
      dialog.innerHTML =
        '<h3>更换背景图</h3>' +
        '<div class="admin-banner-preview" id="banner-preview-upload" style="background-image: url(\'' + currentUrl + '\')"></div>' +
        '<p class="admin-banner-current">当前背景: ' + currentUrl + '</p>' +
        '<div class="admin-upload-zone" id="banner-upload-zone">' +
          '<p>点击选择图片 或将图片拖拽到此处</p>' +
          '<p style="font-size: 12px; color: #bbb;">支持 JPG/PNG，最大 5MB</p>' +
          '<input type="file" id="banner-file-input" accept="image/*" style="display:none">' +
        '</div>' +
        '<p style="font-size: 12px; color: #999; margin-top: 6px;">应用于全站所有页面</p>' +
        '<div class="admin-banner-actions">' +
          '<button class="admin-btn admin-btn-cancel" id="banner-cancel">取消</button>' +
        '</div>';
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      var fileInput = document.getElementById('banner-file-input');
      var uploadZone = document.getElementById('banner-upload-zone');
      var preview = document.getElementById('banner-preview-upload');

      // 点击上传区域触发文件选择
      uploadZone.addEventListener('click', function() {
        fileInput.click();
      });

      // 拖拽上传
      uploadZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadZone.classList.add('dragover');
      });
      uploadZone.addEventListener('dragleave', function() {
        uploadZone.classList.remove('dragover');
      });
      uploadZone.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        var file = e.dataTransfer.files[0];
        if (file) uploadBanner(file, overlay, preview, banners);
      });

      // 文件选择
      fileInput.addEventListener('change', function() {
        var file = fileInput.files[0];
        if (file) uploadBanner(file, overlay, preview, banners);
      });

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) removeOverlay(overlay);
      });
      document.getElementById('banner-cancel').addEventListener('click', function() {
        removeOverlay(overlay);
      });
    }).catch(function(err) {
      showToast('获取背景图配置失败: ' + err.message, 'error');
    });
  }

  function uploadBanner(file, overlay, previewEl, banners) {
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('图片大小不能超过 5MB', 'error');
      return;
    }

    // 本地预览
    var reader = new FileReader();
    reader.onload = function(e) {
      previewEl.style.backgroundImage = 'url(\'' + e.target.result + '\')';
    };
    reader.readAsDataURL(file);

    // 上传文件
    var formData = new FormData();
    formData.append('image', file);

    api('/api/upload', {
      method: 'POST',
      body: formData,
    }).then(function(data) {
      showToast('图片上传成功', 'success');
      // 更新所有页面的背景图
      var pages = Object.keys(banners);
      var updated = 0;
      pages.forEach(function(page) {
        api('/api/config/banner', {
          method: 'POST',
          body: { page: page, url: data.url },
        }).then(function() {
          updated++;
          if (updated === pages.length) {
            showBuildStatus('背景图已更新，正在重新构建...');
            removeOverlay(overlay);
          }
        }).catch(function(err) {
          console.error('更新 ' + page + ' 背景图失败:', err);
        });
      });
    }).catch(function(err) {
      showToast('上传失败: ' + err.message, 'error');
    });
  }

  // ============================================
  // 文章编辑
  // ============================================
  function openPostEditor() {
    removeExistingOverlay();
    getCurrentPostFilename().then(function(filename) {
      if (!filename) {
        showToast('无法识别当前文章', 'error');
        return;
      }
      state.postFilename = filename;
      loadAndShowPostEditor(filename, '编辑文章');
    });
  }

  function openNewPostEditor() {
    removeExistingOverlay();
    var now = new Date();
    var dateStr = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');
    var defaultSlug = 'new-post-' + Date.now();
    state.postFilename = defaultSlug + '.md';
    showPostEditor({
      filename: defaultSlug + '.md',
      frontMatter: {
        title: '新文章标题',
        date: dateStr,
        categories: [],
        tags: [],
      },
      yaml: 'title: 新文章标题\ndate: ' + dateStr + '\ncategories: []\ntags: []',
      body: '\n## 开始写作\n\n在这里编写你的文章内容...\n',
      raw: '',
    }, '新建文章');
  }

  function loadAndShowPostEditor(filename, title) {
    api('/api/posts/' + encodeURIComponent(filename)).then(function(data) {
      showPostEditor(data, title);
    }).catch(function(err) {
      showToast('读取文章失败: ' + err.message, 'error');
    });
  }

  function showPostEditor(data, title) {
    var overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';

    var fm = data.frontMatter || {};
    var categories = Array.isArray(fm.categories) ? fm.categories.join(', ') : (fm.categories || '');
    var tags = Array.isArray(fm.tags) ? fm.tags.join(', ') : (fm.tags || '');

    var dialog = document.createElement('div');
    dialog.className = 'admin-editor-dialog';
    dialog.innerHTML =
      '<div class="admin-editor-header">' +
        '<h3>' + title + '</h3>' +
        '<button class="admin-btn-close" id="editor-close">&times;</button>' +
      '</div>' +
      '<div class="admin-fm-section" id="admin-fm-section">' +
        '<div class="admin-fm-row">' +
          '<span class="admin-fm-label">标题</span>' +
          '<input class="admin-fm-input" id="fm-title" value="' + escapeHtml(fm.title || '') + '" placeholder="文章标题">' +
        '</div>' +
        '<div class="admin-fm-row">' +
          '<span class="admin-fm-label">日期</span>' +
          '<input class="admin-fm-input" id="fm-date" value="' + escapeHtml(fm.date ? formatDate(fm.date) : '') + '" placeholder="YYYY-MM-DD HH:mm:ss">' +
        '</div>' +
        '<div class="admin-fm-row">' +
          '<span class="admin-fm-label">分类</span>' +
          '<input class="admin-fm-input" id="fm-categories" value="' + escapeHtml(categories) + '" placeholder="逗号分隔">' +
        '</div>' +
        '<div class="admin-fm-row">' +
          '<span class="admin-fm-label">标签</span>' +
          '<input class="admin-fm-input" id="fm-tags" value="' + escapeHtml(tags) + '" placeholder="逗号分隔">' +
        '</div>' +
        '<div class="admin-fm-row">' +
          '<span class="admin-fm-label">封面</span>' +
          '<input class="admin-fm-input" id="fm-img" value="' + escapeHtml(fm.index_img || '') + '" placeholder="封面图 URL（可选）">' +
        '</div>' +
      '</div>' +
      '<div class="admin-editor-body split">' +
        '<div class="admin-editor-pane">' +
          '<div class="admin-pane-label">Markdown</div>' +
          '<textarea class="admin-editor-textarea" id="editor-textarea" placeholder="Markdown 内容...">' + escapeHtml(data.body || '') + '</textarea>' +
        '</div>' +
        '<div class="admin-editor-pane">' +
          '<div class="admin-pane-label">预览</div>' +
          '<div class="admin-editor-preview markdown-body" id="editor-preview"></div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-editor-footer">' +
        '<button class="admin-btn admin-btn-cancel" id="editor-cancel">取消</button>' +
        '<button class="admin-btn admin-btn-primary" id="editor-save">保存</button>' +
      '</div>';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 绑定事件
    document.getElementById('editor-close').addEventListener('click', function() {
      removeOverlay(overlay);
    });
    document.getElementById('editor-cancel').addEventListener('click', function() {
      removeOverlay(overlay);
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) removeOverlay(overlay);
    });

    var textarea = document.getElementById('editor-textarea');
    var previewEl = document.getElementById('editor-preview');

    // 实时预览（简易 Markdown 渲染）
    function updatePreview() {
      previewEl.innerHTML = simpleMarkdown(textarea.value);
    }
    textarea.addEventListener('input', updatePreview);
    updatePreview();

    // 保存
    document.getElementById('editor-save').addEventListener('click', function() {
      var btn = this;
      btn.disabled = true;
      btn.textContent = '保存中...';

      var newFm = {
        title: document.getElementById('fm-title').value.trim() || 'Untitled',
        date: document.getElementById('fm-date').value.trim() || new Date().toISOString(),
      };

      var catStr = document.getElementById('fm-categories').value.trim();
      if (catStr) newFm.categories = catStr.split(',').map(function(s) { return s.trim(); }).filter(Boolean);

      var tagStr = document.getElementById('fm-tags').value.trim();
      if (tagStr) newFm.tags = tagStr.split(',').map(function(s) { return s.trim(); }).filter(Boolean);

      var imgStr = document.getElementById('fm-img').value.trim();
      if (imgStr) newFm.index_img = imgStr;

      var body = textarea.value;
      var filename = data.filename;

      api('/api/posts/' + encodeURIComponent(filename), {
        method: 'POST',
        body: { frontMatter: newFm, body: body },
      }).then(function() {
        showToast('文章保存成功', 'success');
        showBuildStatus('文章已保存，正在重新构建...');
        removeOverlay(overlay);
      }).catch(function(err) {
        showToast('保存失败: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '保存';
      });
    });

    // 快捷键 Ctrl+S 保存
    var ctrlSHandler = function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('editor-save').click();
      }
    };
    overlay.addEventListener('keydown', ctrlSHandler);
    overlay._ctrlSHandler = ctrlSHandler;
  }

  // ============================================
  // 文章删除
  // ============================================
  function confirmDeletePost() {
    removeExistingOverlay();
    getCurrentPostFilename().then(function(filename) {
      if (!filename) {
        showToast('无法识别当前文章', 'error');
        return;
      }

      var overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML =
        '<div class="admin-confirm-dialog">' +
          '<p>确认删除文章 <strong>' + escapeHtml(filename) + '</strong>？</p>' +
          '<p style="font-size: 13px; color: #999;">此操作不可恢复</p>' +
          '<div class="admin-confirm-actions">' +
            '<button class="admin-btn admin-btn-cancel" id="confirm-cancel">取消</button>' +
            '<button class="admin-btn admin-btn-danger" id="confirm-delete">确认删除</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) removeOverlay(overlay);
      });
      document.getElementById('confirm-cancel').addEventListener('click', function() {
        removeOverlay(overlay);
      });
      document.getElementById('confirm-delete').addEventListener('click', function() {
        var btn = this;
        btn.disabled = true;
        btn.textContent = '删除中...';

        api('/api/posts/' + encodeURIComponent(filename), { method: 'DELETE' })
          .then(function() {
            showToast('文章已删除', 'success');
            showBuildStatus('文章已删除，正在重新构建...');
            removeOverlay(overlay);
            // 延迟跳转到首页
            setTimeout(function() {
              window.location.href = '/';
            }, 1500);
          }).catch(function(err) {
            showToast('删除失败: ' + err.message, 'error');
            btn.disabled = false;
            btn.textContent = '确认删除';
          });
      });
    });
  }

  // ============================================
  // 关于页编辑
  // ============================================
  function openAboutEditor() {
    removeExistingOverlay();

    api('/api/pages/about').then(function(data) {
      var overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';

      var dialog = document.createElement('div');
      dialog.className = 'admin-editor-dialog';
      dialog.innerHTML =
        '<div class="admin-editor-header">' +
          '<h3>编辑关于页面</h3>' +
          '<button class="admin-btn-close" id="editor-close">&times;</button>' +
        '</div>' +
        '<div class="admin-editor-body">' +
          '<div class="admin-editor-pane" style="flex:1">' +
            '<div class="admin-pane-label">Markdown</div>' +
            '<textarea class="admin-editor-textarea" id="editor-textarea">' + escapeHtml(data.body || '') + '</textarea>' +
          '</div>' +
          '<div class="admin-editor-pane" style="flex:1">' +
            '<div class="admin-pane-label">预览</div>' +
            '<div class="admin-editor-preview markdown-body" id="editor-preview"></div>' +
          '</div>' +
        '</div>' +
        '<div class="admin-editor-footer">' +
          '<button class="admin-btn admin-btn-cancel" id="editor-cancel">取消</button>' +
          '<button class="admin-btn admin-btn-primary" id="editor-save">保存</button>' +
        '</div>';
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      document.getElementById('editor-close').addEventListener('click', function() {
        removeOverlay(overlay);
      });
      document.getElementById('editor-cancel').addEventListener('click', function() {
        removeOverlay(overlay);
      });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) removeOverlay(overlay);
      });

      var textarea = document.getElementById('editor-textarea');
      var previewEl = document.getElementById('editor-preview');

      function updatePreview() {
        previewEl.innerHTML = simpleMarkdown(textarea.value);
      }
      textarea.addEventListener('input', updatePreview);
      updatePreview();

      document.getElementById('editor-save').addEventListener('click', function() {
        var btn = this;
        btn.disabled = true;
        btn.textContent = '保存中...';

        api('/api/pages/about', {
          method: 'POST',
          body: {
            frontMatter: data.frontMatter,
            body: textarea.value,
          },
        }).then(function() {
          showToast('关于页面保存成功', 'success');
          showBuildStatus('关于页面已更新，正在重新构建...');
          removeOverlay(overlay);
        }).catch(function(err) {
          showToast('保存失败: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '保存';
        });
      });

      // Ctrl+S 保存
      var ctrlSHandler = function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          document.getElementById('editor-save').click();
        }
      };
      overlay.addEventListener('keydown', ctrlSHandler);
    }).catch(function(err) {
      showToast('读取关于页面失败: ' + err.message, 'error');
    });
  }

  // ============================================
  // 标签页编辑
  // ============================================
  function openTagsEditor() {
    removeExistingOverlay();

    api('/api/pages/tags').then(function(data) {
      showPageEditor(data, '编辑标签页面', 'tags');
    }).catch(function(err) {
      showToast('读取标签页面失败: ' + err.message, 'error');
    });
  }

  // ============================================
  // 友链页编辑
  // ============================================
  function openLinksEditor() {
    removeExistingOverlay();

    api('/api/pages/links').then(function(data) {
      showPageEditor(data, '编辑友链页面', 'links');
    }).catch(function(err) {
      showToast('读取友链页面失败: ' + err.message, 'error');
    });
  }

  // ============================================
  // 通用页面编辑器（标签/友链/关于）
  // ============================================
  function showPageEditor(data, title, pageType) {
    var overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';

    var dialog = document.createElement('div');
    dialog.className = 'admin-editor-dialog';
    dialog.innerHTML =
      '<div class="admin-editor-header">' +
        '<h3>' + title + '</h3>' +
        '<button class="admin-btn-close" id="editor-close">&times;</button>' +
      '</div>' +
      '<div class="admin-editor-body">' +
        '<div class="admin-editor-pane" style="flex:1">' +
          '<div class="admin-pane-label">Markdown</div>' +
          '<textarea class="admin-editor-textarea" id="editor-textarea">' + escapeHtml(data.body || '') + '</textarea>' +
        '</div>' +
        '<div class="admin-editor-pane" style="flex:1">' +
          '<div class="admin-pane-label">预览</div>' +
          '<div class="admin-editor-preview markdown-body" id="editor-preview"></div>' +
        '</div>' +
      '</div>' +
      '<div class="admin-editor-footer">' +
        '<button class="admin-btn admin-btn-cancel" id="editor-cancel">取消</button>' +
        '<button class="admin-btn admin-btn-primary" id="editor-save">保存</button>' +
      '</div>';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    document.getElementById('editor-close').addEventListener('click', function() {
      removeOverlay(overlay);
    });
    document.getElementById('editor-cancel').addEventListener('click', function() {
      removeOverlay(overlay);
    });
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) removeOverlay(overlay);
    });

    var textarea = document.getElementById('editor-textarea');
    var previewEl = document.getElementById('editor-preview');

    function updatePreview() {
      previewEl.innerHTML = simpleMarkdown(textarea.value);
    }
    textarea.addEventListener('input', updatePreview);
    updatePreview();

    var apiPath = '/api/pages/' + pageType;

    document.getElementById('editor-save').addEventListener('click', function() {
      var btn = this;
      btn.disabled = true;
      btn.textContent = '保存中...';

      api(apiPath, {
        method: 'POST',
        body: {
          frontMatter: data.frontMatter,
          body: textarea.value,
        },
      }).then(function() {
        showToast(title + '保存成功', 'success');
        showBuildStatus('页面已更新，正在重新构建...');
        removeOverlay(overlay);
      }).catch(function(err) {
        showToast('保存失败: ' + err.message, 'error');
        btn.disabled = false;
        btn.textContent = '保存';
      });
    });

    // Ctrl+S 保存
    var ctrlSHandler = function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        document.getElementById('editor-save').click();
      }
    };
    overlay.addEventListener('keydown', ctrlSHandler);
  }

  // ============================================
  // 友链列表配置编辑
  // ============================================
  function openLinksConfigEditor() {
    removeExistingOverlay();

    api('/api/config/links').then(function(items) {
      var overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';

      var linksJson = JSON.stringify(items, null, 2);

      var dialog = document.createElement('div');
      dialog.className = 'admin-editor-dialog';
      dialog.innerHTML =
        '<div class="admin-editor-header">' +
          '<h3>管理友链列表</h3>' +
          '<button class="admin-btn-close" id="editor-close">&times;</button>' +
        '</div>' +
        '<div class="admin-editor-body">' +
          '<div class="admin-editor-pane" style="flex:1">' +
            '<div class="admin-pane-label">友链 JSON（编辑后保存）</div>' +
            '<textarea class="admin-editor-textarea" id="editor-textarea" style="font-size:13px">' + escapeHtml(linksJson) + '</textarea>' +
          '</div>' +
          '<div class="admin-editor-pane" style="flex:1">' +
            '<div class="admin-pane-label">预览</div>' +
            '<div class="admin-editor-preview markdown-body" id="editor-preview" style="font-size:13px"></div>' +
          '</div>' +
        '</div>' +
        '<div class="admin-editor-footer">' +
          '<p style="flex:1;font-size:12px;color:#999;margin:0">格式: [{ "title":"...", "intro":"...", "link":"...", "avatar":"..." }]</p>' +
          '<button class="admin-btn admin-btn-cancel" id="editor-cancel">取消</button>' +
          '<button class="admin-btn admin-btn-primary" id="editor-save">保存</button>' +
        '</div>';
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      document.getElementById('editor-close').addEventListener('click', function() {
        removeOverlay(overlay);
      });
      document.getElementById('editor-cancel').addEventListener('click', function() {
        removeOverlay(overlay);
      });
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) removeOverlay(overlay);
      });

      var textarea = document.getElementById('editor-textarea');
      var previewEl = document.getElementById('editor-preview');

      function updatePreview() {
        try {
          var parsed = JSON.parse(textarea.value);
          var html = '<div style="display:flex;flex-direction:column;gap:12px">';
          parsed.forEach(function(item) {
            html += '<div style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #eee;border-radius:8px">';
            html += '<img src="' + escapeHtml(item.avatar || '') + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover" onerror="this.src=\'/img/avatar.png\'">';
            html += '<div><strong>' + escapeHtml(item.title || '') + '</strong>';
            html += '<br><span style="font-size:12px;color:#666">' + escapeHtml(item.intro || '') + '</span>';
            html += '<br><a href="' + escapeHtml(item.link || '') + '" target="_blank" style="font-size:12px">' + escapeHtml(item.link || '') + '</a></div>';
            html += '</div>';
          });
          html += '</div>';
          previewEl.innerHTML = html;
        } catch (e) {
          previewEl.innerHTML = '<p style="color:#e74c3c">JSON 格式错误: ' + e.message + '</p>';
        }
      }
      textarea.addEventListener('input', updatePreview);
      updatePreview();

      document.getElementById('editor-save').addEventListener('click', function() {
        var btn = this;
        var parsed;
        try {
          parsed = JSON.parse(textarea.value);
        } catch (e) {
          showToast('JSON 格式错误: ' + e.message, 'error');
          return;
        }
        if (!Array.isArray(parsed)) {
          showToast('必须是数组格式', 'error');
          return;
        }

        btn.disabled = true;
        btn.textContent = '保存中...';

        api('/api/config/links', {
          method: 'POST',
          body: { items: parsed },
        }).then(function() {
          showToast('友链列表保存成功', 'success');
          showBuildStatus('友链已更新，正在重新构建...');
          removeOverlay(overlay);
        }).catch(function(err) {
          showToast('保存失败: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '保存';
        });
      });

      // Ctrl+S 保存
      var ctrlSHandler = function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
          e.preventDefault();
          document.getElementById('editor-save').click();
        }
      };
      overlay.addEventListener('keydown', ctrlSHandler);
    }).catch(function(err) {
      showToast('读取友链配置失败: ' + err.message, 'error');
    });
  }

  // ============================================
  // 简易 Markdown 渲染器（实时预览）
  // ============================================
  function simpleMarkdown(text) {
    if (!text) return '';
    var html = text
      // 转义 HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // 代码块 ```
      .replace(/```(\w*)\n([\s\S]*?)```/g, function(m, lang, code) {
        return '<pre><code class="language-' + lang + '">' + code.replace(/\n$/, '') + '</code></pre>';
      })
      // 行内代码 ``
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 标题
      .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      // 粗体/斜体
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // 图片
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
      // 引用块
      .replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>')
      // 水平线
      .replace(/^---$/gm, '<hr>')
      // 无序列表
      .replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
      // 有序列表
      .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
      // 段落（双换行）
      .replace(/\n\n+/g, '</p><p>')
      // 单换行 -> <br>
      .replace(/\n/g, '<br>');

    // 包装列表项
    html = html
      .replace(/(?:<li>[^<]*<\/li>(?:<br>)?)+/g, function(m) {
        var ordered = text.indexOf(m.replace(/<[^>]+>/g, '').trim().charAt(0) + '.') > -1;
        return '<' + (ordered ? 'ol' : 'ul') + '>' + m.replace(/<br>/g, '') + '</' + (ordered ? 'ol' : 'ul') + '>';
      });

    return '<p>' + html + '</p>';
  }

  // ============================================
  // 工具函数
  // ============================================
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function formatDate(dateVal) {
    var d = new Date(dateVal);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0') + ' ' +
      String(d.getHours()).padStart(2, '0') + ':' +
      String(d.getMinutes()).padStart(2, '0') + ':' +
      String(d.getSeconds()).padStart(2, '0');
  }

  function removeOverlay(overlay) {
    if (overlay && overlay.parentNode) {
      // 移除事件监听器
      if (overlay._ctrlSHandler) {
        overlay.removeEventListener('keydown', overlay._ctrlSHandler);
      }
      overlay.parentNode.removeChild(overlay);
    }
  }

  function removeExistingOverlay() {
    var overlays = document.querySelectorAll('.admin-modal-overlay');
    for (var i = 0; i < overlays.length; i++) {
      if (overlays[i]._ctrlSHandler) {
        overlays[i].removeEventListener('keydown', overlays[i]._ctrlSHandler);
      }
      if (overlays[i].parentNode) {
        overlays[i].parentNode.removeChild(overlays[i]);
      }
    }
  }

  // ============================================
  // 初始化
  // ============================================
  function init() {
    // 自动检测 API 地址（同端口生产模式不需要跨域）
    if (window.location.port === '3000') {
      API_BASE = '';
    }

    // 检测页面类型
    state.currentPage = detectPageType();

    // 检查是否已登录
    if (state.token) {
      // 验证 token 有效性
      api('/api/auth/me').then(function() {
        state.loggedIn = true;
        showToolbar();
      }).catch(function() {
        // token 无效，清除
        state.token = null;
        state.loggedIn = false;
        localStorage.removeItem(TOKEN_KEY);
      });
    }

    // 注册全局快捷键 Ctrl+Shift+A 弹出登录/管理面板
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (state.loggedIn && state.token) {
          togglePanel();
        } else {
          showLoginDialog();
        }
      }
    });

    console.log('%c[Admin] 管理脚本已加载。按 Ctrl+Shift+A 打开管理员面板。', 'color: #1E90FF;');
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();