document.addEventListener('DOMContentLoaded', async () => {
  const DEFAULT_SETTINGS = {
    enabled: true,
    mode: 'smart-dark',
    contrast: 95,
    brightness: 100,
    showFloatingButton: true
  };

  const enabledToggle = document.getElementById('enabledToggle');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const modeButtons = document.querySelectorAll('.mode-btn');
  const contrastSlider = document.getElementById('contrastSlider');
  const contrastVal = document.getElementById('contrastVal');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const brightnessVal = document.getElementById('brightnessVal');
  const resetAdjustments = document.getElementById('resetAdjustments');
  const floatingBtnToggle = document.getElementById('floatingBtnToggle');

  let settings = { ...DEFAULT_SETTINGS };
  try {
    const saved = await chrome.storage.local.get(DEFAULT_SETTINGS);
    settings = { ...DEFAULT_SETTINGS, ...saved };
  } catch (err) {
    console.error('Failed to load settings:', err);
  }

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

    contrastSlider.value = settings.contrast;
    contrastVal.textContent = `${settings.contrast}%`;

    brightnessSlider.value = settings.brightness;
    brightnessVal.textContent = `${settings.brightness}%`;

    floatingBtnToggle.checked = settings.showFloatingButton;
  }

  async function saveAndBroadcast() {
    try {
      await chrome.storage.local.set(settings);

      chrome.runtime.sendMessage({
        action: 'STATE_CHANGED',
        enabled: settings.enabled
      });

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'UPDATE_SETTINGS',
            settings
          });
        } catch {}
      }
    } catch (err) {
      console.error('Save error:', err);
    }
  }

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
    settings.contrast = DEFAULT_SETTINGS.contrast;
    settings.brightness = DEFAULT_SETTINGS.brightness;
    renderUI();
    saveAndBroadcast();
  });

  floatingBtnToggle.addEventListener('change', () => {
    settings.showFloatingButton = floatingBtnToggle.checked;
    saveAndBroadcast();
  });

  renderUI();
});
