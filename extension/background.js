// ==========================================================
// AI Page Assistant - Background Service Worker
// ==========================================================

// Send a message to content script to toggle the widget when extension icon is clicked
chrome.action.onClicked.addListener(async (tab) => {
  try {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_WIDGET' }).catch(() => {});
  } catch (err) {
    console.error('[AI Assistant] Failed to toggle widget:', err);
  }
});
