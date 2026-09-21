/* One PageView per persistent browser profile/origin and configured pixel ID. */
(function () {
  "use strict";
  if (window.CashLoanPixel) return;
  var pending = null, state = "idle";
  var databaseName = "cashloan-tracking";
  var storeName = "pixelClaims";

  function claim(id) {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error("Persistent storage unavailable")); return; }
      var request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = function () {
        request.result.createObjectStore(storeName);
      };
      request.onerror = function () { reject(request.error); };
      request.onblocked = function () { state = "storage-blocked"; };
      request.onsuccess = function () {
        var db = request.result, won = false;
        db.onversionchange = function () { db.close(); };
        // Read/write transactions on this store serialize across tabs.
        var transaction = db.transaction(storeName, "readwrite");
        var store = transaction.objectStore(storeName);
        var key = "cashloan:unique-user:meta:" + id;
        var lookup = store.get(key);
        lookup.onsuccess = function () {
          if (lookup.result) return;
          var bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          var browserId = Array.from(bytes, function (byte) {
            return byte.toString(16).padStart(2, "0");
          }).join("");
          store.add({ browserId: browserId, claimedAt: Date.now(), event: "PageView" }, key);
          won = true;
        };
        transaction.oncomplete = function () { db.close(); resolve(won); };
        transaction.onabort = function () { db.close(); reject(transaction.error); };
      };
    });
  }

  function send(id, meta) {
    if (!window.fbq) {
      var fbq = window.fbq = function () {
        if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
        else fbq.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = "2.0";
      fbq.queue = [];
      if (!document.querySelector('script[src*="connect.facebook.net/"][src*="fbevents.js"]')) {
        var script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
        script.onerror = function () { state = "unavailable"; };
        document.head.appendChild(script);
      }
    }
    if (!meta.externallyInitialized) window.fbq("init", id);
    window.fbq("trackSingle", id, "PageView");
    state = "queued";
  }

  function pageView() {
    if (pending) return pending;
    var config = window.PIXEL_CONFIG;
    if (!config || !config.enabled) { state = "disabled"; return Promise.resolve(); }
    var meta = config.meta || {};
    var id = String(meta.pixelId || "").trim();
    if (!/^\d+$/.test(id)) { state = "not-configured"; return Promise.resolve(); }
    if (document.prerendering) { state = "prerender"; return Promise.resolve(); }
    state = "checking";
    // Set pending before any external callback; only the committed claim winner sends.
    pending = claim(id).then(function (won) {
      if (!won) { state = "already-recorded"; return; }
      send(id, meta);
    }).catch(function () {
      // Never fall back to per-page firing if storage or the pixel fails.
      state = "unavailable";
    });
    return pending;
  }
  window.CashLoanPixel = { pageView: pageView, getState: function () { return state; } };
  document.addEventListener("prerenderingchange", pageView, { once: true });
  pageView();
})();
