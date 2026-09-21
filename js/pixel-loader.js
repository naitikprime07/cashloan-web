/* One PageView per persistent browser profile/origin and configured pixel ID. */
(function () {
  "use strict";
  if (window.CashLoanPixel) return;
  var pending = null, state = "idle", lastError = null;
  var databaseName = "cashloan-tracking";
  var storeName = "pixelClaims";

  function claim(id, commit) {
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
        var transaction = db.transaction(storeName, commit ? "readwrite" : "readonly");
        var store = transaction.objectStore(storeName);
        var key = "cashloan:unique-user:meta:" + id;
        var lookup = store.get(key);
        lookup.onsuccess = function () {
          if (lookup.result) return;
          if (!commit) { won = true; return; }
          var bytes = new Uint8Array(16);
          crypto.getRandomValues(bytes);
          var browserId = Array.from(bytes, function (byte) {
            return byte.toString(16).padStart(2, "0");
          }).join("");
          store.add({ browserId: browserId, claimedAt: Date.now(), event: "PageView", version: 2 }, key);
          won = true;
        };
        transaction.oncomplete = function () { db.close(); resolve(won); };
        transaction.onabort = function () { db.close(); reject(transaction.error); };
      };
    });
  }

  function loadLibrary() {
    if (window.fbq && typeof window.fbq.callMethod === "function") return Promise.resolve();
    state = "loading";
    return new Promise(function (resolve, reject) {
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
      }
      var script = document.querySelector('script[src*="connect.facebook.net/"][src*="fbevents.js"]');
      var created = !script;
      if (created) {
        script = document.createElement("script");
        script.async = true;
        script.src = "https://connect.facebook.net/en_US/fbevents.js";
      }
      function cleanup() {
        script.removeEventListener("load", loaded);
        script.removeEventListener("error", failed);
      }
      function loaded() {
        cleanup();
        if (typeof window.fbq.callMethod === "function") resolve();
        else reject(new Error("Meta library loaded without an active callMethod"));
      }
      function failed() { cleanup(); reject(new Error("Meta script blocked or failed to load")); }
      script.addEventListener("load", loaded);
      script.addEventListener("error", failed);
      if (created) document.head.appendChild(script);
    });
  }

  function firstVisit(id, meta) {
    return claim(id, false).then(function (eligible) {
      if (!eligible) { state = "already-recorded"; return; }
      return loadLibrary().then(function () {
        // Re-check atomically after asynchronous loading; only one tab may commit.
        return claim(id, true);
      }).then(function (won) {
        if (!won) { state = "already-recorded"; return; }
        if (!meta.externallyInitialized) window.fbq("init", id);
        window.fbq("trackSingle", id, "PageView");
        state = "queued";
      });
    });
  }

  function pageView() {
    if (pending) return pending;
    var config = window.PIXEL_CONFIG;
    if (!config || !config.enabled) { state = "disabled"; return Promise.resolve(); }
    var path = location.pathname.replace(/\/+$/, "");
    if (!Array.isArray(config.allowedPaths) || config.allowedPaths.indexOf(path) === -1) {
      state = "disabled";
      return Promise.resolve();
    }
    var meta = config.meta || {};
    var id = String(meta.pixelId || "").trim();
    if (!/^\d+$/.test(id)) { state = "not-configured"; return Promise.resolve(); }
    if (document.prerendering) { state = "prerender"; return Promise.resolve(); }
    state = "checking";
    // Serialize the whole load/claim/send sequence where Web Locks is available.
    // The final IndexedDB transaction also protects browsers without Web Locks.
    pending = Promise.resolve().then(function () {
      if (navigator.locks && navigator.locks.request) {
        return navigator.locks.request("cashloan:meta:" + id, function () { return firstVisit(id, meta); });
      }
      return firstVisit(id, meta);
    }).catch(function (error) {
      lastError = error && error.message ? error.message : "Pixel initialization failed";
      state = "unavailable";
    });
    return pending;
  }
  window.CashLoanPixel = {
    pageView: pageView,
    getState: function () { return state; },
    getDiagnostics: function () {
      var meta = (window.PIXEL_CONFIG || {}).meta || {};
      var id = String(meta.pixelId || "").trim();
      return claim(id, false).then(function (eligible) {
        return {
          origin: location.origin, pixelId: id, state: state,
          persistentMarkerPresent: !eligible,
          libraryReady: !!(window.fbq && typeof window.fbq.callMethod === "function"),
          lastError: lastError
        };
      }).catch(function (error) {
        return { origin: location.origin, state: state, storageError: error.message, lastError: lastError };
      });
    }
  };
  document.addEventListener("prerenderingchange", pageView, { once: true });
  pageView();
})();
