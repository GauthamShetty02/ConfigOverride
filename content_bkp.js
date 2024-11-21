let globalFeatureFlags = {};
let globalPreferences = {};

function loadFromStorage() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getStorageData' }, (result) => {
        if (result.globalFeatureFlags) {
          globalFeatureFlags = result.globalFeatureFlags;
        }
        if (result.globalPreferences) {
          globalPreferences = result.globalPreferences;
        }
        console.log('Loaded from storage:', { globalFeatureFlags, globalPreferences });
        resolve();
      });
    });
  }
  

function updatePreloadedState(script) {
  const stateRegex = /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/;
  //const stateRegex = /window\.__PRELOADED_STATE__\s*=\s*(\{[\s\S]*?\});/;
  
  const match = script.textContent.match(stateRegex);
  if (match) {
    try {
      let stateObj = JSON.parse(match[1]);

     // Ensure structure exists
    stateObj.context = stateObj.context || {};
    stateObj.context.featureFlags = stateObj.context.featureFlags || {};

      stateObj.context.featureFlags = {
        ...stateObj.context.featureFlags,
        ...globalFeatureFlags
      };

      // Serialize the updated state back to string
      let newObj = {...stateObj}
      console.log(JSON.stringify(newObj));
      let updatedState = JSON.stringify(newObj); // Beautified for readability
      console.log(script.textContent);
      let updatedContent1 = script.textContent.replace(
        stateRegex,
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
      console.log('Feature flags updated in __PRELOADED_STATE__');
    } catch (error) {
      console.error('Error updating __PRELOADED_STATE__:', error);
    }
  }
}

function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    for (let mutation of mutations) {
      if (mutation.type === 'childList') {
        for (let node of mutation.addedNodes) {
          if (node.nodeName === 'SCRIPT' && node.textContent.includes('window.__PRELOADED_STATE__')) {
            updatePreloadedState(node);
            observer.disconnect();
            return;
          }
        }
      }
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}

function extractFeatureFlags() {
  if (window.__PRELOADED_STATE__ && 
      window.__PRELOADED_STATE__.context && 
      window.__PRELOADED_STATE__.context.featureFlags) {
    return window.__PRELOADED_STATE__.context.featureFlags;
  }
  
  const scripts = document.getElementsByTagName('script');
  for (let script of scripts) {
    if (script.textContent.includes('window.__PRELOADED_STATE__')) {
      const match = script.textContent.match(/window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/);
      if (match && match[1]) {
        try {
          const preloadedState = JSON.parse(match[1]);
          if (preloadedState.context && preloadedState.context.featureFlags) {
            return preloadedState.context.featureFlags;
          }
        } catch (error) {
          console.error('Error parsing __PRELOADED_STATE__:', error);
        }
      }
    }
  }
  
  return null;
}

function updateFeatureFlags(flags) {
  globalFeatureFlags = { ...globalFeatureFlags, ...flags };
  const scripts = document.getElementsByTagName('script');
  for (let script of scripts) {
    if (script.textContent.includes('window.__PRELOADED_STATE__')) {
      updatePreloadedState(script);
      break;
    }
  }
  saveToStorage();
}

function saveToStorage() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ 
        action: 'setStorageData', 
        data: { globalFeatureFlags, globalPreferences }
      }, () => {
        console.log('Saved to storage:', { globalFeatureFlags, globalPreferences });
        resolve();
      });
    });
  }

// Execute this immediately
loadFromStorage().then(() => {
  if (Object.keys(globalFeatureFlags).length > 0) {
    observeDOM();
  }
});

cchrome.runtime.sendMessage({ action: 'getStorageData' }, (result) => {
    if (result.globalFeatureFlags) globalFeatureFlags = result.globalFeatureFlags;
    if (result.globalPreferences) globalPreferences = result.globalPreferences;
    console.log('Loaded initial data from storage:', { globalFeatureFlags, globalPreferences });
  });
  
  console.log('Content script loaded and MutationObserver set up');