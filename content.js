/**
 * PaperShade Content Script
 * Inverts question papers into dark mode on papers.codechefvit.com
 * with Pure Black & White radiant text engine and Automatic Low-Contrast Bypass.
 */

(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'mono-bw',          // 'mono-bw' (Clear B&W) | 'color-diagrams' | 'sepia-dark'
    blackDepth: 110,          // 60% to 160%, lifts dirty/yellow scan paper to pure white
    textBrightness: 120,      // 80% to 180%, boosts text to punchy bright white
    contrast: 110,            // 80% to 150%, sharpens text edges
    autoBypassLowContrast: true, // Automatically shows original page if scan contrast is too low
    showFloatingButton: true
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let floatingBtn = null;
  let toastTimeout = null;
  const pageStateMap = new Map(); // pageNumber -> { isLowContrast: boolean, userOverride: 'invert' | 'original' | null }
  let lastPathname = window.location.pathname;
  const announcedPages = new Set();

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

    // Radiant Black & White engine:
    // 1. Scan boost lifts yellow/dirty paper background to pure 100% white before invert.
    const depth = typeof settings.blackDepth === 'number' ? settings.blackDepth : 110;
    const scanBoost = 1.85 * (depth / 100);
    const scanContrast = 1.4;

    // 2. Text boost multiplies the inverted white text so it is radiant and clearly visible.
    const textBright = typeof settings.textBrightness === 'number' ? settings.textBrightness : 120;
    const textBoost = 1.45 * (textBright / 100);
    const contrastVal = typeof settings.contrast === 'number' ? settings.contrast : 110;
    const contrast = 1.15 * (contrastVal / 100);

    root.style.setProperty('--papershade-scan-boost', scanBoost.toFixed(3));
    root.style.setProperty('--papershade-scan-contrast', scanContrast.toString());
    root.style.setProperty('--papershade-text-boost', textBoost.toFixed(3));
    root.style.setProperty('--papershade-contrast', contrast.toFixed(3));

    // Update floating button appearance if present
    updateFloatingButtonState();

    // Inspect and tag target images/canvases
    tagPaperImages();
  }

  // Detect if a paper image has exceptionally low contrast (faint ink, washed-out scan)
  function isExceptionallyLowContrast(img) {
    try {
      const nw = img.naturalWidth || img.width || 600;
      const nh = img.naturalHeight || img.height || 800;
      if (nw === 0 || nh === 0) return false;

      // Fast stride sampling: downsample to ~1/3 size with nearest neighbor (preserves sharp ink stroke darkness)
      const stride = 3;
      const targetW = Math.max(100, Math.floor(nw / stride));
      const targetH = Math.max(100, Math.floor(nh / stride));

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return false;

      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0, targetW, targetH);

      const imgData = ctx.getImageData(0, 0, targetW, targetH).data;
      const totalPixels = targetW * targetH;
      const lums = new Uint8Array(totalPixels);

      for (let i = 0, j = 0; i < imgData.length; i += 4, j++) {
        // Fast integer luminance
        lums[j] = (299 * imgData[i] + 587 * imgData[i + 1] + 114 * imgData[i + 2]) / 1000;
      }

      // Fast histogram
      const hist = new Uint32Array(256);
      for (let i = 0; i < totalPixels; i++) {
        hist[lums[i]]++;
      }

      // 90th percentile = paper background luminance
      const p90Count = Math.floor(totalPixels * 0.90);
      let cumulative = 0;
      let bg = 255;
      for (let v = 0; v < 256; v++) {
        cumulative += hist[v];
        if (cumulative >= p90Count) {
          bg = v;
          break;
        }
      }

      // Non-light paper background: do not bypass
      if (bg < 170) return false;

      // Text strokes: pixels noticeably darker than paper background
      const textThresh = bg - 30;
      let textCount = 0;
      let darkInkCount = 0;
      const textHist = new Uint32Array(256);

      for (let i = 0; i < totalPixels; i++) {
        const val = lums[i];
        if (val < textThresh) {
          textCount++;
          textHist[val]++;
          if (val < 115) {
            darkInkCount++;
          }
        }
      }

      if (textCount < 25) return false; // Minimal text / blank page

      // Median text luminance
      const halfText = Math.floor(textCount / 2);
      let textAccum = 0;
      let textMedian = textThresh;
      for (let v = 0; v < 256; v++) {
        textAccum += textHist[v];
        if (textAccum >= halfText) {
          textMedian = v;
          break;
        }
      }

      const overallContrast = (bg - textMedian) / Math.max(bg, 1);
      const darkInkRatio = darkInkCount / textCount;

      // Body text analysis: skip top 18% (header, exam title, logo)
      const bodyStartIndex = Math.floor(targetH * 0.18) * targetW;
      let bodyTextCount = 0;
      let bodyDarkInkCount = 0;
      const bodyTextHist = new Uint32Array(256);

      for (let i = bodyStartIndex; i < totalPixels; i++) {
        const val = lums[i];
        if (val < textThresh) {
          bodyTextCount++;
          bodyTextHist[val]++;
          if (val < 115) {
            bodyDarkInkCount++;
          }
        }
      }

      let bodyContrast = overallContrast;
      let bodyDarkRatio = darkInkRatio;

      if (bodyTextCount >= 15) {
        const halfBody = Math.floor(bodyTextCount / 2);
        let bAccum = 0;
        let bodyMedian = textThresh;
        for (let v = 0; v < 256; v++) {
          bAccum += bodyTextHist[v];
          if (bAccum >= halfBody) {
            bodyMedian = v;
            break;
          }
        }
        bodyContrast = (bg - bodyMedian) / Math.max(bg, 1);
        bodyDarkRatio = bodyDarkInkCount / bodyTextCount;
      }

      // Detection threshold:
      // In true-black dark mode, pixels >= 118 are crushed to pure black background.
      // If the body text contrast is < 0.35, or dark ink ratio in body is < 0.14,
      // or overall contrast is < 0.36 and dark ink ratio is < 0.22,
      // the text strokes will become illegible/invisible when inverted.
      return (bodyContrast < 0.35) || (bodyDarkRatio < 0.14) || (overallContrast < 0.36 && darkInkRatio < 0.22);
    } catch (err) {
      console.warn('PaperShade: contrast check error', err);
      return false;
    }
  }

  // Get 1-based page number for an image
  function getPageNumber(img) {
    if (img.dataset.papershadePage) {
      return parseInt(img.dataset.papershadePage, 10);
    }
    const scroller = document.querySelector('[data-pdf-viewer-theme]');
    if (scroller) {
      const wrappers = Array.from(scroller.querySelectorAll('div[style*="width"][style*="height"]'));
      const myWrapper = img.closest('div[style*="width"][style*="height"]');
      if (myWrapper) {
        const idx = wrappers.indexOf(myWrapper);
        if (idx !== -1) {
          const num = idx + 1;
          img.dataset.papershadePage = num.toString();
          return num;
        }
      }
    }
    return 1;
  }

  // Render or update page-specific pill on wrapper
  function updatePagePill(wrapper, pageNum, pageState, shouldBypass) {
    if (!wrapper || !currentSettings.enabled) {
      const existing = wrapper?.querySelector('.papershade-page-pill');
      if (existing) existing.remove();
      return;
    }

    if (window.getComputedStyle(wrapper).position === 'static') {
      wrapper.style.position = 'relative';
    }

    let pill = wrapper.querySelector('.papershade-page-pill');
    if (!pill) {
      pill = document.createElement('div');
      pill.className = 'papershade-page-pill';
      wrapper.appendChild(pill);
    }

    if (shouldBypass) {
      pill.className = 'papershade-page-pill papershade-pill-original';
      const label = pageState.isLowContrast ? `Page ${pageNum} • Low Contrast (Original)` : `Page ${pageNum} • Original Scan`;
      pill.innerHTML = `
        <span class="papershade-pill-label">${label}</span>
        <button class="papershade-pill-btn" type="button">Invert Page</button>
      `;
      const btn = pill.querySelector('button');
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        pageState.userOverride = 'invert';
        const img = wrapper.querySelector('img');
        if (img) evaluateAndStylePage(img);
        showToast(`Page ${pageNum}: Inverted`, '⚡');
      });
    } else {
      if (pageState.isLowContrast) {
        pill.className = 'papershade-page-pill papershade-pill-forced-invert';
        pill.innerHTML = `
          <span class="papershade-pill-label">Page ${pageNum} • Inverted (Manual)</span>
          <button class="papershade-pill-btn" type="button">Show Original</button>
        `;
        const btn = pill.querySelector('button');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          pageState.userOverride = 'original';
          const img = wrapper.querySelector('img');
          if (img) evaluateAndStylePage(img);
          showToast(`Page ${pageNum}: Showing Original Scan`, '📄');
        });
      } else {
        pill.className = 'papershade-page-pill papershade-pill-normal';
        pill.innerHTML = `
          <span class="papershade-pill-label">Page ${pageNum}</span>
          <button class="papershade-pill-btn" type="button">Original</button>
        `;
        const btn = pill.querySelector('button');
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          pageState.userOverride = 'original';
          const img = wrapper.querySelector('img');
          if (img) evaluateAndStylePage(img);
          showToast(`Page ${pageNum}: Showing Original Scan`, '📄');
        });
      }
    }
  }

  // Evaluate single page contrast and apply styling
  function evaluateAndStylePage(img) {
    if (window.location.pathname !== lastPathname) {
      pageStateMap.clear();
      announcedPages.clear();
      lastPathname = window.location.pathname;
    }

    const pageNum = getPageNumber(img);
    let pageState = pageStateMap.get(pageNum);

    if (!pageState) {
      const isLow = isExceptionallyLowContrast(img);
      pageState = {
        isLowContrast: isLow,
        userOverride: null
      };
      pageStateMap.set(pageNum, pageState);

      if (isLow && currentSettings.autoBypassLowContrast && !announcedPages.has(pageNum)) {
        announcedPages.add(pageNum);
        showToast(`Page ${pageNum}: Low contrast scan kept in original mode`, '📄');
      }
    }

    const wrapper = img.closest('div[style*="width"][style*="height"]') || img.parentElement;

    let shouldBypass = false;
    if (currentSettings.enabled) {
      if (pageState.userOverride === 'invert') {
        shouldBypass = false;
      } else if (pageState.userOverride === 'original') {
        shouldBypass = true;
      } else if (currentSettings.autoBypassLowContrast && pageState.isLowContrast) {
        shouldBypass = true;
      }
    }

    if (shouldBypass) {
      img.classList.add('papershade-bypass-contrast');
    } else {
      img.classList.remove('papershade-bypass-contrast');
    }

    updatePagePill(wrapper, pageNum, pageState, shouldBypass);
    updateFloatingButtonState();
  }

  // Tag images and handle per-page contrast detection
  function tagPaperImages() {
    requestAnimationFrame(() => {
      const viewerImages = document.querySelectorAll(
        '[data-pdf-viewer-theme] img, div[style*="width"][style*="height"] > img, [data-pdf-viewer-theme] canvas'
      );

      viewerImages.forEach((el) => {
        if (!el.classList.contains('papershade-target-img')) {
          el.classList.add('papershade-target-img');
        }

        if (el.tagName === 'IMG') {
          if (el.complete && el.naturalWidth > 0) {
            evaluateAndStylePage(el);
          } else {
            el.addEventListener('load', () => evaluateAndStylePage(el), { once: true });
          }
        }
      });
    });
  }

  // Floating Quick Toggle Button
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

  // Toggle Dark Mode
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
        hasLowContrastPage: Array.from(pageStateMap.values()).some((s) => s.isLowContrast),
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
