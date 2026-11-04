/**
 * PaperShade Content Script
 * Inverts question papers into dark mode on papers.codechefvit.com
 * with True Black deep contrast engine.
 */

(() => {
  'use strict';

  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'smart-dark',       // 'smart-dark' | 'pure-invert' | 'sepia-dark'
    blackDepth: 100,          // 50% to 150%, controls scan pre-boost to crush dirty paper to pure black
    contrast: 100,            // 70% to 130%
    brightness: 100,          // 70% to 130%
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

    root.setAttribute('data-papershade-mode', settings.mode || 'smart-dark');

    // True Black engine:
    // Scanned papers have dirty off-white / gray paper backgrounds (around 65%-75% brightness).
    // Boosting brightness & contrast pre-inversion lifts the paper to pure 100% white,
    // so upon inversion it renders as pure pitch #000000 black, not murky gray.
    const depth = typeof settings.blackDepth === 'number' ? settings.blackDepth : 100;
    const scanBoost = 1.6 * (depth / 100);
    const scanContrast = 1.35;

    root.style.setProperty('--papershade-scan-boost', scanBoost.toFixed(3));
    root.style.setProperty('--papershade-scan-contrast', scanContrast.toString());
    root.style.setProperty('--papershade-contrast', ((settings.contrast || 100) / 100).toString());
    root.style.setProperty('--papershade-brightness', ((settings.brightness || 100) / 100).toString());

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
      const modeLabel = currentSettings.mode === 'pure-invert' ? 'Pure Invert' :
                        currentSettings.mode === 'sepia-dark' ? 'Warm Dark' : 'True Black';
      showToast(`Paper Dark Mode (${modeLabel})`, '🌙');
    } else {
      showToast('Original Paper Colors', '☀️');
    }
  }

  // Initialize from chrome.storage
  async function init() {
    try {
      const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
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
