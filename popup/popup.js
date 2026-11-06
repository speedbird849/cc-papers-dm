/**
 * PaperShade Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'mono-bw',
    blackDepth: 110,
    textBrightness: 120,
    contrast: 110,
    showFloatingButton: true
  };

  // DOM Elements
  const enabledToggle = document.getElementById('enabledToggle');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const textBrightnessSlider = document.getElementById('textBrightnessSlider');
  const textBrightnessVal = document.getElementById('textBrightnessVal');
  const blackDepthSlider = document.getElementById('blackDepthSlider');
  const blackDepthVal = document.getElementById('blackDepthVal');
  const contrastSlider = document.getElementById('contrastSlider');
  const contrastVal = document.getElementById('contrastVal');
  const resetAdjustments = document.getElementById('resetAdjustments');
  const floatingBtnToggle = document.getElementById('floatingBtnToggle');

  // Load Settings
  let settings = { ...DEFAULT_SETTINGS };
  try {
    const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
    if (saved.mode === 'smart-dark' || saved.mode === 'pure-invert') {
      saved.mode = 'mono-bw';
    }
    settings = { ...DEFAULT_SETTINGS, ...saved };
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

  // Update UI Elements
  function renderUI() {
    enabledToggle.checked = settings.enabled;

    if (settings.enabled) {
      statusDot.classList.remove('disabled');
      statusText.textContent = 'Active';
      statusText.style.color = '#10b981';
    } else {
      statusDot.classList.add('disabled');
      statusText.textContent = 'Off';
      statusText.style.color = '#94a3b8';
    }

    modeButtons.forEach((btn) => {
      const mode = btn.dataset.mode;
      if (mode === settings.mode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const textBright = typeof settings.textBrightness === 'number' ? settings.textBrightness : 120;
    textBrightnessSlider.value = textBright;
    textBrightnessVal.textContent = `${textBright}%`;

    const depth = typeof settings.blackDepth === 'number' ? settings.blackDepth : 110;
    blackDepthSlider.value = depth;
    blackDepthVal.textContent = `${depth}%`;

    const contrast = typeof settings.contrast === 'number' ? settings.contrast : 110;
    contrastSlider.value = contrast;
    contrastVal.textContent = `${contrast}%`;

    floatingBtnToggle.checked = settings.showFloatingButton !== false;
  }

  // Save Settings & Broadcast to Active Tab
  async function saveAndBroadcast() {
    try {
      await chrome.storage.local.set(settings);

      // Broadcast to background service worker for badge
      chrome.runtime.sendMessage({
        action: 'STATE_CHANGED',
        enabled: settings.enabled
      });

      // Broadcast to active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'UPDATE_SETTINGS',
            settings
          });
        } catch {
          // Tab might not have content script loaded
        }
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  }

  // Event Listeners
  enabledToggle.addEventListener('change', () => {
    settings.enabled = enabledToggle.checked;
    renderUI();
    saveAndBroadcast();
  });

  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      settings.mode = btn.dataset.mode;
      renderUI();
      saveAndBroadcast();
    });
  });

  textBrightnessSlider.addEventListener('input', () => {
    settings.textBrightness = parseInt(textBrightnessSlider.value, 10);
    textBrightnessVal.textContent = `${settings.textBrightness}%`;
    saveAndBroadcast();
  });

  blackDepthSlider.addEventListener('input', () => {
    settings.blackDepth = parseInt(blackDepthSlider.value, 10);
    blackDepthVal.textContent = `${settings.blackDepth}%`;
    saveAndBroadcast();
  });

  contrastSlider.addEventListener('input', () => {
    settings.contrast = parseInt(contrastSlider.value, 10);
    contrastVal.textContent = `${settings.contrast}%`;
    saveAndBroadcast();
  });

  resetAdjustments.addEventListener('click', () => {
    settings.textBrightness = DEFAULT_SETTINGS.textBrightness;
    settings.blackDepth = DEFAULT_SETTINGS.blackDepth;
    settings.contrast = DEFAULT_SETTINGS.contrast;
    renderUI();
    saveAndBroadcast();
  });

  floatingBtnToggle.addEventListener('change', () => {
    settings.showFloatingButton = floatingBtnToggle.checked;
    saveAndBroadcast();
  });

  // Initial Render
  renderUI();
});
