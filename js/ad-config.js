/**
 * Centralized Google Ad Manager (GAM) Configuration
 *
 * CHANGE AD TAGS HERE - NOT IN HTML FILES
 *
 * After changing values:
 * 1. Save this file
 * 2. Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)
 * 3. Verify changes in browser console
 */

(function () {
  "use strict";

  // ========================================
  // GAM NETWORK CONFIGURATION
  // ========================================

  window.GAM_CONFIG = {
    // Enable/disable all ads globally
    enabled: true,

    // Your GAM Network Code
    // Get this from Google Ad Manager → Admin → Global Settings
    networkCode: "23338698373",

    // ========================================
    // AD UNIT PATHS
    // ========================================
    // Format: /NETWORK_CODE/AD_UNIT_NAME
    // Example: /123456789/cashloan/dropdown-next

    adUnits: {
      // Ad between dropdown and Next button (4 pages)
      dropdownNext: "/23338698373/cashloanplatform_display_dropdownnext",

      // Interstitial ad (shows on Next button click, blog clicks, and Apply Loan button)
      interstitial: "/23338698373/cashloanplatform_interstitial",

      // Blog detail top ad (eligibility-check.html and all 7 blog-*.html pages)
      blogTop: "/23338698373/cashloanplatform_display_blogtop",

      // Blog detail bottom anchor (eligibility-check.html - out-of-page format)
      blogBottomAnchor: "/23338698373/cashloanplatform_anchor_001",
    },

    // ========================================
    // AD SIZES
    // ========================================
    // Define responsive ad sizes for each placement

    sizes: {
      dropdownNext: {
        mobile: [
          [300, 250],
          [250, 250],
        ],
        tablet: [
          [300, 250],
          [250, 250],
        ],
        desktop: [
          [300, 250],
          [250, 250],
        ],
      },
      blogTop: {
        mobile: [
          [300, 250],
          [250, 250],
        ],
        tablet: [
          [300, 250],
          [250, 250],
        ],
        desktop: [
          [300, 250],
          [250, 250],
        ],
      },
    },

    // ========================================
    // TARGETING
    // ========================================
    // Global page-level targeting (optional)

    targeting: {
      // Example: { site: "cashloan", env: "production" }
    },

    // ========================================
    // SETTINGS
    // ========================================

    settings: {
      // Enable single request mode (loads all ads in one request)
      singleRequest: true,

      // Collapse empty ad slots
      collapseEmptyDivs: true,

      // Enable lazy loading (loads ads when they're about to be viewed)
      lazyLoad: {
        enabled: false, // Disabled to ensure ads load immediately
        // Fetch ads when they're 200px from viewport
        fetchMarginPercent: 200,
        // Render ads when they're 100px from viewport
        renderMarginPercent: 100,
        // Wait 500ms after scrolling before loading
        mobileScaling: 2.0,
      },

      // Disable initial load (for manual control)
      disableInitialLoad: false,

      // Enable video ads
      enableVideoAds: false,

      // ========================================
      // INTERSTITIAL AD SETTINGS
      // Used for Next buttons, blog card clicks, and Apply Loan button
      // ========================================
      interstitial: {
        // Enable interstitial ads
        enabled: true,
        // Preload interstitial when page loads
        preload: true,
        // GPT owns eligible link triggers and dismissal; no navigation timers.
      },

      // ========================================
      // BOTTOM ANCHOR AD SETTINGS
      // Sticky footer ad on eligibility-check.html
      // ========================================
      bottomAnchor: {
        enabled: true,
        // Reserve bottom space for anchor (updated dynamically)
        reserveBottomSpace: true,
        // Minimum reserved height (pixels)
        minReservedHeight: 50,
        // Maximum reserved height (pixels)
        // Native anchor may be taller; never clamp its measured height.
      },
    },

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Get unique configured sizes that fit the measured wrapper content width
     */
    getResponsiveSizes: function (placement, availableWidth) {
      var sizes = this.sizes[placement];
      if (!sizes || !Number.isFinite(availableWidth)) return [];
      var unique = {};
      return []
        .concat(sizes.mobile || [], sizes.tablet || [], sizes.desktop || [])
        .filter(function (size) {
          var key = size.join("x");
          if (unique[key] || size[0] > Math.floor(availableWidth)) return false;
          unique[key] = true;
          return true;
        });
    },

    /**
     * Validate configuration
     */
    isValid: function () {
      if (!this.enabled) {
        console.log("[GAM] Ads are disabled in config");
        return false;
      }

      if (!this.networkCode || this.networkCode === "YOUR_NETWORK_CODE") {
        console.error(
          "[GAM] Invalid network code. Please update js/ad-config.js",
        );
        return false;
      }

      return true;
    },

    /**
     * Get full ad unit path
     */
    getAdUnitPath: function (placement) {
      var path = this.adUnits[placement];

      if (!path) {
        console.error(
          "[GAM] No ad unit path defined for placement:",
          placement,
        );
        return null;
      }

      // Replace placeholder if still present
      if (path.indexOf("YOUR_NETWORK_CODE") !== -1) {
        path = path.replace("YOUR_NETWORK_CODE", this.networkCode);
      }

      return path;
    },

    /**
     * Log configuration (for debugging)
     */
    logConfig: function () {
      console.log("[GAM] Configuration:", {
        enabled: this.enabled,
        networkCode: this.networkCode,
        adUnits: this.adUnits,
        settings: this.settings,
      });
    },
  };

  // Auto-log config in development (when on localhost)
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    console.log("[GAM] Ad configuration loaded");
    // Uncomment to see full config:
    // window.GAM_CONFIG.logConfig();
  }
})();
