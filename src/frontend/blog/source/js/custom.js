/**
 * Jio_Brandon 博客自定义 JavaScript
 */

(function() {
  'use strict';

  // ============================================
  // 首页 Loading 动画
  // 流程：白屏 → 逐字出现 → 逐字消失 → 背景图淡入 → 显示 Banner 文字
  // ============================================
  function initLoadingScreen() {
    var headerInner = document.querySelector('.header-inner');
    var isHomePage = document.querySelector('.index-page') !== null ||
                     document.querySelector('.index-slogan') !== null ||
                     (headerInner && headerInner.style.height === '100vh');

    if (!isHomePage) return;

    // v2.1：Loading 动画每天仅首次访问时显示
    // 当天已显示过则直接跳过，Banner 元素保持默认可见状态
    var STORAGE_KEY = 'jio_loading_shown_date';
    var today = new Date().toDateString();
    try {
      if (window.localStorage && localStorage.getItem(STORAGE_KEY) === today) {
        return;
      }
      localStorage.setItem(STORAGE_KEY, today);
    } catch (e) {
      // localStorage 不可用（隐私模式等）时每次都播放动画
    }

    // 计算滚动条宽度并补偿，避免锁定/解锁时页面元素左移
    // 如果浏览器支持 scrollbar-gutter: stable（已通过 CSS 设置），无需此补偿
    var supportsScrollbarGutter = CSS.supports && CSS.supports('scrollbar-gutter', 'stable');
    var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0 && !supportsScrollbarGutter) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
    }

    // 锁定页面滚动，隐藏滚动条
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    // 创建 Loading 遮罩层
    var loadingScreen = document.createElement('div');
    loadingScreen.id = 'loading-screen';

    var loadingText = document.createElement('div');
    loadingText.id = 'loading-text';

    // 为每个字符创建独立 span
    var text = "WELCOME JIO'S BLOG";
    var chars = [];
    for (var i = 0; i < text.length; i++) {
      var charSpan = document.createElement('span');
      charSpan.className = 'loading-char';
      // 空格需要特殊处理
      charSpan.textContent = text[i] === ' ' ? ' ' : text[i];
      loadingText.appendChild(charSpan);
      chars.push(charSpan);
    }

    // 光标
    var cursor = document.createElement('span');
    cursor.className = 'loading-cursor';
    loadingText.appendChild(cursor);

    loadingScreen.appendChild(loadingText);
    document.body.appendChild(loadingScreen);

    // 隐藏原始 Banner 文字和背景（loading 完成后再显示）
    var originalSlogan = document.querySelector('#subtitle');
    var bannerText = document.querySelector('.banner-text');
    if (originalSlogan) originalSlogan.style.opacity = '0';
    if (bannerText) bannerText.style.opacity = '0';
    if (headerInner) headerInner.style.opacity = '0';

    // --- 第一阶段：逐字出现 ---
    var charIndex = 0;
    var typeSpeed = 50; // ms，每个字符出现间隔

    function typeIn() {
      if (charIndex < chars.length) {
        chars[charIndex].classList.add('visible');
        charIndex++;
        setTimeout(typeIn, typeSpeed);
      } else {
        // 全部出现后，停留 300ms，然后开始逐字消失
        setTimeout(typeOut, 300);
      }
    }

    // --- 第二阶段：逐字消失 ---
    var eraseIndex = chars.length - 1;
    var eraseSpeed = 30; // ms，每个字符消失间隔（比出现快一点）

    function typeOut() {
      if (eraseIndex >= 0) {
        chars[eraseIndex].classList.remove('visible');
        chars[eraseIndex].classList.add('hidden');
        eraseIndex--;
        setTimeout(typeOut, eraseSpeed);
      } else {
        // 隐藏光标
        cursor.style.display = 'none';
        // 所有字符消失后，白屏淡出 + 背景图淡入
        setTimeout(fadeOutScreen, 200);
      }
    }

    function fadeOutScreen() {
      loadingScreen.classList.add('fade-out');

      // 淡入 Banner 背景
      if (headerInner) {
        headerInner.classList.add('banner-visible');
      }

      // 白屏淡出后显示 Banner 文字
      setTimeout(showBannerText, 400);
    }

    function showBannerText() {
      if (originalSlogan) {
        originalSlogan.style.transition = 'opacity 0.5s ease';
        originalSlogan.style.opacity = '1';
      }
      if (bannerText) {
        bannerText.style.transition = 'opacity 0.5s ease';
        bannerText.style.opacity = '1';
      }

      // 使用 transitionend 事件确保 fade-out 动画完成后再移除元素
      //（Windows 上 setTimeout 可能在 transition 完成前触发，导致渐隐效果被截断）
      loadingScreen.addEventListener('transitionend', function handler(e) {
        if (e.propertyName !== 'opacity') return;
        loadingScreen.removeEventListener('transitionend', handler);
        if (loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
        // 恢复页面滚动
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      });
    }

    // 延迟 100ms 开始打字
    setTimeout(typeIn, 100);
  }

  // ============================================
  // DOM 加载完成后执行
  // ============================================
  document.addEventListener('DOMContentLoaded', function() {

    // ----- 修复外部图片：立即移除 lazyload 属性，防止 loading.gif 覆盖真实图片 -----
    var externalImgs = document.querySelectorAll('img.personal-tag-icon-img[lazyload], img.jio-steam-thumb[lazyload]');
    for (var ti = 0; ti < externalImgs.length; ti++) {
      externalImgs[ti].removeAttribute('srcset');
      externalImgs[ti].removeAttribute('lazyload');
    }

    // ----- 首页 Loading 动画 -----
    initLoadingScreen();

    // ----- 导航栏滚动效果 -----
    // 所有页面：Banner 背景图区域透明，滚动到内容区后显示实色 #1E90FF
    var navbar = document.querySelector('.navbar');
    var banner = document.querySelector('.header-inner');

    if (navbar && banner) {
      var bannerHeight = banner.offsetHeight || window.innerHeight;

      function updateNavbar() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop > bannerHeight * 0.8) {
          navbar.classList.add('scrolled');
        } else {
          navbar.classList.remove('scrolled');
        }
      }

      window.addEventListener('scroll', updateNavbar);
      updateNavbar();
    }

    // ----- 首页 Banner 文字增强效果 -----
    var sloganEl = document.querySelector('.index-slogan');
    if (sloganEl) {
      sloganEl.style.textShadow = '0 0 20px rgba(59, 130, 246, 0.6), 0 2px 12px rgba(0, 0, 0, 0.5)';
    }

    // ----- 文章卡片进入动画（首页卡片类名为 .index-card） -----
    var postItems = document.querySelectorAll('.index-card');
    if (postItems.length > 0) {
      var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry, index) {
          if (entry.isIntersecting) {
            setTimeout(function() {
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translateY(0)';
            }, index * 100);
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.1 });

      postItems.forEach(function(item) {
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(item);
      });
    }

    // ----- 欢迎语控制台输出 -----
    console.log('%c☕ WELCOME TO JIO\'S BLOG', 'color: #3B82F6; font-size: 20px; font-weight: bold;');
    console.log('%c🚀 LLM / Agent 开发探索 & 游戏日常记录', 'color: #666; font-size: 12px;');

    // ----- 滚动条智能显示/隐藏 -----
    var scrollbarTimer = null;
    var SCROLLBAR_HIDE_DELAY = 1000;
    var SCROLLBAR_EDGE = 20; // 鼠标距右边缘多少像素内显示滚动条

    function showScrollbar() {
      document.documentElement.classList.add('scrollbar-visible');
      if (scrollbarTimer) {
        clearTimeout(scrollbarTimer);
        scrollbarTimer = null;
      }
    }

    function hideScrollbarAfterDelay() {
      if (scrollbarTimer) clearTimeout(scrollbarTimer);
      scrollbarTimer = setTimeout(function() {
        document.documentElement.classList.remove('scrollbar-visible');
      }, SCROLLBAR_HIDE_DELAY);
    }

    // 滚动时显示滚动条
    window.addEventListener('scroll', function() {
      showScrollbar();
      hideScrollbarAfterDelay();
    }, { passive: true });

    // 鼠标靠近右侧边缘时显示滚动条
    document.addEventListener('mousemove', function(e) {
      if (e.clientX >= window.innerWidth - SCROLLBAR_EDGE) {
        showScrollbar();
      } else {
        hideScrollbarAfterDelay();
      }
    }, { passive: true });

    // 鼠标离开页面时隐藏滚动条
    document.addEventListener('mouseleave', function() {
      hideScrollbarAfterDelay();
    });

    // ----- 番剧列表高度跟随音乐盒卡片 -----
    var musicCard = document.getElementById('about-music');
    var animeCard = document.getElementById('about-anime');
    var bangumiList = animeCard ? animeCard.querySelector('.jio-bangumi-list') : null;

    if (musicCard && bangumiList) {
      var matchHeights = function () {
        var animeTitle = animeCard.querySelector('.about-card-title');
        if (!animeTitle) return;
        var animeCardH = animeCard.offsetHeight;
        // 标题区高度 + margin-bottom(16px) + 卡片上下 padding(12+24=36px)
        var used = animeTitle.offsetHeight + 16 + 36;
        var listH = animeCardH - used;
        if (listH > 0) {
          bangumiList.style.maxHeight = listH + 'px';
        }
      };

      // 用 ResizeObserver 监听音乐盒卡片高度变化（APlayer 加载后高度会变）
      if ('ResizeObserver' in window) {
        var observer = new ResizeObserver(function () {
          matchHeights();
        });
        observer.observe(musicCard);
      }
      // 兼容回退：轮询匹配
      else {
        var attempts = 0;
        var pollTimer = setInterval(function () {
          attempts++;
          matchHeights();
          if (attempts >= 15) clearInterval(pollTimer);
        }, 400);
      }

      window.addEventListener('resize', function () {
        matchHeights();
      });
    }

  });
})();
