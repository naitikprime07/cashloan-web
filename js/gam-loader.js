/* The only GPT bootstrap. Placement work belongs to AdManager. */
(function () {
  "use strict";
  if (window.GAM) return;
  var pending = null, state = "idle", error = null, servicesEnabled = false;
  window.googletag = window.googletag || { cmd: [] };
  function init() {
    if (pending) return pending;
    pending = new Promise(function (resolve) {
      if (!window.AdConfig || !AdConfig.enabled) { state = "disabled"; resolve(false); return; }
      state = "loading";
      var settled = false;
      // Diagnostic only: a late callback still initializes the original promise.
      var timer = setTimeout(function () { if (!settled) state = "unconfirmed"; }, 15000);
      function finish(ok, next, reason) {
        if (settled) return;
        settled = true; clearTimeout(timer); state = next; error = reason || null; resolve(ok);
      }
      googletag.cmd.push(function () {
        if (settled) return;
        try {
          googletag.setConfig({ singleRequest: !!AdConfig.settings.singleRequest,
            disableInitialLoad: !!AdConfig.settings.disableInitialLoad });
          finish(true, "ready");
        } catch (e) { finish(false, "failed", e.message); }
      });
      var script = document.querySelector('script[src*="/tag/js/gpt.js"]');
      var created = !script;
      if (created) {
        script = document.createElement("script");
        script.async = true;
        script.crossOrigin = "anonymous";
        script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
      }
      script.addEventListener("error", function () {
        finish(false, "failed", "GPT script blocked or failed to load");
      }, { once: true });
      if (created) document.head.appendChild(script);
    });
    return pending;
  }
  function enableServices() {
    if (servicesEnabled) return;
    googletag.enableServices();
    servicesEnabled = true;
  }
  window.GAM = { init: init, enableServices: enableServices,
    getState: function () { return state; },
    getDiagnostics: function () { return { state: state, error: error, servicesEnabled: servicesEnabled }; } };
})();
