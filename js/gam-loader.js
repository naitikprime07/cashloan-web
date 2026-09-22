/* The only GPT bootstrap. All placement work belongs to AdManager. */
(function () {
  "use strict";
  if (window.GAM) return;
  var pending = null, state = "idle";
  window.googletag = window.googletag || { cmd: [] };
  function init() {
    if (pending) return pending;
    pending = new Promise(function (resolve) {
      if (!window.AdConfig || !AdConfig.enabled) { state = "disabled"; resolve(false); return; }
      state = "loading";
      var settled = false;
      var timer = setTimeout(function () { finish(false, "timeout"); }, 15000);
      function finish(ok, next) {
        if (settled) return;
        settled = true; clearTimeout(timer); state = next; resolve(ok);
      }
      googletag.cmd.push(function () {
        if (settled) return;
        try {
          googletag.setConfig({ singleRequest: !!AdConfig.settings.singleRequest,
            disableInitialLoad: !!AdConfig.settings.disableInitialLoad });
          googletag.enableServices();
          finish(true, "ready");
        } catch (e) { finish(false, "failed"); }
      });
      if (!document.querySelector('script[src*="/tag/js/gpt.js"]')) {
        var script = document.createElement("script");
        script.async = true;
        script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
        script.onerror = function () { finish(false, "failed"); };
        document.head.appendChild(script);
      }
    });
    return pending;
  }
  window.GAM = { init: init, getState: function () { return state; } };
})();
