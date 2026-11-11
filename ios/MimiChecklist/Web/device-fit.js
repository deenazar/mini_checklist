/*
 * Fits the page to the phone it runs on.
 *
 * In the iPhone app the page fills the whole screen, so the island's sky runs behind the status bar.
 * This measures the top safe area and sets CSS variables for the date row and Mimi's island pill.
 * On iPhones with a Dynamic Island (top safe area of 51pt or more), the pill sits exactly over the
 * real island, so the real island seems to grow when Mimi has something to show.
 * Runs before app.js, and again when the screen rotates or resizes.
 */
(function () {
  'use strict';
  var root = document.documentElement;
  var probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;' +
    'padding-top:env(safe-area-inset-top,0px)';

  function fit() {
    if (!probe.parentNode) document.body.appendChild(probe);
    var top = parseFloat(getComputedStyle(probe).paddingTop) || 0;
    // For testing layouts in a desktop browser: index.html?safeTop=59
    var forced = /[?&]safeTop=(\d{1,3})\b/.exec(location.search);
    if (forced) top = +forced[1];
    var island = top >= 51; // Dynamic Island iPhones report 59pt or more; notch iPhones 44–50pt
    var diTop = island ? 11 : (top ? top + 6 : 10);
    var hudTop = island ? top + 4 : Math.max(54, diTop + 36 + 8);
    var hudTopNoIsland = Math.max(14, top + 4);
    root.classList.toggle('hw-island', island);
    root.classList.toggle('in-app', !!(window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.mimiNative));
    root.style.setProperty('--safe-top', top + 'px');
    root.style.setProperty('--di-top', diTop + 'px');
    root.style.setProperty('--hud-top', hudTop + 'px');
    root.style.setProperty('--hud-top-noisland', hudTopNoIsland + 'px');
  }

  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', function () { setTimeout(fit, 250); });
})();
