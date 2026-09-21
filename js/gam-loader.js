/* Shared GPT loader. Display geometry belongs to publisher wrappers only. */
(function () {
  "use strict";
  if (window.GAM || !window.GAM_CONFIG) return;
  var config = window.GAM_CONFIG;
  var records = Object.create(null);
  var initialized = false;
  var servicesEnabled = false;
  window.googletag = window.googletag || { cmd: [] };

  function initGPT() {
    if (initialized || !config.isValid()) return;
    initialized = true; // Guard before enqueueing, including slow/blocked GPT.
    googletag.cmd.push(configureServices);
  }

  function configureServices() {
    if (servicesEnabled) return;
    servicesEnabled = true;
    var pubads = googletag.pubads();
    var settings = config.settings;
    var pageConfig = {
      singleRequest: !!settings.singleRequest,
      collapseDiv: settings.collapseEmptyDivs ? "ON_NO_FILL" : "DISABLED",
      disableInitialLoad: !!settings.disableInitialLoad,
      targeting: config.targeting || {}
    };
    if (settings.lazyLoad.enabled) {
      pageConfig.lazyLoad = {
        fetchMarginPercent: settings.lazyLoad.fetchMarginPercent,
        renderMarginPercent: settings.lazyLoad.renderMarginPercent,
        mobileScaling: settings.lazyLoad.mobileScaling
      };
    }
    googletag.setConfig(pageConfig);
    pubads.addEventListener("slotRenderEnded", function (event) {
      Object.keys(records).forEach(function (id) {
        var record = records[id];
        if (record.slot !== event.slot || event.isEmpty) return;
        if (Array.isArray(event.size) &&
            !record.sizes.some(function (size) { return size[0] === event.size[0] && size[1] === event.size[1]; })) {
          rejectCreative(record, { reason: "unrequested-size", returnedSize: event.size });
        } else {
          checkCreative(record);
        }
      });
    });
    googletag.enableServices();
  }

  // Reject the entire incompatible creative, never scale or crop it.
  // Observe only our display slots; native anchor/interstitial DOM is untouched.
  function rejectCreative(record, details) {
    if (record.rejected) return;
    record.rejected = true;
    if (record.observer) record.observer.disconnect();
    if (record.sizeObserver) record.sizeObserver.disconnect();
    if (record.slot) googletag.destroySlots([record.slot]);
    record.slot = null;
    record.element.replaceChildren();
    console.warn("[GAM] Oversized display creative rejected:", {
      id: record.id, placement: record.placement,
      adUnitPath: config.getAdUnitPath(record.placement),
      requestedSizes: record.sizes,
      reservedSize: [record.element.clientWidth, record.element.clientHeight],
      details: details || { reason: "rendered-content-outside-slot" }
    });
  }

  function checkCreative(record) {
    if (record.rejected || !record.element.isConnected) return;
    var bounds = record.element.getBoundingClientRect();
    var wrapper = record.element.parentElement.getBoundingClientRect();
    if (bounds.left < wrapper.left - 1 || bounds.right > wrapper.right + 1 ||
        bounds.top < wrapper.top - 1 || bounds.bottom > wrapper.bottom + 1) {
      rejectCreative(record);
      return;
    }
    var children = record.element.querySelectorAll("iframe, div");
    for (var i = 0; i < children.length; i++) {
      if (record.sizeObserver) record.sizeObserver.observe(children[i]);
      var rect = children[i].getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 ||
          rect.top < bounds.top - 1 || rect.bottom > bounds.bottom + 1) {
        rejectCreative(record);
        return;
      }
    }
  }

  function sizesFor(record) {
    var wrapper = record.element.parentElement;
    // The publisher wrapper always retains its CSS-reserved footprint.
    var style = getComputedStyle(wrapper);
    var width = wrapper.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    return config.getResponsiveSizes(record.placement, width);
  }

  function define(record) {
    configureServices();
    if (records[record.id] !== record || record.rejected || !record.element.isConnected) return;
    var sizes = sizesFor(record);
    record.signature = JSON.stringify(sizes);
    record.sizes = sizes;
    if (!sizes.length) return;
    record.slot = googletag.defineSlot(config.getAdUnitPath(record.placement), sizes, record.id);
    if (!record.slot) return;
    // Keep display slots stable without changing native out-of-page behavior.
    record.slot.setConfig({
      collapseDiv: "DISABLED",
      safeFrame: { forceSafeFrame: true, allowOverlayExpansion: false, allowPushExpansion: false }
    });
    // GPT breakpoints use browser width, not container width. The [0,0]
    // mapping is deliberately restricted to measured, container-safe sizes.
    record.slot.defineSizeMapping(googletag.sizeMapping().addSize([0, 0], sizes).build());
    record.slot.addService(googletag.pubads());
    record.slot.setConfig({ targeting: record.targeting });
  }

  function createSlot(id, placement, options) {
    if (!config.isValid() || !config.sizes[placement]) return null;
    if (records[id]) return records[id].slot;
    var elements = Array.from(document.querySelectorAll("[id]")).filter(function (el) { return el.id === id; });
    var el = elements[0];
    if (elements.length !== 1 || !el.closest(".app") ||
        !el.parentElement.matches(".inline-ad-container, .blog-top-ad-container")) {
      console.error("[GAM] Missing, duplicate, or misplaced slot:", id);
      return null;
    }
    var record = records[id] = { id: id, placement: placement, element: el,
      targeting: (options || {}).targeting || {}, slot: null, displayed: false, requested: false };
    record.observer = new MutationObserver(function () { checkCreative(record); });
    record.observer.observe(el, { childList: true, subtree: true, attributes: true });
    if (window.ResizeObserver) {
      record.sizeObserver = new ResizeObserver(function () { checkCreative(record); });
      record.sizeObserver.observe(el);
    }
    initGPT();
    googletag.cmd.push(function () { define(record); });
    return record.slot;
  }

  function displaySlot(id) {
    var record = records[id];
    if (!record || record.requested) return;
    record.requested = true;
    googletag.cmd.push(function () {
      if (records[id] !== record || !record.slot || record.displayed) return;
      record.displayed = true;
      googletag.display(id);
    });
  }

  function destroySlot(id) {
    var record = records[id];
    if (!record) return;
    delete records[id]; // Invalidate pending commands immediately.
    if (record.observer) record.observer.disconnect();
    if (record.sizeObserver) record.sizeObserver.disconnect();
    googletag.cmd.push(function () {
      if (record.slot) googletag.destroySlots([record.slot]);
    });
  }

  function resizeSlots() {
    googletag.cmd.push(function () {
      Object.keys(records).forEach(function (id) {
        var record = records[id];
        if (record.rejected) return;
        if (!record.element.isConnected) { destroySlot(id); return; }
        var sizes = sizesFor(record);
        // Rebuild only when allowed sizes change, never on every resize event.
        if (JSON.stringify(sizes) === record.signature) return;
        if (record.slot) googletag.destroySlots([record.slot]);
        record.slot = null;
        record.displayed = false;
        record.element.replaceChildren();
        define(record);
        if (record.requested && record.slot) {
          record.displayed = true;
          googletag.display(id);
        }
      });
    });
  }

  window.GAM = {
    init: initGPT, createSlot: createSlot, displaySlot: displaySlot, destroySlot: destroySlot,
    destroyAllSlots: function () { Object.keys(records).forEach(destroySlot); },
    refreshSlot: function (id) {
      googletag.cmd.push(function () {
        var record = records[id];
        if (record && record.slot && record.displayed) googletag.pubads().refresh([record.slot]);
      });
    },
    getSlot: function (id) { return records[id] ? records[id].slot : null; },
    getAllSlots: function () { return Object.keys(records); },
    config: config,
    get cmd() { return googletag.cmd; }
  };

  if (config.isValid() && !document.querySelector('script[src*="/tag/js/gpt.js"]')) {
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    script.onerror = function () { console.warn("[GAM] GPT unavailable; navigation remains native."); };
    document.head.appendChild(script);
  }
  function ready() {
    initGPT();
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(resizeSlots);
      document.querySelectorAll(".inline-ad-container, .blog-top-ad-container").forEach(function (el) {
        observer.observe(el);
      });
    }
    window.addEventListener("resize", resizeSlots);
    window.addEventListener("pageshow", resizeSlots);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready);
  else ready();
})();
