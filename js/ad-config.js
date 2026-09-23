/**
 * Centralized Ad Configuration
 *
 * All ad placements defined with logical identifiers.
 * This is the SINGLE SOURCE OF TRUTH for ad configuration.
 */

(function () {
  "use strict";
  if (window.AdConfig) return;

  const NETWORK_CODE = "23338698373";
  const BASE_PATH = `/${NETWORK_CODE}`;

  // ============================================
  // DISPLAY ADS
  // ============================================
  const DISPLAY_ADS = {
    "display-dropdown-next-index": {
      logicalId: "display-dropdown-next-index",
      page: "index",
      adUnit: `${BASE_PATH}/cashloanplatform_native_in_content_01`,
      // Confirmed native/fluid inventory: use the full content width.
      sizes: ["fluid"],
    },
    "display-dropdown-next-loan-amount": {
      logicalId: "display-dropdown-next-loan-amount",
      page: "loan-amount",
      adUnit: `${BASE_PATH}/cashloanplatform_native_in_content_02`,
      // Confirmed native/fluid inventory: use the full content width.
      sizes: ["fluid"],
    },
    "display-dropdown-next-employment-type": {
      logicalId: "display-dropdown-next-employment-type",
      page: "employment-type",
      adUnit: `${BASE_PATH}/cashloanplatform_native_in_content_03`,
      // Confirmed native/fluid inventory: use the full content width.
      sizes: ["fluid"],
    },
    "display-dropdown-next-loan-type": {
      logicalId: "display-dropdown-next-loan-type",
      page: "loan-type",
      adUnit: `${BASE_PATH}/cashloanplatform_native_in_content_04`,
      // Confirmed native/fluid inventory: use the full content width.
      sizes: ["fluid"],
    },
    "display-dropdown-next-proceed": {
      logicalId: "display-dropdown-next-proceed",
      page: "proceed",
      adUnit: `${BASE_PATH}/cashloanplatform_native_in_content_05`,
      // Confirmed native/fluid inventory: use the full content width.
      sizes: ["fluid"],
    },
    "display-blog-top-blogs": {
      logicalId: "display-blog-top-blogs",
      page: "blogs",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-eligibility-check": {
      logicalId: "display-blog-top-eligibility-check",
      page: "eligibility-check",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-personal-loan": {
      logicalId: "display-blog-top-personal-loan",
      page: "blog-personal-loan",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-auto-loan": {
      logicalId: "display-blog-top-auto-loan",
      page: "blog-auto-loan",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-student-loan": {
      logicalId: "display-blog-top-student-loan",
      page: "blog-student-loan",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-business-loan": {
      logicalId: "display-blog-top-business-loan",
      page: "blog-business-loan",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-payday-loan": {
      logicalId: "display-blog-top-payday-loan",
      page: "blog-payday-loan",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-home-loan": {
      logicalId: "display-blog-top-home-loan",
      page: "blog-home-loan",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
    "display-blog-top-gold-loan": {
      logicalId: "display-blog-top-gold-loan",
      page: "blog-gold-loan",
      adUnit: `${BASE_PATH}/cashloanplatform_display_blogtop`,
      sizes: [[440, 250], [300, 250], [250, 250]],
    },
  };

  // ============================================
  // INTERSTITIAL ADS
  // ============================================
  const INTERSTITIAL_ADS = {
    // 5 Next buttons in loan flow
    "interstitial-next-1": {
      logicalId: "interstitial-next-1",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "index",
      sequence: 1,
      triggerSelector: 'a[data-interstitial-trigger="interstitial-next-1"]',
    },
    "interstitial-next-2": {
      logicalId: "interstitial-next-2",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial_02`,
      page: "loan-amount",
      sequence: 2,
      triggerSelector: 'a[data-interstitial-trigger="interstitial-next-2"]',
    },
    "interstitial-next-3": {
      logicalId: "interstitial-next-3",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial_03`,
      page: "loan-type",
      sequence: 3,
      triggerSelector: 'a[data-interstitial-trigger="interstitial-next-3"]',
    },
    "interstitial-next-4": {
      logicalId: "interstitial-next-4",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial_04`,
      page: "employment-type",
      sequence: 4,
      triggerSelector: 'a[data-interstitial-trigger="interstitial-next-4"]',
    },
    "interstitial-next-5": {
      logicalId: "interstitial-next-5",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial_05`,
      page: "proceed",
      sequence: 5,
      triggerSelector: 'a[data-interstitial-trigger="interstitial-next-5"]',
    },

    // 7 Blog cards on blogs.html
    "interstitial-blog-1": {
      logicalId: "interstitial-blog-1",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "blogs",
      triggerSelector: 'a.post-card[href*="personal-loan"]',
    },
    "interstitial-blog-2": {
      logicalId: "interstitial-blog-2",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "blogs",
      triggerSelector: 'a.post-card[href*="auto-loan"]',
    },
    "interstitial-blog-3": {
      logicalId: "interstitial-blog-3",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "blogs",
      triggerSelector: 'a.post-card[href*="student-loan"]',
    },
    "interstitial-blog-4": {
      logicalId: "interstitial-blog-4",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "blogs",
      triggerSelector: 'a.post-card[href*="business-loan"]',
    },
    "interstitial-blog-5": {
      logicalId: "interstitial-blog-5",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "blogs",
      triggerSelector: 'a.post-card[href*="payday-loan"]',
    },
    "interstitial-blog-6": {
      logicalId: "interstitial-blog-6",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "blogs",
      triggerSelector: 'a.post-card[href*="home-loan"]',
    },
    "interstitial-blog-7": {
      logicalId: "interstitial-blog-7",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "blogs",
      triggerSelector: 'a.post-card[href*="gold-loan"]',
    },

    // Apply Loan button on blog detail pages
    "interstitial-apply-loan": {
      logicalId: "interstitial-apply-loan",
      type: "interstitial",
      enabled: true,
      adUnit: `${BASE_PATH}/cashloanplatform_interstitial`,
      page: "eligibility-check",
      triggerSelector: "#applyBtn",
    },
  };

  // ============================================
  // ANCHOR ADS
  // ============================================
  const ANCHOR_ADS = {
    blogBottomAnchor: {
      logicalId: "blogBottomAnchor",
      adUnit: `${BASE_PATH}/cashloanplatform_anchor_001`,
      enabledPages: ["blogs", "eligibility-check"],
      containerSelector: '[data-bottom-anchor="true"]',
    },
  };

  // ============================================
  // PAGE-TO-AD MAP
  // ============================================
  const PAGE_AD_MAP = {
    index: {
      display: ["display-dropdown-next-index"],
      interstitial: ["interstitial-next-1"],
      anchor: [],
    },
    "loan-amount": {
      display: ["display-dropdown-next-loan-amount"],
      interstitial: ["interstitial-next-2"],
      anchor: [],
    },
    "loan-type": {
      display: ["display-dropdown-next-loan-type"],
      interstitial: ["interstitial-next-3"],
      anchor: [],
    },
    "employment-type": {
      display: ["display-dropdown-next-employment-type"],
      interstitial: ["interstitial-next-4"],
      anchor: [],
    },
    proceed: {
      display: ["display-dropdown-next-proceed"],
      interstitial: ["interstitial-next-5"],
      anchor: [],
    },
    blogs: {
      display: ["display-blog-top-blogs"],
      interstitial: [
        "interstitial-blog-1",
        "interstitial-blog-2",
        "interstitial-blog-3",
        "interstitial-blog-4",
        "interstitial-blog-5",
        "interstitial-blog-6",
        "interstitial-blog-7",
      ],
      anchor: ["blogBottomAnchor"],
    },
    "eligibility-check": {
      display: ["display-blog-top-eligibility-check"],
      interstitial: ["interstitial-apply-loan"],
      anchor: ["blogBottomAnchor"],
    },
    "blog-personal-loan": {
      display: ["display-blog-top-personal-loan"],
      interstitial: [],
      anchor: [],
    },
    "blog-auto-loan": {
      display: ["display-blog-top-auto-loan"],
      interstitial: [],
      anchor: [],
    },
    "blog-student-loan": {
      display: ["display-blog-top-student-loan"],
      interstitial: [],
      anchor: [],
    },
    "blog-business-loan": {
      display: ["display-blog-top-business-loan"],
      interstitial: [],
      anchor: [],
    },
    "blog-payday-loan": {
      display: ["display-blog-top-payday-loan"],
      interstitial: [],
      anchor: [],
    },
    "blog-home-loan": {
      display: ["display-blog-top-home-loan"],
      interstitial: [],
      anchor: [],
    },
    "blog-gold-loan": {
      display: ["display-blog-top-gold-loan"],
      interstitial: [],
      anchor: [],
    },
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  function getDisplayConfig(logicalId) {
    return DISPLAY_ADS[logicalId] || null;
  }

  function getInterstitialConfig(logicalId) {
    return INTERSTITIAL_ADS[logicalId] || null;
  }

  function getAnchorConfig(logicalId) {
    return ANCHOR_ADS[logicalId] || null;
  }

  function getPageAdConfig(pageName) {
    return (
      PAGE_AD_MAP[pageName] || { display: [], interstitial: [], anchor: [] }
    );
  }

  function getAllDisplayConfigs() {
    return Object.values(DISPLAY_ADS);
  }

  function getAllInterstitialConfigs() {
    return Object.values(INTERSTITIAL_ADS);
  }

  function getAllAnchorConfigs() {
    return Object.values(ANCHOR_ADS);
  }

  // ============================================
  // PUBLIC API
  // ============================================
  window.AdConfig = {
    enabled: true,
    debug: false,
    // All page slots exist before the first SRA request.
    settings: { singleRequest: true, disableInitialLoad: false },
    release: "20260923-3",
    displayLayout: { maxColumnWidth: 480, horizontalGutter: 40 },
    getPageKey: function () {
      var name =
        location.pathname
          .replace(/\/+$/, "")
          .split("/")
          .pop()
          .replace(/\.html$/, "") || "index";
      return name;
    },
    NETWORK_CODE,
    BASE_PATH,
    DISPLAY_ADS,
    INTERSTITIAL_ADS,
    ANCHOR_ADS,
    PAGE_AD_MAP,

    getDisplayConfig,
    getInterstitialConfig,
    getAnchorConfig,
    getPageAdConfig,
    getAllDisplayConfigs,
    getAllInterstitialConfigs,
    getAllAnchorConfigs,

    // For debugging
    _debug: {
      all: { DISPLAY_ADS, INTERSTITIAL_ADS, ANCHOR_ADS, PAGE_AD_MAP },
    },
  };
})();
