# GPT audit and implementation report - 2026-09-23

Release: `20260923-1`. Local source changes are complete and tested. **Not deployed; full live-serving acceptance is still incomplete.** The production-origin preview below substituted local files only inside a test browser; it did not publish anything.

## 1. Root causes and evidence

- **Premature creative destruction:** the previous manager inspected every Google-created div/iframe during mutation/resize and destroyed the whole slot when transient geometry exceeded its wrapper. Production `blog-auto-loan` reproduced `request -> destroyed -> rejected-size`, with GPT and ad HTTP 200 and no page JavaScript exception. It was destroyed before a render event was recorded, so this trace does not establish the returned creative size or fill status. The new manager does not inspect, resize, replace, or destroy creative DOM during rendering.
- **Over-restricted inventory:** the five loan displays requested only `fluid`; fixed rectangles were ineligible. Restore the requested 440x250, 300x250 and 250x250 sizes. Existing native-named unit paths remain unchanged. Their GAM line items must support those sizes; a path name alone cannot establish inventory compatibility.
- **Double gutters:** article ads were inside a section with 20px side padding and added another 20px on each side. At a 320px viewport the available width was 240px. Remove the inner padding so a 250px creative can fit.
- **Incorrect responsive lifecycle:** a single [0,0] size mapping froze sizes measured at initialization, and shrinking the viewport destroyed the slot. Real viewport breakpoints now account for 40px gutters. A previously served large creative remains at natural size in a horizontally scrollable publisher slot after rotation, without scaling, discarding, or re-requesting it.
- **Misleading state and navigation logic:** nonempty render was labeled ready, impressionViewable was treated as consumption, and an 800ms click debounce could cancel navigation. These assumptions are removed. Render, iframe load and viewability are separate observed facts; clicks are never canceled by the ad manager.
- **External configuration conflict:** real GPT warned that `/23338698373/Latest3` was not requested because the format already existed. That path is absent from repository source. A Google `gampad/ads` response contains an additional format configuration for it. The exact GAM feature/line item responsible requires account inspection; codeless format settings or delivered creative configuration are candidates, not proven causes.
- **No-fill is also real:** no-fill responses persist with corrected code. The response does not expose whether targeting, demand, inventory, optimization or a cap caused the empty result. No forced displays or retries were added.

## 2-3. Files changed and preserved

Changed runtime files: `js/ad-config.js`, `js/gam-loader.js`, `js/ad-manager.js`, `css/style.css`.

Changed HTML (asset release references; article/eligibility ad DOM IDs are now page-specific):

- `blog-auto-loan.html`
- `blog-business-loan.html`
- `blog-gold-loan.html`
- `blog-home-loan.html`
- `blog-payday-loan.html`
- `blog-personal-loan.html`
- `blog-student-loan.html`
- `blogs.html`
- `eligibility-check.html`
- `employment-type.html`
- `index.html`
- `loan-amount.html`
- `loan-type.html`
- `proceed.html`

Documentation: this report; dated historical notices added to `DISPLAY-ADS.md`, `INTERSTITIAL-ADS.md`, and `FIVE-PAGE-ADS.md`. Tests and diagnostic JSON are in `tests/`.

Unchanged application behavior/files: `js/app.js`, `js/eligibility.js`, `js/emi.js`, `js/pixel-config.js`, `js/pixel-loader.js`, `js/interstitial-ad.js`, `js/bottom-anchor.js`, `ads.txt`, `PIXEL-CONFIGURATION.md`, all images/icons, and the five non-ad pages (`404.html`, `about.html`, `contact.html`, `emi-calculator.html`, `privacy-policy.html`). All original anchor href values across all 19 HTML files were compared with the pre-audit source and preserved. No framework, build system, environment file, new ad path, pixel or loan-calculation changes.

## 4-5. Architecture and request mode

Static multi-page HTML navigation. One document owns one registry. Config -> GAM loader -> AdManager is unchanged as the architecture. The loader queues one GPT readiness callback and inserts at most one script. The manager waits for DOM readiness, validates and defines all relevant slots, adds services/listeners, calls the guarded enableServices once, then displays each slot once.

**SRA retained:** the entire page plan and display containers exist before the first display/request. There is no SPA/router or late-created display slot. The dynamically generated Apply Loan link uses the already-defined page interstitial; it does not create a slot. `googletag.setConfig` configures SRA before services. No lazy loading or automatic refresh is enabled. The existing optional disableInitialLoad switch is false; if enabled, there is one explicit initial refresh, never retries.

One INTERSTITIAL per applicable document, including one shared blog-list physical slot for seven trigger aliases. No arbitrary first-slot fallback: shared triggers must have the same page, enabled setting and unit or validation fails. Anchors use BOTTOM_ANCHOR and their own records. Display duplicate guards check logical IDs, unique connected DOM nodes and `googletag.pubads().getSlots()`. An unsupported out-of-page definition is recorded without assuming why it returned null.

Persisted pagehide/BFCache retains slots and listeners; re-init is idempotent. Nonpersisted pagehide destroys only registered slot objects and removes listeners/timers. New documents get new slots. Delayed GPT remains eligible to resolve its original readiness promise. Fifteen/30-second timers record uncertainty only; they do not retry or navigate.

## 6. Complete display mapping

All display rows use `defineSlot`, one service association, one display, and page-load SRA request. Configured sizes are **440x250, 300x250, 250x250** for every row; no fluid. Breakpoints: viewport >=480 -> all three; >=340 -> 300/250; >=290 -> 250; below 290 -> no fitting rectangle. The initial fallback also checks actual container width. Wrappers reserve 250px before load. Loan pages retain that footprint on no-fill; blog wrappers collapse on known empty/failure outcomes.

| Page | Logical ID | Full GAM path | Type | DOM ID | Sizes |
|---|---|---|---|---|---|
| index | `display-dropdown-next-index` | `/23338698373/cashloanplatform_native_in_content_01` | Display | `gam-index-dropdown-next` | 440x250 / 300x250 / 250x250 |
| loan-amount | `display-dropdown-next-loan-amount` | `/23338698373/cashloanplatform_native_in_content_02` | Display | `gam-loan-amount-dropdown-next` | 440x250 / 300x250 / 250x250 |
| employment-type | `display-dropdown-next-employment-type` | `/23338698373/cashloanplatform_native_in_content_03` | Display | `gam-employment-dropdown-next` | 440x250 / 300x250 / 250x250 |
| loan-type | `display-dropdown-next-loan-type` | `/23338698373/cashloanplatform_native_in_content_04` | Display | `gam-loan-type-dropdown-next` | 440x250 / 300x250 / 250x250 |
| proceed | `display-dropdown-next-proceed` | `/23338698373/cashloanplatform_native_in_content_05` | Display | `gam-proceed-dropdown-next` | 440x250 / 300x250 / 250x250 |
| blogs | `display-blog-top-blogs` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-top-blogs` | 440x250 / 300x250 / 250x250 |
| eligibility-check | `display-blog-top-eligibility-check` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-eligibility-check-top` | 440x250 / 300x250 / 250x250 |
| blog-personal-loan | `display-blog-top-personal-loan` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-personal-loan-top` | 440x250 / 300x250 / 250x250 |
| blog-auto-loan | `display-blog-top-auto-loan` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-auto-loan-top` | 440x250 / 300x250 / 250x250 |
| blog-student-loan | `display-blog-top-student-loan` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-student-loan-top` | 440x250 / 300x250 / 250x250 |
| blog-business-loan | `display-blog-top-business-loan` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-business-loan-top` | 440x250 / 300x250 / 250x250 |
| blog-payday-loan | `display-blog-top-payday-loan` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-payday-loan-top` | 440x250 / 300x250 / 250x250 |
| blog-home-loan | `display-blog-top-home-loan` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-home-loan-top` | 440x250 / 300x250 / 250x250 |
| blog-gold-loan | `display-blog-top-gold-loan` | `/23338698373/cashloanplatform_display_blogtop` | Display | `gam-blog-gold-loan-top` | 440x250 / 300x250 / 250x250 |

## 7. Interstitial and anchor mapping

Out-of-page containers and sizes are generated/managed by GPT, not publisher rectangle divs. Each page requests its interstitial once on load. Eligible normal HTTP(S), same-window anchor clicks are opportunities, not guaranteed impressions. No requireStorageAccess override or optional trigger override was added. Existing dropdown validation opts a Next link out until a selection is made.

| Source page | Trigger logical ID | Physical registry ID | Full GAM path | Exact destination |
|---|---|---|---|---|
| index | `interstitial-next-1` | `interstitial-next-1` | `/23338698373/cashloanplatform_interstitial` | loan-amount.html |
| loan-amount | `interstitial-next-2` | `interstitial-next-2` | `/23338698373/cashloanplatform_interstitial_02` | employment-type.html |
| loan-type | `interstitial-next-3` | `interstitial-next-3` | `/23338698373/cashloanplatform_interstitial_03` | proceed.html |
| employment-type | `interstitial-next-4` | `interstitial-next-4` | `/23338698373/cashloanplatform_interstitial_04` | loan-type.html |
| proceed | `interstitial-next-5` | `interstitial-next-5` | `/23338698373/cashloanplatform_interstitial_05` | blogs.html |
| blogs | `interstitial-blog-1` | `interstitial:blogs` | `/23338698373/cashloanplatform_interstitial` | eligibility-check.html?loan=personal-loan |
| blogs | `interstitial-blog-2` | `interstitial:blogs` | `/23338698373/cashloanplatform_interstitial` | eligibility-check.html?loan=auto-loan |
| blogs | `interstitial-blog-3` | `interstitial:blogs` | `/23338698373/cashloanplatform_interstitial` | eligibility-check.html?loan=student-loan |
| blogs | `interstitial-blog-4` | `interstitial:blogs` | `/23338698373/cashloanplatform_interstitial` | eligibility-check.html?loan=business-loan |
| blogs | `interstitial-blog-5` | `interstitial:blogs` | `/23338698373/cashloanplatform_interstitial` | eligibility-check.html?loan=payday-loan |
| blogs | `interstitial-blog-6` | `interstitial:blogs` | `/23338698373/cashloanplatform_interstitial` | eligibility-check.html?loan=home-loan |
| blogs | `interstitial-blog-7` | `interstitial:blogs` | `/23338698373/cashloanplatform_interstitial` | eligibility-check.html?loan=gold-loan |
| eligibility-check | `interstitial-apply-loan` | `interstitial-apply-loan` | `/23338698373/cashloanplatform_interstitial` | blog-{selected loan}.html, retaining amount/rate/months when generated |

The existing unit assignments are preserved: **employment-type uses interstitial-next-4 / _04; loan-type uses interstitial-next-3 / _03**. Actual navigation order remains index -> loan-amount -> employment-type -> loan-type -> proceed -> blogs. The numeric suffix is not used to reorder pages.

Apply Loan is actually generated on eligibility-check, not on the seven static article pages. The static articles retain their own independent blogTop displays.

| Page | Anchor registry ID | Full GAM path | Type / DOM / size |
|---|---|---|---|
| blogs | `blogBottomAnchor:blogs` | `/23338698373/cashloanplatform_anchor_001` | BOTTOM_ANCHOR; GPT-generated DOM and size |
| eligibility-check | `blogBottomAnchor:eligibility-check` | `/23338698373/cashloanplatform_anchor_001` | BOTTOM_ANCHOR; GPT-generated DOM and size |

Anchor fill reserves creative height plus 30px controls (minimum 80px); no-fill clears it. Actions remain in normal flow; dialogs retain native top-layer behavior. Real filled-anchor overlap on the revised release remains unverified because its observed anchor responses were empty.

## 8-13. Actual slot outcomes

Evidence is separated by source and test mode:

| Observation | Define/request | Result | Limits |
|---|---|---|---|
| Local HTTP, real GPT, 390x844, all 14 pages | All 23 configured slots defined and requested once | 23 NO_FILL render events | Local origin is not production delivery |
| Production-origin browser preview of revised local files, all 14 pages at 390x844 | All 23 defined/requested once | Apply Loan interstitial nonempty 390x844; remaining 22 empty | Local files intercepted only in browser; NOT deployed |
| Same revised-source preview, index at 1440x844 | Both defined/requested once | Display 440x250 with slotOnload; interstitial nonempty 1440x844 | Render is not proof of interstitial show/dismiss |
| Same revised-source preview, blogs at 1440x844 | All three defined/requested once | blogTop 440x250 with slotOnload; interstitial nonempty; anchor empty | No viewable impression captured in the short observation |
| Unmodified live production, all 14 pages at 390x844 | All 23 registered/requested | blogs: three nonempty responses; Auto Loan display rejected-size; other 19 empty | Old implementation, not revised source |

**Slots returning null:** none in the real observed passes. Controlled null tests cover all configured native slots and confirm navigation fallback. A null result alone does not identify a frequency cap.

**Frequency-capped slots:** none positively identified. **Optimization suppression:** not positively identified. Do not relabel empty results as caps or optimization. Filled interstitial show/close, genuine cap enforcement and all-five-unit filled impressions remain unverified. Shared browsing context was retained within each real pass; storage/caps were not manipulated to force fill.

**Configuration errors:** the duplicate external Latest3 format warning is confirmed in real responses. Fixed-size inventory eligibility still needs GAM account validation, especially the native-named loan units. No invalid local mapping/config errors in normal test cases. Injected duplicate/missing containers fail only the display record, retaining the independent interstitial.

**JavaScript errors:** no page exceptions in the real local, production or revised-origin passes. This alone is not acceptance: the old production slot was destroyed despite no exception. Revised previews reported the external GPT warning above, so these runs are not described as warning-free.

## 14-15. Publisher Console and network

Opened Publisher Console on local blogs via `AdConfig.debug = true; AdManager.openConsole()`. It showed three slots with the expected units, one fetch each, no creative/line-item ID, and empty delivery. Captured console text and query identifiers are in `tests/ad-live-results.json`. Console overlay loading on HTTP produced browser COOP trustworthiness warnings; no application exception was recorded.

GPT script and observed gampad ad responses returned HTTP 200. SRA request/response/render events identify each configured slot independently; raw HTTP ad requests may also reflect Google-managed configuration outside the registry. A safeframe request was aborted in the local capture; this was not the GPT script or ad response, and is not evidence of successful fill. There were no CSP response headers on inspected production documents. Direct urllib checks initially got 403; Chromium then loaded all 14 documents with HTTP 200. That client-dependent result does not establish a cache fault.

The external Latest3 entry was located in a `https://securepubads.g.doubleclick.net/gampad/ads` response, not in publisher JavaScript. `tests/ad-demo-cache-results.json` records only its relevant unit/format metadata, not raw cookie-bearing response content.

## 16-17. Mobile, desktop and failure tests

`python tests/ad-audit.py`: **126 controlled Chromium cases passed** (14 pages x filled/empty/null x 320/390/1440 widths), plus 6 size-boundary cases at 289/290/339/340/479/480. These are synthetic GPT events, not GAM impressions.

Additional passing checks: all five Next links and seven blog cards preserve destinations under no-fill, unsupported native formats and blocked GPT; dynamically generated Apply Loan preserves its exact query string; delayed GPT after the 15-second diagnostic timeout initializes once; a missing response becomes UNCONFIRMED after 30 seconds without retry; repeated init and simulated persisted page lifecycle do not add slots/listeners/requests; missing/duplicate/already-owned containers are isolated; rotation preserves a served 440px creative without page overflow or a new request. These are desktop Chromium viewport simulations, not physical-device tests. Actual BFCache restoration across browser versions is not proven by synthetic persisted events.

Loan ad/Next geometry is normal flow, with small spacing and a 250px reserved rectangle; no viewport-height positioning or automatic flex margin remains on the loan section. Blog double-padding is fixed. The site-wide app shell still has its original minimum viewport height, which does not position Next.

Google demo URL fragments were also attempted once per format using the revised-source preview. The interstitial demo followed Next to loan-amount without an observed overlay; the anchor demo returned empty configured slots. Do not interpret these attempts as successful native show/close verification.

## 18-19. Production deployment and Cloudflare cache

The revised release is **not deployed**. Live HTML advertises config `20260922-12`, loader `20260922-6`, manager `20260922-11`. These served JS assets match pre-audit HEAD after newline normalization. HTML: `CF-Cache-Status: DYNAMIC`, `Cache-Control: public, max-age=0, must-revalidate`. JS: `CF-Cache-Status: REVALIDATED`, `Cache-Control: public, max-age=14400, must-revalidate`.

This proves the site serves the pre-audit deployment. It does **not** prove Cloudflare retained an already-deployed fix. No random query strings or purge were used. Local HTML references a single intentional release identifier `20260923-1` for the changed ad assets/CSS. Publish those files together and compare bodies/headers again; only investigate/purge caching if deployed bytes still differ.

## 20. Remaining GAM-side work and acceptance limits

- Inspect the response-configured Latest3 format in GAM, including codeless ad settings and delivered creative setup, and resolve duplicate ownership with the explicitly tagged interstitial. No account setting was changed here.
- Confirm eligible fixed-size creatives/line items target the existing five loan units and blogTop unit, including 440x250 where intended; confirm _02/_03/_04/_05 use web-interstitial format and supported creatives. Do not invent new unit paths.
- Use captured response identifiers and GAM Delivery Diagnostics to establish reasons for empty results. This environment has no authenticated GAM delivery-diagnostics account session.
- Validate real filled rendering for every remaining display unit, native anchor overlap/dismissal, interstitial display/dismiss/navigation and genuine frequency-capped behavior after deployment. No code can promise an impression on every Next click.
- No consent manager or TCF integration was present in repository code. Existing behavior is preserved; no storage consent is fabricated and no cap/localStorage key is cleared. Validate consent-restricted environments using the site's actual production consent setup.

## Debugging and evidence

Production console logging defaults off (`AdConfig.debug: false`). `AdManager.getDiagnostics()` exposes page, release, bootstrap state/error, each record, size mapping, request/response/render counts, isEmpty, actual rendered size, response identifier, iframe load/viewability facts and bounded event history. It excludes application amount/rate/months query values. Enable debug before reproduction for `[GPT]` logs, and use `AdManager.openConsole()` for Publisher Console.

Evidence files:

- `tests/ad-audit.py`, `tests/ad-audit-results.json`: controlled regression harness and matrix.
- `tests/ad-live-audit.py`, `tests/ad-live-results.json`: real local GPT observations plus initial live production probe.
- `tests/ad-production-results.json`: unmodified production observations on all 14 pages.
- `tests/ad-origin-preview-results.json`: revised-source preview with real GPT on the site origin (browser-only substitution).
- `tests/ad-demo-cache-results.json`: demo attempts, cache/body comparison and response-originated external-unit evidence.

Official references consulted (current pages retrieved for this audit): [GPT reference](https://developers.google.com/publisher-tag/reference), [responsive sizes](https://developers.google.com/publisher-tag/guides/ad-sizes), [web interstitial sample](https://developers.google.com/publisher-tag/samples/display-web-interstitial-ad), [web interstitial serving and demo behavior](https://support.google.com/admanager/answer/9840201), [anchor sample](https://developers.google.com/publisher-tag/samples/display-anchor-ad).
