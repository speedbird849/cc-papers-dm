document.addEventListener('DOMContentLoaded', async () => {
  const toggle = document.getElementById('enabledToggle');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  const { enabled = true } = await chrome.storage.local.get({ enabled: true });
  toggle.checked = enabled;

  function updateStatus(val) {
    if (val) {
      statusDot.style.background = '#10b981';
      statusText.textContent = 'Active';
    } else {
      statusDot.style.background = '#64748b';
      statusText.textContent = 'Off';
    }
  }
  updateStatus(enabled);

  toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    await chrome.storage.local.set({ enabled: isEnabled });
    updateStatus(isEnabled);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'UPDATE_SETTINGS',
          settings: { enabled: isEnabled }
        });
      } catch (e) {}
    }
  });
});
