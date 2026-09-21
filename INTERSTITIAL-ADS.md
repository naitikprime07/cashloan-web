# Native web interstitials

js/interstitial-ad.js registers the existing interstitial unit as INTERSTITIAL and calls display(slot) once. Null slots are supported.

Google controls eligible link triggers, frequency caps, presentation, close controls and continuation. Next, blog-card and dynamically inserted Apply Loan anchors retain native href behavior. There are no click interception waits, fabricated show calls, refresh-before-display calls or forced navigation timers. Disabled Next links opt out until a selection is made.

No-fill, unsupported browsers and blocked GPT leave navigation functional. InterstitialAd.preload() is idempotent. getState() reports registration/render state, not a guarantee that an interstitial will be shown. No publisher CSS targets Google wrappers; full-screen ads remain browser-level.

Reference: https://developers.google.com/publisher-tag/samples/display-web-interstitial-ad
