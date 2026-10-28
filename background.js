const DEFAULT_SETTINGS = { enabled: true };

async function updateBadge(enabled) {
  try {
    await chrome.action.setBadgeText({ text: enabled ? 'ON' : 'OFF' });
    await chrome.action.setBadgeBackgroundColor({ color: enabled ? '#8b5cf6' : '#64748b' });
  } catch (err) {}
}

chrome.runtime.onInstalled.addListener(async () => {
  const settings = await chrome.storage.local.get(DEFAULT_SETTINGS);
  await updateBadge(settings.enabled);
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-invert') {
    const { enabled = true } = await chrome.storage.local.get('enabled');
    const newEnabled = !enabled;
    await chrome.storage.local.set({ enabled: newEnabled });
    await updateBadge(newEnabled);

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          action: 'UPDATE_SETTINGS',
          settings: { enabled: newEnabled }
        });
      } catch (e) {}
    }
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'STATE_CHANGED') {
    updateBadge(msg.enabled);
    sendResponse({ success: true });
  }
  return true;
});
