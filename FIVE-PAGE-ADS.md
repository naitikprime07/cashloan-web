# Five-page ad diagnosis ? 2026-09-22

## Confirmed production finding

Each page was opened in its own fresh Chromium browser context (normal Chrome user agent, 390x844). All five pages returned HTTP 200, no CSP response header, GPT ready, and exactly one observed slotRequested event for each of its display and interstitial slots before any click. After approximately 4.5 seconds per page:

| Page / actual navigation order | Logical interstitial ID | Unit suffix | Response |
| --- | --- | --- | --- |
| index | interstitial-next-1 | cashloanplatform_interstitial | filled / ready, 390x844 |
| loan-amount | interstitial-next-2 | cashloanplatform_interstitial_02 | no-fill |
| employment-type | interstitial-next-3 | cashloanplatform_interstitial_03 | no-fill |
| loan-type | interstitial-next-4 | cashloanplatform_interstitial_04 | no-fill |
| proceed | interstitial-next-5 | cashloanplatform_interstitial_05 | no-fill |

Every suffix above uses /23338698373/. The live config contains the new separate paths. No incorrect lookup, reuse of tag #1, unsupported slot, missing preload or blocked GPT was observed on #2?#5. Their actual response is slotRenderEnded.isEmpty=true, even with independent fresh storage. The immediate reason they cannot display in this test is no-fill, not missing JavaScript show calls. This does not establish whether the underlying account-side cause is unconfigured inventory, targeting, creative eligibility or demand. Account access is required to distinguish those. No ad path was invented or replaced.

The index page also logged `/23338698373/Latest3 not requested: Format already created on the page`. Latest3 is not configured in this repository. Its external source remains unresolved. It did not prevent the configured #1 slot from filling in this run.

All five display units `cashloanplatform_native_in_content_01` through `_05` returned no-fill. Their logical IDs are `display-dropdown-next-index`, `display-dropdown-next-loan-amount`, `display-dropdown-next-employment-type`, `display-dropdown-next-loan-type`, and `display-dropdown-next-proceed`, respectively.

## Code changes in this update

- js/ad-manager.js: single-trigger interstitial records use their exact logical ID instead of an opaque page alias. Preload/state/request logs identify the actual tag; diagnostics expose observed request counts. Multi-trigger Blog List still shares one native physical slot. Display/native event filtering remains independent.
- css/style.css: remove loan-section viewport minimum height and the ad's automatic top margin. Content, ad and Next now have normal vertical flow and a 16px ad-to-button gap; retain a 250px footprint for fill/no-fill stability.
- All 14 ad HTML files: version shared config/manager references to 20260922-5 to avoid mixed cached interfaces. The five flow pages also version CSS. Files: index.html, loan-amount.html, employment-type.html, loan-type.html, proceed.html, blogs.html, eligibility-check.html, blog-personal-loan.html, blog-auto-loan.html, blog-student-loan.html, blog-business-loan.html, blog-payday-loan.html, blog-home-loan.html, blog-gold-loan.html.
- FIVE-PAGE-ADS.md and AD-CONFIGURATION.md: current evidence and report.

The static config's current per-page unit paths and flat sizes [[440,250],[300,250],[250,250]] were already correct and remain unchanged. The actual flow is index -> loan-amount -> employment-type -> loan-type -> proceed -> blogs; its destinations have not been reordered.

## Display behavior

The shared .screen has 20px side padding inside the app's 480px maximum column. Ad slot and button widths equal min(viewport width,480)-40, up to 440px. Thus a 440px-wide viewport has 400px of content; a 440px creative becomes eligible at a 480px viewport. Only fitting sizes are requested. Smaller creatives render naturally, centered, without scaling, distortion or cropping. No fixed/sticky/absolute positioning of the ad or Next is used.

## Verification and limits

40 local page/viewport cases (five pages at 320,360,375,390,412,430,480,1440) passed: correct distinct interstitial paths, one request before click in the controlled GPT harness, independent display/native fill/no-fill states, exact horizontal alignment, stable button position, no horizontal overflow, repeated-init and simulated history guards. Native formats in these checks use a GPT stub, not real filled impressions. Earlier natural creative-size tests verified 440x250, 300x250 and 250x250 render dimensions.

Native GPT owns show, dismissal and continuation. There is no fabricated manual show or close callback. No-fill/blocked/unsupported ads retain native href fallback immediately; full navigation creates a fresh document and preload opportunity. Public web-interstitial frequency caps still apply across the subdomain, even when ad unit paths differ. A filled event alone does not establish actual show/close; filled close/navigation was not verified in this audit. Do not claim all five are serving successfully until GAM delivers eligible creatives.

The live server had the new inventory configuration but the previous manager/CSS version at audit time. This update is local and has NOT been deployed. These live observations diagnose current delivery rather than proving the local changes are deployed. A normal mobile test cannot establish whether a 440x250 creative is configured or eligible in GAM; that requires inventory/creative verification.

Reference: https://developers.google.com/publisher-tag/samples/display-web-interstitial-ad
