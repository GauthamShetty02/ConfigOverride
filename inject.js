(function() {
    window.updateFeatureFlagsAndPreferences = function(featureFlags, preferences) {
      if (window.__PRELOADED_STATE__ && window.__PRELOADED_STATE__.context) {
        window.__PRELOADED_STATE__.context.featureFlags = featureFlags;
        window.__PRELOADED_STATE__.context.preferences = preferences;
      }
    };
  })();