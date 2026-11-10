/**
 * PaperShade Content Script
 * Inverts question papers into dark mode on papers.codechefvit.com
 * with Pure Black & White radiant text engine and per-page Original toggle.
 */

(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'mono-bw',          // 'mono-bw' (Clear B&W) | 'color-diagrams' | 'sepia-dark'
    blackDepth: 110,          // 60% to 160%
    textBrightness: 120,      // 80% to 180%
    contrast: 110,            // 80% to 150%
    showFloatingButton: true
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let floatingBtn = null;
  let toastTimeout = null;
  const bypassedPageKeys = new Set();
  let lastPathname = window.location.pathname;

  // Apply settings to document root immediately
  function applySettingsToDOM(settings) {
    const root = document.documentElement;
    if (!root) return;

    if (settings.enabled) {
      root.setAttribute('data-papershade-enabled', 'true');
      root.classList.add('papershade-active');
    } else {
      root.setAttribute('data-papershade-enabled', 'false');
      root.classList.remove('papershade-active');
    }

    const mode = settings.mode || 'mono-bw';
    root.setAttribute('data-papershade-mode', mode);

    const depth = typeof settings.blackDepth === 'number' ? settings.blackDepth : 110;
    // Gentle scan boost (approx 0.97 - 1.05) to eliminate paper haze without crushing faint strokes/gridlines before inversion
    const scanBoost = 0.92 + 0.08 * (depth / 100);
    const scanContrast = 1.0;

    const textBright = typeof settings.textBrightness === 'number' ? settings.textBrightness : 120;
    const textBoost = 1.15 * (textBright / 100);
    const contrastVal = typeof settings.contrast === 'number' ? settings.contrast : 110;
    const contrast = 1.14 * (contrastVal / 100);

    root.style.setProperty('--papershade-scan-boost', scanBoost.toFixed(3));
    root.style.setProperty('--papershade-scan-contrast', scanContrast.toFixed(1));
    root.style.setProperty('--papershade-text-boost', textBoost.toFixed(3));
    root.style.setProperty('--papershade-contrast', contrast.toFixed(3));

    const scroller = document.querySelector('[data-pdf-viewer-theme]');
    if (scroller) {
      scroller.style.setProperty('background-color', '#000000', 'important');
      scroller.style.setProperty('background-image', 'none', 'important');
      if (scroller.firstElementChild) {
        scroller.firstElementChild.style.setProperty('background-color', '#000000', 'important');
        scroller.firstElementChild.style.setProperty('background-image', 'none', 'important');
      }
    }

    updateFloatingButtonState();
    scheduleTagPaperImages();
  }

  let tagRafId = null;
  function scheduleTagPaperImages() {
    if (tagRafId) return;
    tagRafId = requestAnimationFrame(() => {
      tagRafId = null;
      tagPaperImages();
    });
  }

  // Get stable key for a page wrapper/image with fast caching
  function getPageKey(wrapper, img) {
    if (wrapper?.dataset.papershadeKey) return wrapper.dataset.papershadeKey;
    if (img?.dataset.papershadeKey) return img.dataset.papershadeKey;

    try {
      for (const el of [img, wrapper, wrapper?.parentElement]) {
        if (!el) continue;
        const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        if (fiberKey) {
          let curr = el[fiberKey];
          while (curr) {
            if (curr.memoizedProps && typeof curr.memoizedProps.pageIndex === 'number') {
              const k = `page_idx_${curr.memoizedProps.pageIndex}`;
              if (wrapper) wrapper.dataset.papershadeKey = k;
              if (img) img.dataset.papershadeKey = k;
              return k;
            }
            if (curr.pendingProps && typeof curr.pendingProps.pageIndex === 'number') {
              const k = `page_idx_${curr.pendingProps.pageIndex}`;
              if (wrapper) wrapper.dataset.papershadeKey = k;
              if (img) img.dataset.papershadeKey = k;
              return k;
            }
            if (curr.key !== null && curr.key !== undefined && String(curr.key).match(/^\d+$/)) {
              const k = `page_key_${curr.key}`;
              if (wrapper) wrapper.dataset.papershadeKey = k;
              if (img) img.dataset.papershadeKey = k;
              return k;
            }
            curr = curr.return;
          }
        }
      }
    } catch (err) {}

    const scroller = document.querySelector('[data-pdf-viewer-theme]');
    if (scroller && wrapper) {
      const allWrappers = Array.from(scroller.querySelectorAll('div[style*="width"][style*="height"]'));
      const idx = allWrappers.indexOf(wrapper);
      if (idx !== -1) {
        const k = `page_idx_${idx}`;
        wrapper.dataset.papershadeKey = k;
        if (img) img.dataset.papershadeKey = k;
        return k;
      }
    }

    const key = `page_${Math.random().toString(36).slice(2, 8)}`;
    if (wrapper) wrapper.dataset.papershadeKey = key;
    if (img) img.dataset.papershadeKey = key;
    return key;
  }

  // Tag images and mount/update per-page toggle button
  function tagPaperImages() {
    if (window.location.pathname !== lastPathname) {
      bypassedPageKeys.clear();
      lastPathname = window.location.pathname;
    }

    const scroller = document.querySelector('[data-pdf-viewer-theme]');
    if (scroller) {
      if (scroller.style.backgroundColor !== '#000000') {
        scroller.style.setProperty('background-color', '#000000', 'important');
        scroller.style.setProperty('background-image', 'none', 'important');
      }
      if (scroller.firstElementChild && scroller.firstElementChild.style.backgroundColor !== '#000000') {
        scroller.firstElementChild.style.setProperty('background-color', '#000000', 'important');
        scroller.firstElementChild.style.setProperty('background-image', 'none', 'important');
      }
    }

    const viewerImages = document.querySelectorAll(
      '[data-pdf-viewer-theme] img, div[style*="width"][style*="height"] > img, [data-pdf-viewer-theme] canvas'
    );

    viewerImages.forEach((img) => {
      if (!img.classList.contains('papershade-target-img')) {
        img.classList.add('papershade-target-img');
      }

      const wrapper = img.closest('div[style*="width"][style*="height"]') || img.parentElement;
      if (!wrapper) return;

      if (!wrapper.classList.contains('papershade-page-wrapper')) {
        wrapper.classList.add('papershade-page-wrapper');
      }

      const pageKey = getPageKey(wrapper, img);
      const isOriginal = bypassedPageKeys.has(pageKey);

      // Fast toggle without layout recalculations
      const shouldBypass = currentSettings.enabled && isOriginal;
      if (img.classList.contains('papershade-bypass-contrast') !== shouldBypass) {
        img.classList.toggle('papershade-bypass-contrast', shouldBypass);
        wrapper.classList.toggle('papershade-page-original', shouldBypass);
      }

      // Cleanup legacy full-button container if present
      const oldControls = wrapper.querySelector('.papershade-page-controls');
      if (oldControls) oldControls.remove();
      const oldFull = wrapper.querySelector('.papershade-full-toggle-btn');
      if (oldFull) oldFull.remove();

      // Mount or update single per-page button
      let pageBtn = wrapper.querySelector('.papershade-page-toggle-btn');
      if (!pageBtn) {
        pageBtn = document.createElement('button');
        pageBtn.className = 'papershade-page-toggle-btn';
        pageBtn.type = 'button';
        wrapper.appendChild(pageBtn);
      }

      if (!currentSettings.enabled) {
        if (pageBtn.style.display !== 'none') {
          pageBtn.style.display = 'none';
        }
      } else {
        if (pageBtn.style.display !== 'inline-flex') {
          pageBtn.style.display = 'inline-flex';
        }

        const pageTargetMode = isOriginal ? 'original' : 'dark';
        if (pageBtn.dataset.btnMode !== pageTargetMode) {
          pageBtn.dataset.btnMode = pageTargetMode;
          pageBtn.className = `papershade-page-toggle-btn ${isOriginal ? 'papershade-btn-original' : 'papershade-btn-dark'}`;
          pageBtn.textContent = isOriginal ? 'Invert' : 'Original';
          pageBtn.title = isOriginal ? 'Invert this page to Dark Mode' : 'Show original scan for this page';
        }
      }
    });
  }

  // Global click handler using CAPTURE phase for 100% reliable clicks across the entire button
  document.addEventListener(
    'click',
    (e) => {
      let target = e.target;
      if (target && target.nodeType === Node.TEXT_NODE) {
        target = target.parentElement;
      }
      const pageBtn = target?.closest?.('.papershade-page-toggle-btn');

      if (pageBtn) {
        e.preventDefault();
        e.stopPropagation();

        const wrapper = pageBtn.closest('.papershade-page-wrapper') || pageBtn.closest('div[style*="width"][style*="height"]') || pageBtn.parentElement;
        const img = wrapper?.querySelector('img') || wrapper?.querySelector('.papershade-target-img');
        const pageKey = getPageKey(wrapper, img);

        if (bypassedPageKeys.has(pageKey)) {
          bypassedPageKeys.delete(pageKey);
          if (img) img.classList.remove('papershade-bypass-contrast');
          if (wrapper) wrapper.classList.remove('papershade-page-original');
          showToast('Page Inverted');
        } else {
          bypassedPageKeys.add(pageKey);
          if (img) img.classList.add('papershade-bypass-contrast');
          if (wrapper) wrapper.classList.add('papershade-page-original');
          showToast('Showing Original Page');
        }

        tagPaperImages();
        updateFloatingButtonState();
        return;
      }
    },
    true
  );

  // Floating Quick Toggle Button (Global toggle)
  function createFloatingButton() {
    if (floatingBtn || !document.body || !currentSettings.showFloatingButton) return;
    if (!window.location.pathname.startsWith('/paper/')) return;

    floatingBtn = document.createElement('button');
    floatingBtn.className = 'papershade-floating-btn';
    floatingBtn.type = 'button';
    floatingBtn.setAttribute('title', 'Toggle Paper Dark Mode (Alt+I)');
    floatingBtn.setAttribute('aria-label', 'Toggle Paper Dark Mode');

    floatingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFullPaper();
    });

    document.body.appendChild(floatingBtn);
    updateFloatingButtonState();
  }

  function updateFloatingButtonState() {
    if (!floatingBtn) return;
    const isDark = currentSettings.enabled && bypassedPageKeys.size === 0;

    if (isDark) {
      floatingBtn.classList.remove('papershade-floating-reverted');
      floatingBtn.classList.add('papershade-floating-dark');
      floatingBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
        <span>Revert Full Paper</span>
      `;
      floatingBtn.title = 'Switch to Original Paper (Alt+I)';
    } else {
      floatingBtn.classList.remove('papershade-floating-dark');
      floatingBtn.classList.add('papershade-floating-reverted');
      floatingBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
        <span>Invert Full Paper</span>
      `;
      floatingBtn.title = 'Switch to Dark Paper (Alt+I)';
    }

    floatingBtn.style.display = currentSettings.showFloatingButton ? 'inline-flex' : 'none';
  }

  // HUD Toast Notification
  function showToast(message) {
    if (!document.body) return;

    let toast = document.querySelector('.papershade-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'papershade-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<span>${message}</span>`;
    toast.classList.add('papershade-toast-visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('papershade-toast-visible');
    }, 2200);
  }

  // Toggle Full Paper Dark Mode / Original Mode
  async function toggleFullPaper() {
    if (currentSettings.enabled && bypassedPageKeys.size === 0) {
      currentSettings.enabled = false;
      bypassedPageKeys.clear();
      applySettingsToDOM(currentSettings);
      showToast('Full Paper Reverted');
    } else {
      currentSettings.enabled = true;
      bypassedPageKeys.clear();
      applySettingsToDOM(currentSettings);
      showToast('Full Paper Inverted');
    }

    try {
      await chrome.storage.local.set({ enabled: currentSettings.enabled });
      chrome.runtime.sendMessage({
        action: 'STATE_CHANGED',
        enabled: currentSettings.enabled
      });
    } catch (err) {}
  }

  const toggleInversion = toggleFullPaper;

  // Initialize from chrome.storage
  async function init() {
    try {
      const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
      if (saved.mode === 'smart-dark' || saved.mode === 'pure-invert') {
        saved.mode = 'mono-bw';
      }
      currentSettings = { ...DEFAULT_SETTINGS, ...saved };
    } catch (e) {
      currentSettings = { ...DEFAULT_SETTINGS };
    }

    applySettingsToDOM(currentSettings);

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        createFloatingButton();
        scheduleTagPaperImages();
      });
    } else {
      createFloatingButton();
      scheduleTagPaperImages();
    }

    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      for (let i = 0; i < mutations.length; i++) {
        const target = mutations[i].target;
        if (target && target.nodeType === Node.ELEMENT_NODE) {
          if (target.classList.contains('papershade-page-toggle-btn') ||
              target.classList.contains('papershade-floating-btn') ||
              target.classList.contains('papershade-toast')) {
            continue;
          }
        }
        shouldProcess = true;
        break;
      }

      if (shouldProcess) {
        scheduleTagPaperImages();
        if (!floatingBtn && document.body) {
          createFloatingButton();
        }
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  // Listen for messages from popup or background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'UPDATE_SETTINGS') {
      currentSettings = { ...currentSettings, ...message.settings };
      applySettingsToDOM(currentSettings);
      sendResponse({ success: true, settings: currentSettings });
    } else if (message.action === 'TOGGLE_INVERT') {
      toggleInversion().then(() => {
        sendResponse({ success: true, enabled: currentSettings.enabled });
      });
      return true;
    } else if (message.action === 'GET_STATUS') {
      sendResponse({
        success: true,
        isPaperPage: window.location.pathname.startsWith('/paper/'),
        settings: currentSettings
      });
    }
    return true;
  });

  // Keyboard shortcut listener (Alt+I)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'i' || e.key === 'I')) {
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      toggleInversion();
    }
  });

  init();
})();
