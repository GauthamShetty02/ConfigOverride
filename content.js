let globalFeatureFlags = {};
let globalPreferences = {};
let lastUrl = '';
let lastUserAgent = '';
let apiResponseData = null;
let apiUrl = '';
let apiMethod = 'GET';

function loadFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['globalFeatureFlags', 'globalPreferences','lastUrl','lastUserAgent'], (result) => {
      lastUrl = result.lastUrl || '';
      lastUserAgent = result.lastUserAgent || '';
      currentUrl = window.location.href;
      currentUserAgent = navigator.userAgent;
      
      
      if (currentUrl === lastUrl && currentUserAgent === lastUserAgent) {
        if (result.globalFeatureFlags) {
      
          globalFeatureFlags = result.globalFeatureFlags;
        }
        if (result.globalPreferences) {
          globalPreferences = result.globalPreferences;
        }
      } else {
        chrome.storage.local.remove(['globalFeatureFlags','globalPreferences','lastUrl','lastUserAgent'],function(){
          console.log('Removed from Storage');
         })
      }
      console.log('Loaded from storage:', { globalFeatureFlags, globalPreferences, lastUrl, lastUserAgent });
      resolve();
    });
  });
}

function saveToStorage() {
  const currentUrl = window.location.href;
  const currentUserAgent = navigator.userAgent;
  return new Promise((resolve) => {
    chrome.storage.local.set({ globalFeatureFlags, globalPreferences, lastUrl: currentUrl, lastUserAgent: currentUserAgent }, () => {
      console.log('Saved to storage:', { globalFeatureFlags, globalPreferences, lastUrl: currentUrl, lastUserAgent: currentUserAgent });
      resolve();
    });
  });
}

function extractStateData() {
  return new Promise((resolve) => {
    const checkForPreloadedState = () => {
      if (window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.context) {
        return {
          featureFlags: window.__PRELOADED_STATE__.context.featureFlags || {},
          preferences: window.__PRELOADED_STATE__.context.preferences || {}
        };
      }
      return null;
    };

    const extractFromScript = () => {
      const scripts = document.getElementsByTagName('script');
      for (let script of scripts) {
        if (script.textContent && script.textContent.includes('window.__PRELOADED_STATE__')) {
          const match = script.textContent.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/);
          if (match && match[1]) {
            try {
              const stateObj = JSON.parse(match[1]);
              stateObj.context.featureFlags = {
                ...stateObj.context.featureFlags,
                ...globalFeatureFlags
              };

              stateObj.context.preferences = {
                ...stateObj.context.preferences,
                ...globalPreferences
              };
              // Serialize the updated state back to string
      let newObj = {...stateObj}
     
      let updatedState = JSON.stringify(newObj); // Beautified for readability
      console.log(script.textContent);
      let updatedContent1 = script.textContent.replace(
        /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
        `window.__PRELOADED_STATE__;`
      );
      script.textContent = updatedContent1;
      let updatedContent = script.textContent.replace(
        `window.__PRELOADED_STATE__;`,
        `window.__PRELOADED_STATE__ = ${updatedState};`
      );
      window.__PRELOADED_STATE__ = stateObj;
      console.log(updatedContent);
      script.textContent = updatedContent;
      saveToStorage();
              if (stateObj && stateObj.context) {
                return {
                  featureFlags: stateObj.context.featureFlags || {},
                  preferences: stateObj.context.preferences || {}
                };
              }
            } catch (error) {
              console.error('Error parsing __PRELOADED_STATE__:', error);
            }
          }
        }
      }
      return null;
    };

    const observer = new MutationObserver((mutations, obs) => {
      let stateData = checkForPreloadedState() || extractFromScript();
      if (stateData) {
        obs.disconnect();
        resolve(stateData);
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    // Also check immediately in case the script is already there
    let stateData = checkForPreloadedState() || extractFromScript();
    if (stateData) {
      observer.disconnect();
      resolve(stateData);
    }

    // Set a timeout to resolve with empty objects if nothing is found after 5 seconds
    setTimeout(() => {
      observer.disconnect();
      resolve({ featureFlags: {}, preferences: {} });
    }, 5000);
  });
}

function updatePreloadedState() {
  const script = document.createElement('script');
  script.textContent = `
    if (window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.context) {
      window.__PRELOADED_STATE__.context.featureFlags = ${JSON.stringify(globalFeatureFlags)};
      window.__PRELOADED_STATE__.context.preferences = ${JSON.stringify(globalPreferences)};
    }
  `;
  document.documentElement.appendChild(script);
  script.remove();
}

async function initialize() {
  await loadFromStorage();
  const extractedData = await extractStateData();
  globalFeatureFlags = { ...extractedData.featureFlags, ...globalFeatureFlags };
  globalPreferences = { ...extractedData.preferences, ...globalPreferences };
  updatePreloadedState();
  await saveToStorage();
  console.log('Initialization complete:', { globalFeatureFlags, globalPreferences });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getData") {
      sendResponse({
          featureFlags: globalFeatureFlags,
          preferences: globalPreferences,
          apiResponse: apiResponseData
      });
  } else if (request.action === "updateFeatureFlag") {
      globalFeatureFlags[request.flagName] = request.value;
      updatePreloadedState();
      saveToStorage();
      sendResponse({ success: true });
  } else if (request.action === "updatePreference") {
      globalPreferences[request.prefName] = request.value;
      updatePreloadedState();
      saveToStorage();
      sendResponse({ success: true });
  } else if (request.action === "fetchApiResponse") {
      fetch(request.url, { method: request.method })
          .then(response => response.json())
          .then(data => {
              apiResponseData = data;
              sendResponse({ data: data });
          })
          .catch(error => {
              console.error('Error:', error);
              sendResponse({ error: error.toString() });
          });
      return true; // Indicates that the response is asynchronous
  } else if (request.action === "updateApiResponse") {
      apiResponseData = request.data;
      // Here you would typically update your application state or trigger a re-render
      // For this example, we'll just store it in a global variable
      window.__API_RESPONSE__ = request.data;
      sendResponse({ success: true });
  }
  return true;
});

// Initialize as soon as the content script runs
initialize();

// Re-initialize on page load to catch any dynamic changes
window.addEventListener('load', initialize);

console.log("Feature Flag and Preferences Manager content script loaded");