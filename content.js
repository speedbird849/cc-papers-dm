/**
 * PaperShade Content Script
 * Inverts question papers into dark mode on papers.codechefvit.com
 * with Pure Black & White radiant text engine.
 */

(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'mono-bw',          // 'mono-bw' (Clear B&W) | 'color-diagrams' | 'sepia-dark'
    blackDepth: 110,          // 60% to 160%, lifts dirty/yellow scan paper to pure white
    textBrightness: 120,      // 80% to 180%, boosts text to punchy bright white
    contrast: 110,            // 80% to 150%, sharpens text edges
    showFloatingButton: true
  };

  let currentSettings = { ...DEFAULT_SETTINGS };
  let floatingBtn = null;
  let toastTimeout = null;

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

    // Mark target images/canvases directly for instant response
    tagPaperImages();
  }

  // Tag images rendered inside the PDF viewer
  function tagPaperImages() {
    requestAnimationFrame(() => {
      const viewerImages = document.querySelectorAll(
        '[data-pdf-viewer-theme] img, div[style*="width"][style*="height"] > img, [data-pdf-viewer-theme] canvas'
      );
      viewerImages.forEach((img) => {
        if (!img.classList.contains('papershade-target-img')) {
          img.classList.add('papershade-target-img');
        }
      });
    });
  }

  // Floating Quick Toggle Button
  function createFloatingButton() {
    if (floatingBtn || !document.body || !currentSettings.showFloatingButton) return;

    // Only inject on paper pages
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
      floatingBtn.classList.add('active');
      floatingBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `;
      floatingBtn.title = 'Switch to Original Paper (Alt+I)';
    } else {
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
      // Notify background service worker to update badge
      chrome.runtime.sendMessage({
        action: 'STATE_CHANGED',
        enabled: currentSettings.enabled
      });
    } catch (err) {
      // Storage might not be accessible if context invalidated
    }

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
      // Migrate old smart-dark mode to mono-bw if user hasn't explicitly customized
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

    // Set up MutationObserver to detect dynamically rendered PDF pages on scroll
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
      return true; // async response
    } else if (message.action === 'GET_STATUS') {
      sendResponse({
        success: true,
        isPaperPage: window.location.pathname.startsWith('/paper/'),
        settings: currentSettings
      });
    }
    return true;
  });

  // Keyboard shortcut listener (Alt+I) inside the webpage context
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'i' || e.key === 'I')) {
      // Check if user is typing in an input or textarea
      const target = e.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      e.preventDefault();
      toggleInversion();
    }
  });

  // Kick off initialization
  init();
})();
