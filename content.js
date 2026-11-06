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
  let bypassBanner = null;
  let toastTimeout = null;
  let forceInvertOverride = false;
  let hasLowContrastPage = false;

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
      const canvas = document.createElement('canvas');
      const w = 64;
      const h = 64;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, w, h);
      const data = ctx.getImageData(0, 0, w, h).data;

      let sum = 0;
      const lums = new Float32Array(w * h);
      for (let i = 0, j = 0; i < data.length; i += 4, j++) {
        const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        lums[j] = l;
        sum += l;
      }

      lums.sort();
      const p5 = lums[Math.floor(lums.length * 0.05)];
      const p95 = lums[Math.floor(lums.length * 0.95)];
      const contrastRange = (p95 - p5) / 255;

      const mean = sum / lums.length;
      let variance = 0;
      for (let j = 0; j < lums.length; j++) {
        variance += Math.pow(lums[j] - mean, 2);
      }
      const rmsContrast = Math.sqrt(variance / lums.length) / 255;

      // Exceptionally low contrast scans have narrow dynamic range (< 0.14) or tiny RMS variance (< 0.048)
      return contrastRange < 0.14 || rmsContrast < 0.048;
    } catch (err) {
      return false;
    }
  }

  // Tag images and handle low-contrast bypass
  function tagPaperImages() {
    requestAnimationFrame(() => {
      const viewerImages = document.querySelectorAll(
        '[data-pdf-viewer-theme] img, div[style*="width"][style*="height"] > img, [data-pdf-viewer-theme] canvas'
      );

      let foundLowContrast = false;

      viewerImages.forEach((el) => {
        if (!el.classList.contains('papershade-target-img')) {
          el.classList.add('papershade-target-img');
        }

        if (el.tagName === 'IMG' && currentSettings.autoBypassLowContrast && !forceInvertOverride) {
          const runCheck = () => {
            const lowContrast = isExceptionallyLowContrast(el);
            if (lowContrast) {
              foundLowContrast = true;
              el.classList.add('papershade-bypass-contrast');
            } else {
              el.classList.remove('papershade-bypass-contrast');
            }
            updateBypassBanner(foundLowContrast);
          };

          if (el.complete && el.naturalWidth > 0) {
            runCheck();
          } else {
            el.addEventListener('load', runCheck, { once: true });
          }
        } else if (forceInvertOverride) {
          el.classList.remove('papershade-bypass-contrast');
        }
      });
    });
  }

  // Low-Contrast Banner
  function createBypassBanner() {
    if (bypassBanner || !document.body) return;

    bypassBanner = document.createElement('div');
    bypassBanner.className = 'papershade-bypass-banner';
    bypassBanner.innerHTML = `
      <span>⚠️ Low contrast paper: Showing original page for readability</span>
      <button class="papershade-bypass-btn" id="papershadeOverrideBtn">Invert Anyway</button>
      <button class="papershade-bypass-close" id="papershadeCloseBanner" title="Dismiss">✕</button>
    `;

    document.body.appendChild(bypassBanner);

    const overrideBtn = document.getElementById('papershadeOverrideBtn');
    if (overrideBtn) {
      overrideBtn.addEventListener('click', (e) => {
        e.preventDefault();
        forceInvertOverride = !forceInvertOverride;
        if (forceInvertOverride) {
          document.querySelectorAll('.papershade-bypass-contrast').forEach((el) => {
            el.classList.remove('papershade-bypass-contrast');
          });
          overrideBtn.textContent = 'Show Original';
          showToast('Forced Invert Applied', '⚡');
        } else {
          tagPaperImages();
          overrideBtn.textContent = 'Invert Anyway';
          showToast('Showing Original Page', '📄');
        }
      });
    }

    const closeBtn = document.getElementById('papershadeCloseBanner');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        bypassBanner.classList.remove('visible');
      });
    }
  }

  function updateBypassBanner(show) {
    hasLowContrastPage = show;
    if (!bypassBanner && show) {
      createBypassBanner();
    }
    if (bypassBanner) {
      if (show && !forceInvertOverride) {
        bypassBanner.classList.add('visible');
      } else {
        bypassBanner.classList.remove('visible');
      }
    }
    updateFloatingButtonState();
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
    if (hasLowContrastPage && !forceInvertOverride && currentSettings.enabled) {
      floatingBtn.classList.remove('active');
      floatingBtn.classList.add('bypass-active');
      floatingBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      `;
      floatingBtn.title = 'Original shown (low contrast scan). Click to toggle (Alt+I)';
    } else if (currentSettings.enabled) {
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
        hasLowContrastPage,
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
