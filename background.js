chrome.runtime.onInstalled.addListener(() => {
    console.log('Feature Flag Manager extension installed');
   // Initialize storage with empty objects if not already set
    chrome.storage.local.get(['globalFeatureFlags', 'globalPreferences', 'lastUrl', 'lastUserAgent'], (result) => {
        
      if (!result.globalFeatureFlags) {
        chrome.storage.local.set({ globalFeatureFlags: {} });
      }
      if (!result.globalPreferences) {
        chrome.storage.local.set({ globalPreferences: {} });
      }
      if (!result.globalPreferences) {
        chrome.storage.local.set({ lastUrl: '' });
      }
      if (!result.globalPreferences) {
        chrome.storage.local.set({ lastUserAgent: '' });
      }
    });
  });
  
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Inside background js');
    if (request.action === 'getStorageData') {
      chrome.storage.local.get(['globalFeatureFlags', 'globalPreferences', 'lastUrl', 'lastUserAgent'], (result) => {
        console.log('Inside background js results');
        console.log(result);

        sendResponse(result);
      });
      return true; // Indicates that the response is asynchronous
    } else if (request.action === 'setStorageData') {
      chrome.storage.local.set(request.data, () => {

        sendResponse({ success: true });
      });
      return true; // Indicates that the response is asynchronous
    }
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url) {
      chrome.tabs.sendMessage(tabId, { action: "tabUpdated" });
    }
  });