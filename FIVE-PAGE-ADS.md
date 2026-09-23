> Historical report. The 2026-09-23 audit and release `20260923-1` in [AD-CONFIGURATION.md](AD-CONFIGURATION.md) supersede implementation and serving conclusions below. Earlier observations are not current test results.

# Flow-page ads switched to fluid-only - release 20260922-12 (2026-09-22)

User requirement (repeat report): the display ad above each Next button was still rendering at ~300px on mobile instead of the button's width. Root cause: the client already requested `fluid` alongside fixed sizes, but GAM served a fixed 300x250 banner creative, which renders at its natural centered size - a slot can never widen a fixed creative without distortion.

Decision (owner directive to force button width): the five flow-page native in-content units (`display-dropdown-next-*`, units `cashloanplatform_native_in_content_01..05`) now request `sizes: ["fluid"]` only - the fixed `[[440,250],[300,250],[250,250]]` fallbacks were removed so a narrow fixed banner can no longer serve. A fluid/native in-content creative fills the slot div, whose width equals the Next button width (`.screen` content column = min(viewport,480)-40), so the ad spans the button on every device.

Tradeoff (accepted): with fluid-only, a page shows an ad ONLY when a native/fluid creative is eligible. If GAM has no native creative for a unit, the slot no-fills and the reserved 250px box stays blank (flow pages keep their footprint per release 20260922-11; they do not collapse). To restore fill without losing the width match, add/enable a native in-content creative or line item for these units in Ad Manager - do not re-add fixed sizes, which reintroduce the narrow banner.

Scope of change: js/ad-config.js (five size lists -> `["fluid"]`); ad-config.js cache version bumped to `?v=20260922-12` on all 14 ad pages. ad-manager.js unchanged (it already keeps `fluid` eligible at every width, validates it, and falls back to the fixed list only if `defineSlot` returns null - with fluid-only that fallback yields an empty list, so the slot reports `unsupported` and the reserved box remains). css/style.css unchanged (slot `max-width:440px` on `.screen > .inline-ad-container > div`, `min-height:250px`). Blog-top units keep `[[440,250],[300,250],[250,250],"fluid"]` and are unaffected.

---


# Display ad now matches the Next button width - fluid requests added 2026-09-22 (version 20260922-9)

User requirement: the in-content display ad above each Next button must look exactly as wide as the button on every device (reported screenshot: a 440px-wide button with a 300px-wide creative centered above it).

Measured on production before the change: the button, the .inline-ad-container and the slot div were all 440px wide; only the served creative was narrower (fixed 300x250 renders at its natural centered size). A slot cannot widen a fixed creative without scaling it, so the fix adds GAM's fluid size, which formats a native in-content creative to exactly the container width.

## Change

- js/ad-config.js: all five display-dropdown-next-* units now request `[[440, 250], [300, 250], [250, 250], "fluid"]`; the fixed sizes remain eligible fallback, so fill cannot regress.
- js/ad-manager.js: "fluid" passes validation, always stays eligible regardless of wrapper width, defineSlot falls back to the fixed-only list if GPT returns null, and the rendered-size-match rejection ignores non-numeric entries (fluid renders report size null).
- css/style.css: .inline-ad-container changed from height:250px to min-height:250px so a taller fluid creative may grow the box; the 250px space is still reserved before scripts run.
- All 14 ad pages now load config/manager (and the five flow pages CSS) at ?v=20260922-9.

## Evidence

- Production probe (2026-09-22, index, normal load): fluid-only and mixed fixed+fluid defineSlot calls succeeded for these units (define:true, no console message); every probe including the numeric-only controls returned no-fill at that moment, so display fill is demand-driven and was temporarily empty - an empty probe does not disprove fluid eligibility.
- Local smoke with this change: config served with the fluid list, container 440x250 equals button width 440, display slot reached no-fill on localhost (define + request succeeded; a rejected fluid would report failed/unsupported), zero console errors.
- Existing production fills (earlier in-content creatives at 300x250) confirm the fixed fallback path still serves.

Expected behavior: when a fluid/native in-content creative serves (AdX in-feed demand or a native line item targeting these units), it automatically spans the full button width on any device, including narrow phones (a 360px viewport gives a ~320px ad below a ~320px button); when only a fixed creative serves, it renders centered at natural size as before. A fluid creative's height follows its own design, so the container may grow past 250px; check AdManager.getDiagnostics() - the display slot sizes list now includes "fluid".

Reference: https://developers.google.com/publisher-tag/guides/ad-sizes (fluid: width of the parent container; native ads are the only fluid type).

---


This section supersedes earlier observations below.

Fresh loads with no recent interstitial impression, production cashloanplatform.com (served version 20260922-6): every page defined and requested only its own slot and every unit filled.

| Page | Logical ID | Unit after /23338698373/ | Slot state | renderEnded |
| --- | --- | --- | --- | --- |
| index | interstitial-next-1 | cashloanplatform_interstitial | ready | isEmpty:false, 1111x903 |
| loan-amount | interstitial-next-2 | cashloanplatform_interstitial_02 | ready | isEmpty:false, 1111x903 |
| employment-type | interstitial-next-4 | cashloanplatform_interstitial_04 | ready | isEmpty:false, 1111x903 |
| loan-type | interstitial-next-3 | cashloanplatform_interstitial_03 | ready | isEmpty:false, 1111x903 |
| proceed | interstitial-next-5 | cashloanplatform_interstitial_05 | ready | isEmpty:false, 1111x903 |

Trigger attributes, hrefs and page ownership matched the config on all five pages; each slot requested exactly once before any click.

Same-session walkthrough: index slot ready, and its Next click showed the native GPT full-page vignette (URL gains #google_vignette). Immediately afterwards, on loan-amount, the interstitial request returned isEmpty:true and its Next click navigated with no ad. That matches Google's web interstitial frequency cap: default 1 impression per 10 minutes per subdomain, enforced through local storage, so after the first shown interstitial further requests are suppressed in the same browser. Separate ad units do not bypass the cap. The application itself is correct on every page: preload, request, validation and click hand-off to GPT all behave identically.

## Per-page show proof (cleared-storage context, same day)

Every page was then re-tested as a new visitor (local storage cleared before load, then select + Next click): all five showed their own full-page interstitial - index, loan-amount (interstitial-next-2), employment-type (interstitial-next-4), loan-type (interstitial-next-3) and proceed (interstitial-next-5) - each with slot state ready before the click and #google_vignette in the URL after it. The control walkthrough without clearing storage showed index only. So every page's tag, trigger, unit and click path work; only the cap window separates them.

Platform floor: GAM allows the web interstitial window to be lowered only to a minimum of 1 impression per 1 minute (default is 10 minutes); no configuration can show two interstitials within the same minute, and GPT may still skip a show for revenue optimization. A fast click-through therefore always shows at most the first interstitial, regardless of separate ad units.

## Resolution: account configuration only, no code change

- Ad Manager > Inventory > Network settings > "Frequency caps" > check "Set format frequency caps" > Format "Web interstitial" > 1 impression per 1 minute (the minimum allowed).
- Optional per-unit caps: Ad Manager > Inventory > Ad units > each interstitial unit > Settings > same "Frequency caps" section.
- If both levels apply, the more restrictive cap wins, so the network-level default must be lowered too. The "Any" format option does not apply to web interstitials, and GPT may still skip a show for long-term revenue optimization. Even at 1 per minute a fast multi-page walkthrough cannot show an interstitial on every page.

## Correct per-page verification

Use a fresh private context (or clear site data) per page, select an option, click Next; or read AdManager.getDiagnostics(): interstitial slot state "ready" means filled and shippable, "no-fill" means an empty response (cap or inventory).

References: https://support.google.com/admanager/answer/9840201 (Traffic web interstitials), https://support.google.com/admanager/answer/9387317 (Set format frequency caps).

---

# Current interstitial audit ? 2026-09-22, version 20260922-8

This section supersedes earlier observations below. The real site is a multi-document static site: native anchor navigation, no SPA router. The current sessionStorage use stores form choices, not interstitial availability. Every destination creates its own manager and preloads only that page's slot. No tag #1 state is shared across documents.

## Root cause and all five production results

Fresh browser context per page, normal Chrome UA, HTTPS production, 390x844; observed approximately 2.5 seconds after DOMContentLoaded. All pages: HTTP 200, no CSP response header, GPT ready, native slot created, displayed/registered, one observed interstitial request before any click.

| Page | Logical ID | Path after /23338698373/ | Result/category |
| --- | --- | --- | --- |
| index | interstitial-next-1 | cashloanplatform_interstitial | no-fill (H) |
| loan-amount | interstitial-next-2 | cashloanplatform_interstitial_02 | no-fill (H) |
| loan-type | interstitial-next-3 | cashloanplatform_interstitial_03 | no-fill (H) |
| employment-type | interstitial-next-4 | cashloanplatform_interstitial_04 | no-fill (H) |
| proceed | interstitial-next-5 | cashloanplatform_interstitial_05 | no-fill (H) |

The observed reason none could show in this run is GAM returning an empty response. Slot creation, config resolution and preload were functioning for every ID. This run did not produce a frequency-cap warning: no-fill is not claimed to prove a frequency cap or a particular inventory fault. Account access is needed to determine eligible creatives, targeting, inventory and demand. The paths are syntactically valid and were requested; their account inventory validity cannot be independently certified. Display #1 filled while its interstitial did not, corroborating independent state; the other four displays returned no-fill.

Production served config/loader/manager version 20260922-6. The new version 20260922-8 is local, NOT deployed. This is not proof of a Cloudflare cache fault. Index also emitted the external /23338698373/Latest3 duplicate-format warning; its source is still absent from repository configuration and unresolved.

## Changes in this turn

- js/ad-config.js: explicit type=interstitial and enabled=true on interstitial entries, preserving all ad unit paths and page mappings.
- js/ad-manager.js: validate logical ID/type/page/path consistency, honor enabled=false, prevent late GPT callbacks from turning a consumed native slot back into ready, and include current page, target pathname (no query/form data), unit and state in click diagnostics.
- 14 HTML files update shared config/manager query versions to 20260922-8: index.html, loan-amount.html, loan-type.html, employment-type.html, proceed.html, blogs.html, eligibility-check.html, blog-personal-loan.html, blog-auto-loan.html, blog-student-loan.html, blog-business-loan.html, blog-payday-loan.html, blog-home-loan.html, blog-gold-loan.html.
- FIVE-PAGE-ADS.md: this report. No CSS, display inventory, destinations or GPT loader changes in this turn.

The existing registry keeps separate references and state per active logical ID. A null OOP result never gets display() called. Repeated init never defines/displays again. Destruction passes only the exact recorded slot. A consumed slot is not manually displayed or refreshed again. The next full HTML page provides the fresh-slot/preload opportunity. Persisted history retains its native GPT document rather than repeatedly creating slots/listeners.

## Tests

Controlled Chromium GPT tests passed 20 cases: filled/no-fill/null/thrown-OOP-error for each of all five IDs. Verified correct logical ID, ready/unavailable states, consumed late-callback guard, no additional display/slot/listener on repeat init, and no changes to the independent display slot state.

A separate blocked-GPT browser run clicked through all five real Next anchors and reached blogs: index -> loan-amount -> employment-type -> loan-type -> proceed -> blogs. All existing destinations remain intact. With the user-requested stable page mapping, the logical IDs along that unchanged navigation are 1 -> 2 -> 4 -> 3 -> 5; IDs are not inferred from DOM order. Prior slow-GPT and responsive checks remain documented below.

The existing 800ms gesture debounce is not a publisher-controlled lock until native ad close. GPT controls native overlay interaction and link continuation; no fake show/close callback or arbitrary navigation wait was added. Actual filled show/close for all five cannot be verified while live responses are empty. These tests prove the application's state/fallback handling, not guaranteed production fill. Frequency-cap behavior is Google's and was not bypassed or simulated as real inventory delivery.

Reference: https://developers.google.com/publisher-tag/samples/display-web-interstitial-ad

---

## Earlier audit history

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
