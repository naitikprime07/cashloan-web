# Latest correction ? exact requested mapping and late GPT recovery

This section supersedes the older mapping and observations below.

## Confirmed code defects fixed

1. The requested mapping is now index -> interstitial-next-1, loan-amount -> interstitial-next-2, loan-type -> interstitial-next-3, employment-type -> interstitial-next-4, proceed -> interstitial-next-5. Config page properties, page maps and button attributes agree. Unit paths stay attached to their logical IDs: /23338698373/cashloanplatform_interstitial, then cashloanplatform_interstitial_02/_03/_04/_05. Navigation hrefs remain unchanged, so navigation order still visits employment-type before loan-type.
2. gam-loader.js previously settled its readiness promise as false after 15 seconds and ignored a later GPT command callback. Timeout now records a diagnostic state without abandoning the single pending readiness promise. Late GPT can initialize slots once; a real script error still resolves failure. Pending readiness never delays a user click.
3. During verification all five configs had their 300x250 and 250x250 fallbacks commented out. With only 440x250, smaller screens had no fitting size and skipped defineSlot. Restored flat [[440,250],[300,250],[250,250]] arrays. No unit paths changed.
4. Removed the restored .screen viewport min-height and .inline-ad-container auto top margin; reserved 250px ad space and 16px gap remain in normal flow. The container and Next share the same content width. No fixed button or scaling was added.

## Diagnostics and lifecycle

ad-manager.js records page + logical ID + unit at preload/creation, display, request count, renderEnded with isEmpty/size, actual state at click, fallback/native trigger, and pagehide. Config validation also checks interstitial page ownership. State lives in the registry keyed by logical ID, with separate display and interstitial records. Native Blog List remains one physical slot for its shared unit. No show/close callback is fabricated: GPT's native web format owns presentation and dismissal. impressionViewable marks consumed; it does not assert that the user closed the ad. Full navigation creates a new document and independent preload. Existing BFCache and duplicate guards remain.

Use AdManager.getDiagnostics() for the bounded event history, or AdConfig.debug=true for subsequent console logs. Slow-GPT timeout is visible via GAM.getState(); it is not an indication that a fallback link is blocked.

## Current production verification

The live pages still served version 20260922-5, including the OLD #3/#4 mapping. Local version 20260922-6 is NOT deployed. This establishes deployment mismatch, not a proven Cloudflare caching fault.

Fresh-context live Next clicks verified native fallback destinations for all five pages: index -> loan-amount, loan-amount -> employment-type, loan-type -> proceed, employment-type -> loan-type, proceed -> blogs. In the completed observations each page had one display request and one native interstitial request before clicking, and both returned no-fill. No-fill is an actual GAM empty response, distinct from the code defects above. The first attempt to inspect transient frames on index/loan-amount hit detached frames; those two checks were repeated successfully without transient-frame inspection.

No account access was available to determine why GAM supplied no eligible ad (inventory/targeting/creative eligibility/demand). No live filled show/close sequence was observed in this run. All five reaching ready was verified with controlled filled GPT events locally; this is not proof that all five units serve filled ads live. The outstanding acceptance item is real filled-ad display/dismissal per unit, requiring eligible GAM fill and deployment of the local fix. Separate units do not bypass GPT's subdomain frequency cap.

## Tests and exact files changed in this correction

- Node regression: late GPT readiness after diagnostic timeout succeeds with one script, one service initialization and one promise.
- 40 local browser cases: all five exact mappings at 320/360/375/390/412/430/480/1440 widths; independent ready/no-fill states, one request/slot/display, no duplicate listeners on repeated init, stable ad/Next geometry and no horizontal overflow. Controlled GPT stub; not a filled-production test.
- js/ad-config.js: exact #3/#4 mapping and mobile size fallbacks.
- js/gam-loader.js: diagnostic timeout with late-ready recovery.
- js/ad-manager.js: richer observed-event diagnostics and per-page config validation.
- css/style.css: normal vertical flow.
- loan-type.html and employment-type.html: corrected trigger IDs.
- All 14 ad HTML files: shared config/manager/loader version 20260922-6; five flow pages also version CSS. Exact list: index.html, loan-amount.html, loan-type.html, employment-type.html, proceed.html, blogs.html, eligibility-check.html, blog-personal-loan.html, blog-auto-loan.html, blog-student-loan.html, blog-business-loan.html, blog-payday-loan.html, blog-home-loan.html, blog-gold-loan.html.
- FIVE-PAGE-ADS.md: this report.

No pixel, destination, form or native inventory path changes were made.

---

## Historical audit (prior mapping)

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
