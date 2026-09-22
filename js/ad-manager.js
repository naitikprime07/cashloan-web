/* One page-scoped registry for display, native interstitial and native anchor. */
(function () {
  "use strict";
  if (window.AdManager || !window.AdConfig || !window.GAM) return;
  var config = AdConfig, page = config.getPageKey(), plan = config.getPageAdConfig(page);
  var records = new Map(), listeners = [], initialized = false, destroyed = false;
  var lastClick = -Infinity, events = [], lastTrigger = null, interstitialId = null;
  // Display states that end with no creative hand the reserved space back.
  var EMPTY_STATES = ["no-fill", "rejected-size", "unsupported-size", "unsupported", "disabled", "failed"];
  function log(message, id, detail) {
    events.push({ event: message, id: id || null, detail: detail || null, at: Date.now() });
    if (events.length > 80) events.shift();
    if (config.debug) console.info((id && id.indexOf("interstitial") === 0 ? "[INTERSTITIAL] " : id && id.indexOf("display") === 0 ? "[DISPLAY] " : "[ADS] ") + message, id || "", detail || "");
  }
  function state(record, next) {
    // Late render/viewability callbacks must not re-arm a consumed native slot.
    if (record.kind === "interstitial" && record.state === "consumed" &&
        next !== "destroyed") { log("consumed callback ignored", record.id); return; }
    record.state = next; log(next, record.id);
    if (next !== "loading") clearTimeout(record.timer);
    // Only blog-top placements give the space back; the five loan-flow pages
    // keep their reserved box above the Next button when no ad renders.
    if (record.kind === "display" && EMPTY_STATES.indexOf(next) !== -1) collapseWrapper(record);
  }
  function collapseWrapper(record) {
    var wrapper = record.element && record.element.closest(".blog-top-ad-container");
    if (wrapper) wrapper.classList.add("ad-empty");
  }
  function reserveAnchor(height) {
    var app = document.querySelector(".app");
    if (!app) return;
    app.classList.toggle("has-bottom-anchor", height > 0);
    app.style.setProperty("--anchor-space", height + "px");
  }
  function add(id, kind, definition, element) {
    if (records.has(id)) { log("duplicate prevented", id); return; }
    records.set(id, { id: id, kind: kind, config: definition, element: element,
      slot: null, state: "queued", displayed: false, requestCount: 0 });
  }
  function sizes(record) {
    var wrapper = record.element.parentElement;
    var style = getComputedStyle(wrapper);
    var width = wrapper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    var configured = record.config.sizes;
    if (!Array.isArray(configured) || !configured.length || !configured.every(function (size) {
      return size === "fluid" || (Array.isArray(size) && size.length === 2 && size.every(function (value) {
        return Number.isFinite(value) && value > 0;
      }));
    })) throw new Error("Invalid display sizes: expected fluid or [[width, height], ...]");
    // "fluid" always stays eligible: the creative adapts to the container width.
    return configured.filter(function (size) { return size === "fluid" || size[0] <= Math.floor(width); });
  }
  function destroyRecord(record) {
    clearTimeout(record.timer);
    if (record.observer) record.observer.disconnect();
    if (record.resizeObserver) record.resizeObserver.disconnect();
    if (record.slot) googletag.destroySlots([record.slot]);
    record.slot = null;
    if (record.kind === "anchor") reserveAnchor(0);
    state(record, "destroyed");
  }
  function reject(record) {
    if (!record.slot) return;
    destroyRecord(record);
    record.element.replaceChildren();
    state(record, "rejected-size");
  }
  function checkSize(record) {
    if (!record.slot || !record.element.isConnected) return;
    var bounds = record.element.getBoundingClientRect();
    var nodes = record.element.querySelectorAll("iframe, div");
    for (var i = 0; i < nodes.length; i++) {
      if (record.resizeObserver) record.resizeObserver.observe(nodes[i]);
      var r = nodes[i].getBoundingClientRect();
      if (r.width && r.height && (r.left < bounds.left - 1 || r.right > bounds.right + 1 ||
          r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1)) { reject(record); return; }
    }
  }
  function define(record) {
    try {
      if (record.config.enabled === false) { state(record, "disabled"); return; }
      log("slot:create", record.id, { page: page, adUnit: record.config.adUnit });
      if (record.kind === "display") {
        record.sizes = sizes(record);
        if (!record.sizes.length) { state(record, "unsupported-size"); return; }
        record.slot = googletag.defineSlot(record.config.adUnit, record.sizes, record.element.id);
        if (!record.slot && record.sizes.indexOf("fluid") !== -1) {
          // GPT refused the fluid request; keep serving the fixed sizes instead.
          record.sizes = record.sizes.filter(function (size) { return size !== "fluid"; });
          if (record.sizes.length) record.slot = googletag.defineSlot(record.config.adUnit, record.sizes, record.element.id);
        }
        if (record.slot) {
          record.slot.defineSizeMapping(googletag.sizeMapping().addSize([0, 0], record.sizes).build());
          record.slot.setConfig({ collapseDiv: "DISABLED", safeFrame: {
            forceSafeFrame: true, allowOverlayExpansion: false, allowPushExpansion: false } });
          record.observer = new MutationObserver(function () { checkSize(record); });
          record.observer.observe(record.element, { childList: true, subtree: true, attributes: true });
          if (window.ResizeObserver) {
            record.resizeObserver = new ResizeObserver(function () {
              // Never keep a creative wider than the available responsive container.
              if (record.slot && record.element.clientWidth < (record.renderedWidth || 0)) reject(record);
              else checkSize(record);
            });
            record.resizeObserver.observe(record.element);
          }
        }
      } else {
        record.slot = googletag.defineOutOfPageSlot(record.config.adUnit,
          googletag.enums.OutOfPageFormat[record.kind === "anchor" ? "BOTTOM_ANCHOR" : "INTERSTITIAL"]);
      }
      if (!record.slot) { log("slot:null", record.id); state(record, "unsupported"); return; }
      record.slot.addService(googletag.pubads());
      state(record, "defined");
    } catch (e) { if (record.slot) destroyRecord(record); state(record, "failed"); log(e.message, record.id); }
  }
  function listen(name, handler) {
    googletag.pubads().addEventListener(name, handler);
    listeners.push([name, handler]);
  }
  function find(slot) { return Array.from(records.values()).find(function (r) { return r.slot === slot; }); }
  function init() {
    if (initialized || destroyed) return;
    initialized = true;
    plan.display.forEach(function (id) {
      var elements = document.querySelectorAll('[data-ad-logical="' + id + '"]');
      if (elements.length !== 1 || !elements[0].id) { log("missing or duplicate container", id); return; }
      var definition = config.getDisplayConfig(id);
      if (!definition || definition.page !== page) { log("invalid display page config", id); return; }
      add(id, "display", definition, elements[0]);
    });
    if (plan.interstitial.length) {
      var definition = config.getInterstitialConfig(plan.interstitial[0]);
      if (!definition || !plan.interstitial.every(function (id) { var item = config.getInterstitialConfig(id); return item && item.logicalId === id && item.type === "interstitial" && item.page === page && typeof item.adUnit === "string" && /^\/\d+\/[^\s]+$/.test(item.adUnit) && item.adUnit === definition.adUnit; })) {
        log("incompatible interstitial paths on one page");
      } else {
        interstitialId = plan.interstitial.length === 1 ? definition.logicalId : "interstitial:" + page;
        add(interstitialId, "interstitial", definition);
        log("preload:start", interstitialId, { page: page, adUnit: definition.adUnit });
      }
    }
    plan.anchor.forEach(function (id) { add(id + ":" + page, "anchor", config.getAnchorConfig(id)); });
    log("page preload", page);
    GAM.init().then(function (ready) {
      if (destroyed) return;
      if (!ready) { records.forEach(function (r) { state(r, GAM.getState()); }); return; }
      log("GPT ready");
      listen("slotRequested", function (e) { var r = find(e.slot); if (r) { r.requestCount++; log("request", r.id); } });
      listen("slotRenderEnded", function (e) {
        var r = find(e.slot); if (!r) return;
        log("renderEnded", r.id, { isEmpty: e.isEmpty, size: e.size });
        if (r.kind === "display" && !e.isEmpty && Array.isArray(e.size) &&
            !r.sizes.some(function (s) { return Array.isArray(s) && s[0] === e.size[0] && s[1] === e.size[1]; })) { reject(r); return; }
        if (r.kind === "display" && Array.isArray(e.size)) r.renderedWidth = e.size[0];
        state(r, e.isEmpty ? "no-fill" : "ready");
        if (r.kind === "anchor") reserveAnchor(e.isEmpty ? 0 : Math.max(50, (e.size || [0, 50])[1]) + 30);
        if (r.kind === "display") checkSize(r);
      });
      listen("impressionViewable", function (e) {
        var r = find(e.slot); if (r) state(r, r.kind === "interstitial" ? "consumed" : "viewable");
      });
      // Define every relevant slot before the first SRA request.
      records.forEach(define);
      records.forEach(function (r) {
        if (!r.slot || r.displayed) return;
        r.displayed = true; state(r, "loading");
        r.timer = setTimeout(function () { if (r.state === "loading") state(r, "unconfirmed"); }, 30000);
        try { log("display", r.id); googletag.display(r.slot); }
        catch (e) { destroyRecord(r); state(r, "failed"); }
      });
      if (config.settings.disableInitialLoad) {
        var slots = Array.from(records.values()).filter(function (r) { return r.slot && r.displayed; }).map(function (r) { return r.slot; });
        if (slots.length) googletag.pubads().refresh(slots);
      }
    });
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    records.forEach(function (r) { if (r.slot) destroyRecord(r); else { clearTimeout(r.timer); state(r, "destroyed"); } });
    listeners.forEach(function (pair) { googletag.pubads().removeEventListener(pair[0], pair[1]); });
    listeners = [];
  }
  function onClick(e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey ||
        (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    var id = a.getAttribute("data-interstitial-trigger");
    if (!id || plan.interstitial.indexOf(id) === -1 || a.getAttribute("aria-disabled") === "true" ||
        a.closest('[data-google-interstitial="false"]')) return;
    if (performance.now() - lastClick < 800) { e.preventDefault(); e.stopImmediatePropagation(); log("duplicate gesture", id); return; }
    lastClick = performance.now(); lastTrigger = id;
    var record = records.get(interstitialId);
    var targetPage = new URL(a.href, location.href).pathname;
    log("click", id, { page: page, targetPage: targetPage,
      adUnit: record ? record.config.adUnit : null,
      state: record ? record.state : "unavailable" });
    log(record && record.state === "ready" ? "native trigger" : "fallback", id);
    // Preserve the trusted anchor gesture. Native GPT owns show/close/navigation.
  }
  document.addEventListener("click", onClick, true);
  window.addEventListener("pageshow", function () { lastClick = -Infinity; });
  window.addEventListener("pagehide", function (e) { log("pagehide", lastTrigger, { persisted: e.persisted }); if (!e.persisted) destroy(); });
  window.AdManager = {
    init: init, destroy: destroy,
    getDiagnostics: function () { return { page: page, gpt: GAM.getState(), lastTrigger: lastTrigger,
      slots: Array.from(records.values()).map(function (r) { return { id: r.id, kind: r.kind, state: r.state,
        adUnit: r.config.adUnit, sizes: r.sizes, displayed: r.displayed, requestCount: r.requestCount }; }), events: events.slice() }; }
  };
  GAM.init(); // Fetch GPT while the remaining document finishes parsing.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
