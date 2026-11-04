/**
 * PaperShade Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'smart-dark',
    blackDepth: 100,
    contrast: 100,
    brightness: 100,
    showFloatingButton: true
  };

  // DOM Elements
  const enabledToggle = document.getElementById('enabledToggle');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const blackDepthSlider = document.getElementById('blackDepthSlider');
  const blackDepthVal = document.getElementById('blackDepthVal');
  const contrastSlider = document.getElementById('contrastSlider');
  const contrastVal = document.getElementById('contrastVal');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessVal = document.getElementById('brightnessVal');
  const resetAdjustments = document.getElementById('resetAdjustments');
  const floatingBtnToggle = document.getElementById('floatingBtnToggle');

  // Load Settings
  let settings = { ...DEFAULT_SETTINGS };
  try {
    const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
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

    const depth = typeof settings.blackDepth === 'number' ? settings.blackDepth : 100;
    blackDepthSlider.value = depth;
    blackDepthVal.textContent = `${depth}%`;

    contrastSlider.value = settings.contrast || 100;
    contrastVal.textContent = `${settings.contrast || 100}%`;

    brightnessSlider.value = settings.brightness || 100;
    brightnessVal.textContent = `${settings.brightness || 100}%`;

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

  brightnessSlider.addEventListener('input', () => {
    settings.brightness = parseInt(brightnessSlider.value, 10);
    brightnessVal.textContent = `${settings.brightness}%`;
    saveAndBroadcast();
  });

  resetAdjustments.addEventListener('click', () => {
    settings.blackDepth = DEFAULT_SETTINGS.blackDepth;
    settings.contrast = DEFAULT_SETTINGS.contrast;
    settings.brightness = DEFAULT_SETTINGS.brightness;
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
