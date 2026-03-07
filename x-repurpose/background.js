// Service worker — handles messages between popup and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward progress updates from content script to popup (if open)
  if (message.action === 'scrapeProgress') {
    // This is already handled directly via runtime.sendMessage in content.js
    // Background is here for future extensibility (e.g., badge updates)
    chrome.action.setBadgeText({ text: `${message.found}` });
    chrome.action.setBadgeBackgroundColor({ color: '#1d9bf0' });
  }
  return false;
});
// Clear badge when extension icon clicked
chrome.action.onClicked.addListener(() => {
  chrome.action.setBadgeText({ text: '' });
});