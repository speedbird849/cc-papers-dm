(() => {
  'use strict';
  let isEnabled = true;

  function applySettings(enabled) {
    isEnabled = enabled;
    if (enabled) {
      document.documentElement.setAttribute('data-papershade-enabled', 'true');
      document.documentElement.classList.add('papershade-active');
    } else {
      document.documentElement.setAttribute('data-papershade-enabled', 'false');
      document.documentElement.classList.remove('papershade-active');
    }
    tagPaperImages();
  }

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

  async function init() {
    try {
      const data = await chrome.storage.local.get({ enabled: true });
      applySettings(data.enabled);
    } catch (e) {
      applySettings(true);
    }
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'UPDATE_SETTINGS') {
      applySettings(msg.settings.enabled);
      sendResponse({ success: true });
    }
    return true;
  });

  init();

  const observer = new MutationObserver(() => tagPaperImages());
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
