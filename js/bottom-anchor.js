/* Native BOTTOM_ANCHOR is browser-level. Never restyle Google's generated DOM. */
(function () {
  "use strict";
  if (window.BottomAnchor || !window.GAM) return;
  var config = GAM.config, settings = config.settings.bottomAnchor;
  var slot = null, started = false, generation = 0, listener = null;
  function reserve(height) {
    var app = document.querySelector(".app");
    if (!app) return;
    app.classList.toggle("has-bottom-anchor", height > 0);
    app.style.setProperty("--anchor-space", height + "px");
  }
  function init() {
    if (started || !settings.enabled || !config.isValid()) return;
    started = true;
    var current = ++generation;
    GAM.init();
    googletag.cmd.push(function () {
      if (current !== generation) return;
      slot = googletag.defineOutOfPageSlot(config.getAdUnitPath("blogBottomAnchor"),
        googletag.enums.OutOfPageFormat.BOTTOM_ANCHOR);
      if (!slot) {
        console.info("[BottomAnchor] Native anchor unavailable in this browsing context.");
        return;
      }
      slot.addService(googletag.pubads());
      listener = function (event) {
        if (event.slot !== slot) return;
        reserve(event.isEmpty || !settings.reserveBottomSpace ? 0 :
          Math.max(settings.minReservedHeight || 50, event.size ? event.size[1] : 0) + 30);
      };
      googletag.pubads().addEventListener("slotRenderEnded", listener);
      // Register native out-of-page slots with display before any optional refresh.
      googletag.display(slot);
      if (config.settings.disableInitialLoad) googletag.pubads().refresh([slot]);
    });
  }
  function destroy() {
    ++generation;
    var previous = slot, previousListener = listener;
    slot = null; listener = null; started = false;
    reserve(0);
    googletag.cmd.push(function () {
      if (previousListener) googletag.pubads().removeEventListener("slotRenderEnded", previousListener);
      if (previous) googletag.destroySlots([previous]);
    });
  }
  window.BottomAnchor = { init: init, destroy: destroy,
    isInitialized: function () { return started; }, getSlot: function () { return slot; } };
  function ready() { if (document.querySelector('[data-bottom-anchor="true"]')) init(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
