/**
 * PaperShade Background Service Worker
 * Manages extension state, commands (Alt+I), and badge status.
 */

const DEFAULT_SETTINGS = {
  enabled: true,
  mode: 'smart-dark',
  blackDepth: 100,
  contrast: 100,
  brightness: 100,
  showFloatingButton: true
};

// Update action badge text and background
async function updateBadge(enabled) {
  try {
    if (enabled) {
      await chrome.action.setBadgeText({ text: 'ON' });
      await chrome.action.setBadgeBackgroundColor({ color: '#8b5cf6' }); // Purple
    } else {
      await chrome.action.setBadgeText({ text: 'OFF' });
      await chrome.action.setBadgeBackgroundColor({ color: '#64748b' }); // Slate
    }
  } catch (err) {
    console.error('Failed to update badge:', err);
  }
}

// On extension installed or updated
chrome.runtime.onInstalled.addListener(async () => {
  try {
    const existing = await chrome.storage.local.get(null);
    const initialSettings = { ...DEFAULT_SETTINGS, ...existing };
    await chrome.storage.local.set(initialSettings);
    await updateBadge(initialSettings.enabled);
  } catch (err) {
    console.error('Initialization error:', err);
  }
});

// Handle keyboard shortcut command (Alt+I)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-invert') {
    try {
      const { enabled = true } = await chrome.storage.local.get('enabled');
      const newEnabled = !enabled;
      await chrome.storage.local.set({ enabled: newEnabled });
      await updateBadge(newEnabled);

      // Notify the active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        try {
          await chrome.tabs.sendMessage(tab.id, {
            action: 'UPDATE_SETTINGS',
            settings: { enabled: newEnabled }
          });
        } catch {
          // Tab might not have content script loaded
        }
      }
    } catch (err) {
      console.error('Command toggle error:', err);
    }
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'STATE_CHANGED') {
    updateBadge(message.enabled);
    sendResponse({ success: true });
  }
  return true;
});
