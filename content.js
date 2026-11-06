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
    const scanBoost = 1.85 * (depth / 100);
    const scanContrast = 1.4;

    const textBright = typeof settings.textBrightness === 'number' ? settings.textBrightness : 120;
    const textBoost = 1.45 * (textBright / 100);
    const contrastVal = typeof settings.contrast === 'number' ? settings.contrast : 110;
    const contrast = 1.15 * (contrastVal / 100);

    root.style.setProperty('--papershade-scan-boost', scanBoost.toFixed(3));
    root.style.setProperty('--papershade-scan-contrast', scanContrast.toString());
    root.style.setProperty('--papershade-text-boost', textBoost.toFixed(3));
    root.style.setProperty('--papershade-contrast', contrast.toFixed(3));

    updateFloatingButtonState();
    tagPaperImages();
  }

  // Get stable key for a page wrapper/image
  function getPageKey(wrapper, img) {
    try {
      for (const el of [img, wrapper, wrapper?.parentElement]) {
        if (!el) continue;
        const fiberKey = Object.keys(el).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
        if (fiberKey) {
          let curr = el[fiberKey];
          while (curr) {
            if (curr.memoizedProps && typeof curr.memoizedProps.pageIndex === 'number') {
              return `page_idx_${curr.memoizedProps.pageIndex}`;
            }
            if (curr.pendingProps && typeof curr.pendingProps.pageIndex === 'number') {
              return `page_idx_${curr.pendingProps.pageIndex}`;
            }
            if (curr.key !== null && curr.key !== undefined && String(curr.key).match(/^\d+$/)) {
              return `page_key_${curr.key}`;
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
      if (idx !== -1) return `page_idx_${idx}`;
    }

    if (wrapper?.dataset.papershadePageKey) {
      return wrapper.dataset.papershadePageKey;
    }
    const key = `page_${Math.random().toString(36).slice(2, 8)}`;
    if (wrapper) wrapper.dataset.papershadePageKey = key;
    return key;
  }

  // Tag images and mount/update per-page toggle button
  function tagPaperImages() {
    if (window.location.pathname !== lastPathname) {
      bypassedPageKeys.clear();
      lastPathname = window.location.pathname;
    }

    requestAnimationFrame(() => {
      const viewerImages = document.querySelectorAll(
        '[data-pdf-viewer-theme] img, div[style*="width"][style*="height"] > img, [data-pdf-viewer-theme] canvas'
      );

      viewerImages.forEach((img) => {
        if (!img.classList.contains('papershade-target-img')) {
          img.classList.add('papershade-target-img');
        }

        const wrapper = img.closest('div[style*="width"][style*="height"]') || img.parentElement;
        if (!wrapper) return;

        if (window.getComputedStyle(wrapper).position === 'static') {
          wrapper.style.position = 'relative';
        }

        const pageKey = getPageKey(wrapper, img);
        const isOriginal = bypassedPageKeys.has(pageKey);

        // Apply bypass class to image if toggled to original
        if (currentSettings.enabled && isOriginal) {
          img.classList.add('papershade-bypass-contrast');
        } else {
          img.classList.remove('papershade-bypass-contrast');
        }

        // Mount or update the per-page toggle button
        let btn = wrapper.querySelector('.papershade-page-toggle-btn');
        if (!btn) {
          btn = document.createElement('button');
          btn.className = 'papershade-page-toggle-btn';
          btn.type = 'button';
          wrapper.appendChild(btn);
        }

        if (!currentSettings.enabled) {
          btn.style.display = 'none';
        } else {
          btn.style.display = 'flex';
          if (isOriginal) {
            btn.className = 'papershade-page-toggle-btn papershade-btn-original';
            btn.innerHTML = '<span class="papershade-btn-icon">🌙</span><span>Invert</span>';
            btn.title = 'Invert this page to Dark Mode';
          } else {
            btn.className = 'papershade-page-toggle-btn papershade-btn-dark';
            btn.innerHTML = '<span class="papershade-btn-icon">📄</span><span>Original</span>';
            btn.title = 'Show original scan for this page';
          }
        }
      });
    });
  }

  // Global click handler using CAPTURE phase for 100% reliable clicks
  document.addEventListener(
    'click',
    (e) => {
      const btn = e.target.closest('.papershade-page-toggle-btn');
      if (!btn) return;

      e.preventDefault();
      e.stopPropagation();

      const wrapper = btn.closest('div[style*="width"][style*="height"]') || btn.parentElement;
      const img = wrapper?.querySelector('img') || wrapper?.querySelector('.papershade-target-img');
      const pageKey = getPageKey(wrapper, img);

      if (bypassedPageKeys.has(pageKey)) {
        bypassedPageKeys.delete(pageKey);
        if (img) img.classList.remove('papershade-bypass-contrast');
        btn.className = 'papershade-page-toggle-btn papershade-btn-dark';
        btn.innerHTML = '<span class="papershade-btn-icon">📄</span><span>Original</span>';
        btn.title = 'Show original scan for this page';
        showToast('Page Inverted', '⚡');
      } else {
        bypassedPageKeys.add(pageKey);
        if (img) img.classList.add('papershade-bypass-contrast');
        btn.className = 'papershade-page-toggle-btn papershade-btn-original';
        btn.innerHTML = '<span class="papershade-btn-icon">🌙</span><span>Invert</span>';
        btn.title = 'Invert this page to Dark Mode';
        showToast('Showing Original Page', '📄');
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
    floatingBtn.setAttribute('title', 'Toggle Paper Dark Mode (Alt+I)');
    floatingBtn.setAttribute('aria-label', 'Toggle Paper Dark Mode');

    floatingBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
      </svg>
    `;

    floatingBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleInversion();
    });

    document.body.appendChild(floatingBtn);
    updateFloatingButtonState();
  }

  function updateFloatingButtonState() {
    if (!floatingBtn) return;
    if (currentSettings.enabled) {
      floatingBtn.classList.remove('bypass-active');
      floatingBtn.classList.add('active');
      floatingBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      floatingBtn.title = 'Switch to Original Paper (Alt+I)';
    } else {
      floatingBtn.classList.remove('bypass-active');
      floatingBtn.classList.remove('active');
      floatingBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
      `;
      floatingBtn.title = 'Switch to Dark Paper (Alt+I)';
    }

    floatingBtn.style.display = currentSettings.showFloatingButton ? 'flex' : 'none';
  }

  // HUD Toast Notification
  function showToast(message, icon = '🌙') {
    if (!document.body) return;

    let toast = document.querySelector('.papershade-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'papershade-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `<span class="papershade-toast-icon">${icon}</span><span>${message}</span>`;
    toast.classList.add('papershade-toast-visible');

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('papershade-toast-visible');
    }, 2200);
  }

  // Toggle Dark Mode (Global)
  async function toggleInversion() {
    currentSettings.enabled = !currentSettings.enabled;
    applySettingsToDOM(currentSettings);

    try {
      await chrome.storage.local.set({ enabled: currentSettings.enabled });
      chrome.runtime.sendMessage({
        action: 'STATE_CHANGED',
        enabled: currentSettings.enabled
      });
    } catch (err) {}

    if (currentSettings.enabled) {
      const modeLabel = currentSettings.mode === 'color-diagrams' ? 'Color Preserved' :
                        currentSettings.mode === 'sepia-dark' ? 'Warm Dark' : 'Clear B&W';
      showToast(`Paper Dark Mode (${modeLabel})`, '🌙');
    } else {
      showToast('Original Paper Colors', '☀️');
    }
  }

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
        tagPaperImages();
      });
    } else {
      createFloatingButton();
      tagPaperImages();
    }

    const observer = new MutationObserver(() => {
      tagPaperImages();
      if (!floatingBtn && document.body) {
        createFloatingButton();
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
