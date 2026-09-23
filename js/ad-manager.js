/* One document-scoped registry. GPT owns interstitial/anchor UI and navigation. */
(function () {
  "use strict";
  if (window.AdManager || !window.AdConfig || !window.GAM) return;
  var config = AdConfig, page = config.getPageKey(), plan = config.getPageAdConfig(page);
  var records = new Map(), listeners = [], initialized = false, destroyed = false;
  var events = [], errors = [], lastTrigger = null, interstitialId = null;
  var emptyStates = ["NO_FILL", "UNSUPPORTED_SIZE", "UNSUPPORTED", "DISABLED", "FAILED", "CONFIG_ERROR"];
  function log(event, id, detail) {
    var record = records.get(id);
    var entry = { event: event, logicalId: id || null, page: page, timestamp: new Date().toISOString(),
      adUnitPath: record ? record.config.adUnit : null,
      slotElementId: record && record.slot ? record.slot.getSlotElementId() : record && record.element ? record.element.id : null,
      detail: detail || null };
    events.push(entry);
    if (events.length > 160) events.shift();
    if (config.debug) console.info("[GPT] " + event + " logicalId=" + (id || ""), entry);
  }
  function failure(id, message) {
    errors.push({ logicalId: id, message: message });
    log(message, id);
  }
  function state(record, next) {
    record.state = next;
    if (record.element) record.element.dataset.adState = next;
    if (next !== "LOADING" && next !== "REQUESTED" && next !== "RESPONSE_RECEIVED") clearTimeout(record.timer);
    if (record.kind === "display") {
      var wrapper = record.element.closest(".blog-top-ad-container");
      if (wrapper) wrapper.classList.toggle("ad-empty", emptyStates.indexOf(next) !== -1);
    }
    log(next, record.id);
  }
  function reserveAnchor(height) {
    var app = document.querySelector(".app");
    if (!app) return;
    app.classList.toggle("has-bottom-anchor", height > 0);
    app.style.setProperty("--anchor-space", height + "px");
  }
  function add(id, kind, definition, element) {
    if (records.has(id)) { failure(id, "duplicate-logical-id"); return; }
    if (!definition || !/^\/\d+\/[^\s]+$/.test(definition.adUnit || "")) {
      failure(id, "invalid-ad-unit-config"); return;
    }
    records.set(id, { id: id, kind: kind, config: definition, element: element,
      slot: null, state: "QUEUED", displayed: false, requestCount: 0, responseCount: 0,
      renderCount: 0, isEmpty: null, renderedSize: null, responseIdentifier: null });
  }
  function validateContainer(record) {
    var element = record.element;
    if (!element || !element.isConnected || document.getElementById(element.id) !== element) {
      throw new Error("missing-container");
    }
    if (Array.from(document.querySelectorAll("[id]")).filter(function (node) { return node.id === element.id; }).length !== 1) {
      throw new Error("duplicate-container-id");
    }
  }
  function displaySizes(record) {
    var configured = record.config.sizes;
    if (Array.isArray(configured) && configured.indexOf("fluid") !== -1) {
      // Fluid is requested first so a native creative renders full width.
      // Fixed rectangles listed alongside stay servable; fitRecord() scales
      // whichever fixed creative fills so it matches the Next button width.
      if (!configured.every(function (size) {
        return size === "fluid" || (Array.isArray(size) && size.length === 2 && size.every(function (value) {
          return Number.isInteger(value) && value > 0;
        }));
      })) throw new Error("invalid-fixed-sizes");
      record.sizes = configured.slice();
      record.mapping = null;
      record.fitToWidth = true;
      return;
    }
    if (!Array.isArray(configured) || !configured.length || !configured.every(function (size) {
      return Array.isArray(size) && size.length === 2 && size.every(function (value) {
        return Number.isInteger(value) && value > 0;
      });
    })) throw new Error("invalid-fixed-sizes");
    // Both wrappers use a 480px column with 20px gutters. Measure the actual
    // slot as well: the defineSlot fallback must not exceed its current width.
    var width = Math.floor(record.element.getBoundingClientRect().width);
    record.sizes = configured.filter(function (size) { return size[0] <= width; });
    var layout = config.displayLayout;
    if (!layout || configured.some(function (size) { return size[0] > layout.maxColumnWidth - layout.horizontalGutter; })) {
      throw new Error("invalid-display-layout");
    }
    record.mapping = configured.slice().sort(function (a, b) { return b[0] - a[0]; }).map(function (size) {
      return [[size[0] + layout.horizontalGutter, 0], configured.filter(function (candidate) { return candidate[0] <= size[0]; })];
    });
    record.mapping.push([[0, 0], []]);
  }
  function fitRecord(record) {
    var element = record.element;
    if (!element || !record.fitToWidth) return;
    if (Array.isArray(record.renderedSize) && record.renderedSize[0] === "fluid") {
      // A true fluid creative sizes itself to the container; nothing to scale.
      element.style.removeProperty("height");
      element.style.removeProperty("overflow");
      return;
    }
    var frame = element.querySelector("iframe, [data-test-creative]");
    if (!frame) return;
    // GPT expandable creatives stamp viewport-sizing styles (negative margins,
    // viewport max-widths, inline widths) onto the slot div. The publisher
    // content column must own the layout, so override them with !important.
    element.style.setProperty("width", "100%", "important");
    element.style.setProperty("max-width", "100%", "important");
    element.style.setProperty("margin-left", "0px", "important");
    element.style.setProperty("margin-right", "0px", "important");
    var naturalW = frame.offsetWidth || (record.renderedSize && record.renderedSize[0]) || 0;
    var naturalH = frame.offsetHeight || (record.renderedSize && record.renderedSize[1]) || 0;
    var targetW = element.clientWidth || element.getBoundingClientRect().width;
    if (!naturalW || !naturalH || !targetW) return;
    var scale = targetW / naturalW;
    frame.style.display = "block";
    frame.style.marginLeft = "0";
    frame.style.marginRight = "0";
    frame.style.width = naturalW + "px";
    frame.style.height = naturalH + "px";
    frame.style.transformOrigin = "0 0";
    frame.style.transform = "scale(" + scale + ")";
    // Keep the reserved footprint for short creatives via the CSS min-height.
    element.style.overflow = "hidden";
    element.style.height = Math.round(naturalH * scale) + "px";
    // Square creatives on narrow phones can render shorter than the 250px
    // floor; center the scaled frame in the reserved box instead of hugging
    // the top edge.
    var boxH = element.offsetHeight;
    frame.style.marginTop = Math.max(0, Math.round((boxH - naturalH * scale) / 2)) + "px";
  }
  function scheduleFit(record) {
    requestAnimationFrame(function () { fitRecord(record); });
  }
  function refitAll() {
    records.forEach(function (r) { if (r.fitToWidth && r.state === "RENDERED") fitRecord(r); });
  }
  function destroyRecord(record) {
    clearTimeout(record.timer);
    if (record.slot) googletag.destroySlots([record.slot]);
    record.slot = null;
    if (record.kind === "anchor") reserveAnchor(0);
    state(record, "DESTROYED");
  }
  function define(record) {
    try {
      if (record.config.enabled === false) { state(record, "DISABLED"); return; }
      if (record.kind === "display") {
        validateContainer(record);
        if (googletag.pubads().getSlots().some(function (slot) { return slot.getSlotElementId() === record.element.id; })) {
          throw new Error("container-already-has-slot");
        }
        displaySizes(record);
        if (!record.sizes.length) { state(record, "UNSUPPORTED_SIZE"); return; }
        record.slot = googletag.defineSlot(record.config.adUnit, record.sizes, record.element.id);
        if (record.slot) {
          if (record.mapping) {
            var builder = googletag.sizeMapping();
            record.mapping.forEach(function (entry) { builder.addSize(entry[0], entry[1]); });
            var mapping = builder.build();
            if (!mapping) throw new Error("invalid-size-mapping");
            record.slot.defineSizeMapping(mapping);
          }
          record.slot.setConfig({ collapseDiv: "DISABLED" });
        }
      } else {
        record.slot = googletag.defineOutOfPageSlot(record.config.adUnit,
          googletag.enums.OutOfPageFormat[record.kind === "anchor" ? "BOTTOM_ANCHOR" : "INTERSTITIAL"]);
      }
      if (!record.slot) { log("slot:null", record.id); state(record, "UNSUPPORTED"); return; }
      log("slot:defined", record.id);
      record.slot.addService(googletag.pubads());
      log("service:added", record.id);
      state(record, "DEFINED");
    } catch (e) {
      if (record.slot) destroyRecord(record);
      failure(record.id, e.message); state(record, "CONFIG_ERROR");
    }
  }
  function listen(name, handler) {
    var callback = function (event) {
      var record = Array.from(records.values()).find(function (r) { return r.slot === event.slot; });
      if (record && !destroyed) handler(record, event);
    };
    googletag.pubads().addEventListener(name, callback);
    listeners.push([name, callback]);
  }
  function init() {
    if (initialized || destroyed || document.readyState === "loading") return;
    initialized = true;
    plan.display.forEach(function (id) {
      var elements = document.querySelectorAll('[data-ad-logical="' + id + '"]');
      if (elements.length !== 1 || !elements[0].id) { failure(id, "missing-container-or-duplicate-logical-id"); return; }
      var definition = config.getDisplayConfig(id);
      if (!definition || definition.page !== page) { failure(id, "invalid-display-page-config"); return; }
      add(id, "display", definition, elements[0]);
    });
    if (plan.interstitial.length) {
      var definition = config.getInterstitialConfig(plan.interstitial[0]);
      if (!definition || !plan.interstitial.every(function (id) {
        var item = config.getInterstitialConfig(id);
        return item && item.logicalId === id && item.type === "interstitial" && item.page === page &&
          item.enabled === definition.enabled && item.adUnit === definition.adUnit;
      })) {
        failure(null, "incompatible-interstitial-configs-on-one-page");
      } else {
        // Blog card IDs are trigger aliases for ONE explicitly validated page slot.
        interstitialId = plan.interstitial.length === 1 ? definition.logicalId : "interstitial:" + page;
        add(interstitialId, "interstitial", definition);
      }
    }
    plan.anchor.forEach(function (id) {
      var definition = config.getAnchorConfig(id);
      if (!definition || definition.enabledPages.indexOf(page) === -1) { failure(id, "invalid-anchor-page-config"); return; }
      add(id + ":" + page, "anchor", definition);
    });
    GAM.init().then(function (ready) {
      if (destroyed) return;
      if (!ready) { records.forEach(function (r) { state(r, GAM.getState().toUpperCase()); }); return; }
      listen("slotRequested", function (r) { r.requestCount++; state(r, "REQUESTED"); });
      listen("slotResponseReceived", function (r) { r.responseCount++; state(r, "RESPONSE_RECEIVED"); });
      listen("slotRenderEnded", function (r, e) {
        r.renderCount++; r.isEmpty = e.isEmpty; r.renderedSize = e.size;
        r.responseIdentifier = e.responseIdentifier || null;
        log("slotRenderEnded", r.id, { isEmpty: e.isEmpty, size: e.size, responseIdentifier: r.responseIdentifier });
        state(r, e.isEmpty ? "NO_FILL" : "RENDERED");
        if (r.kind === "anchor") reserveAnchor(e.isEmpty ? 0 : Math.max(50, (e.size || [0, 50])[1]) + 30);
        if (!e.isEmpty && r.fitToWidth) { fitRecord(r); scheduleFit(r); }
      });
      listen("slotOnload", function (r) { r.onload = true; if (r.fitToWidth) scheduleFit(r); log("slotOnload", r.id); });
      listen("impressionViewable", function (r) { r.viewable = true; log("impressionViewable", r.id); });
      // All DOM containers and all definitions precede services and the first SRA display.
      records.forEach(define);
      GAM.enableServices();
      records.forEach(function (r) {
        if (!r.slot) return;
        state(r, "LOADING");
        r.timer = setTimeout(function () {
          if (["LOADING", "REQUESTED", "RESPONSE_RECEIVED"].indexOf(r.state) !== -1) state(r, "UNCONFIRMED");
        }, 30000);
      });
      records.forEach(function (r) {
        if (!r.slot || r.displayed) return;
        try {
          if (r.kind === "display") validateContainer(r);
          r.displayed = true;
          log("display", r.id);
          googletag.display(r.slot);
        } catch (e) { destroyRecord(r); failure(r.id, e.message); state(r, "FAILED"); }
      });
      if (config.settings.disableInitialLoad) {
        var slots = Array.from(records.values()).filter(function (r) { return r.slot && r.displayed; }).map(function (r) { return r.slot; });
        if (slots.length) googletag.pubads().refresh(slots); // One explicit initial request, never a retry.
      }
    }).catch(function (e) {
      failure(null, e.message);
      records.forEach(function (r) {
        if (r.state === "QUEUED" || r.state === "DEFINED") state(r, "FAILED");
      });
    });
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    records.forEach(destroyRecord);
    listeners.forEach(function (pair) { googletag.pubads().removeEventListener(pair[0], pair[1]); });
    listeners = [];
    clearTimeout(fitTimer);
    window.removeEventListener("resize", onResize);
    document.removeEventListener("click", onClick, true);
  }
  function onClick(e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.altKey || e.shiftKey ||
        (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
    var id = a.getAttribute("data-interstitial-trigger");
    if (!id || plan.interstitial.indexOf(id) === -1 || a.getAttribute("aria-disabled") === "true" ||
        a.closest('[data-google-interstitial="false"]')) return;
    var destination = new URL(a.href, location.href);
    if (!/^https?:$/.test(destination.protocol)) return;
    lastTrigger = id;
    // Observational only. A nonempty render is NOT proof of show/readiness.
    log("eligible-link-click", interstitialId, { trigger: id, targetPage: destination.pathname });
  }
  document.addEventListener("click", onClick, true);
  var fitTimer = null;
  function onResize() { clearTimeout(fitTimer); fitTimer = setTimeout(refitAll, 150); }
  window.addEventListener("resize", onResize);
  window.addEventListener("pagehide", function (e) {
    log("pagehide", interstitialId, { persisted: e.persisted });
    if (!e.persisted) destroy();
  });
  window.AdManager = {
    init: init, destroy: destroy,
    openConsole: function () { if (config.debug) googletag.cmd.push(function () { googletag.openConsole(); }); },
    getDiagnostics: function () { return { page: page, release: config.release, gpt: GAM.getDiagnostics(),
      lastTrigger: lastTrigger, triggerIds: plan.interstitial.slice(), errors: errors.slice(),
      slots: Array.from(records.values()).map(function (r) { return { id: r.id, kind: r.kind, state: r.state,
        adUnit: r.config.adUnit, elementId: r.slot ? r.slot.getSlotElementId() : r.element ? r.element.id : null,
        sizes: r.sizes, mapping: r.mapping, displayed: r.displayed, requestCount: r.requestCount,
        responseCount: r.responseCount, renderCount: r.renderCount, isEmpty: r.isEmpty,
        renderedSize: r.renderedSize, responseIdentifier: r.responseIdentifier,
        onload: !!r.onload, viewable: !!r.viewable }; }), events: events.slice() }; }
  };
  GAM.init();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
