> Historical report. The 2026-09-23 audit and release `20260923-1` in [AD-CONFIGURATION.md](AD-CONFIGURATION.md) supersede implementation and serving conclusions below. Earlier observations are not current test results.

# Native interstitials

The current implementation is owned by `js/ad-manager.js`, using static `AdConfig` in `js/ad-config.js`. `js/interstitial-ad.js` is only a compatibility entry point.

See [AD-CONFIGURATION.md](AD-CONFIGURATION.md) for all 13 logical triggers, actual inventory, lifecycle states, production audit, verification and format limitations. Google owns showing, closing, frequency caps and native link continuation; the manager does not fabricate a manual show or close API.
