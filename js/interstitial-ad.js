/* Native GPT interstitial: Google owns presentation, dismissal and link continuation. */
(function () {
  "use strict";
  if (window.InterstitialAd || !window.GAM) return;
  var config = window.GAM_CONFIG, slot = null, started = false, state = "idle";
  function preload() {
    if (started || !config.isValid() || !config.settings.interstitial.enabled) return;
    started = true;
    state = "loading";
    GAM.init();
    googletag.cmd.push(function () {
      slot = googletag.defineOutOfPageSlot(config.getAdUnitPath("interstitial"),
        googletag.enums.OutOfPageFormat.INTERSTITIAL);
      if (!slot) { state = "unsupported"; return; }
      slot.addService(googletag.pubads());
      function rendered(event) {
        if (event.slot !== slot) return;
        state = event.isEmpty ? "empty" : "ready";
        googletag.pubads().removeEventListener("slotRenderEnded", rendered);
      }
      googletag.pubads().addEventListener("slotRenderEnded", rendered);
      googletag.display(slot);
    });
  }
  // Existing callers can preload; ordinary anchors must retain native navigation.
  window.InterstitialAd = {
    preload: preload,
    getState: function () { return state; },
    isReady: function () { return state === "ready"; }
  };
  function ready() {
    if (config.settings.interstitial.preload) preload();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
