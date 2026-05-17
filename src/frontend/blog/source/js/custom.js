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

      setTimeout(function() {
        if (loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }, 500);
    }

    // 延迟 100ms 开始打字
    setTimeout(typeIn, 100);
  }

  // ============================================
  // DOM 加载完成后执行
  // ============================================
  document.addEventListener('DOMContentLoaded', function() {

    // ----- 首页 Loading 动画 -----
    initLoadingScreen();

    // ----- 导航栏滚动效果（首页滚动到内容区后增强背景） -----
    var navbar = document.querySelector('.navbar');
    var banner = document.querySelector('.header-inner');
    var isHomePage = banner && banner.style.height === '100vh';

    if (navbar && isHomePage) {
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
      sloganEl.style.textShadow = '0 0 20px rgba(30, 144, 255, 0.6), 0 2px 12px rgba(0, 0, 0, 0.5)';
    }

    // ----- 文章卡片进入动画 -----
    var postItems = document.querySelectorAll('.post-item');
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
    console.log('%c☕ WELCOME TO JIO\'S BLOG', 'color: #1E90FF; font-size: 20px; font-weight: bold;');
    console.log('%c🚀 LLM / Agent 开发探索 & 游戏日常记录', 'color: #666; font-size: 12px;');

  });
})();
