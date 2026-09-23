# Current all-ad check - 2026-09-23

Read-only audit of 14 pages at a 390x844 Chromium viewport. Production and browser-only local-source preview are separate observations. No application configuration was changed in this check.

23 page-scoped slots: 14 display, 7 interstitial and 2 anchor. There are 12 unique GAM ad-unit paths. Thirteen logical interstitial triggers map to seven page slots; all seven blog cards share one physical interstitial.

Production: 13 RENDERED, 10 NO_FILL. Local-source preview: 2 RENDERED, 21 NO_FILL. Every configured slot recorded one request and one render response in each pass. One GPT loader per page; no local config errors or page JavaScript exceptions. No null definitions observed. RENDERED on an interstitial is a nonempty response, not proof of a displayed/dismissed impression.

All five fluid loan displays returned no-fill in BOTH passes. This prevents confirmation of actual fluid creative rendering. Do not mark these as proven serving. Use GAM Delivery Diagnostics to check eligible native creatives and targeting for the five existing units. No-fill alone does not identify demand, inventory, optimization or frequency-cap reasons.

GPT again warned about /23338698373/Latest3: format already created. Prior response tracing located this extra format in a Google ad response; the unit is not configured in publisher source. GAM-side duplicate format ownership remains unresolved.

## Complete production result list

| Page | Logical registry ID | Type | GAM unit | Sizes | Result |
|---|---|---|---|---|---|
| blog-auto-loan | `display-blog-top-auto-loan` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | NO_FILL |
| blog-business-loan | `display-blog-top-business-loan` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| blog-gold-loan | `display-blog-top-gold-loan` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| blog-home-loan | `display-blog-top-home-loan` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| blog-payday-loan | `display-blog-top-payday-loan` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| blog-personal-loan | `display-blog-top-personal-loan` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| blog-student-loan | `display-blog-top-student-loan` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| blogs | `display-blog-top-blogs` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| blogs | `interstitial:blogs` | interstitial | `/23338698373/cashloanplatform_interstitial` | GPT-managed | RENDERED |
| blogs | `blogBottomAnchor:blogs` | anchor | `/23338698373/cashloanplatform_anchor_001` | GPT-managed | RENDERED |
| eligibility-check | `display-blog-top-eligibility-check` | display | `/23338698373/cashloanplatform_display_blogtop` | [[300, 250], [250, 250]] | RENDERED |
| eligibility-check | `interstitial-apply-loan` | interstitial | `/23338698373/cashloanplatform_interstitial` | GPT-managed | RENDERED |
| eligibility-check | `blogBottomAnchor:eligibility-check` | anchor | `/23338698373/cashloanplatform_anchor_001` | GPT-managed | RENDERED |
| employment-type | `display-dropdown-next-employment-type` | display | `/23338698373/cashloanplatform_native_in_content_03` | ["fluid"] | NO_FILL |
| employment-type | `interstitial-next-4` | interstitial | `/23338698373/cashloanplatform_interstitial_04` | GPT-managed | NO_FILL |
| index | `display-dropdown-next-index` | display | `/23338698373/cashloanplatform_native_in_content_01` | ["fluid"] | NO_FILL |
| index | `interstitial-next-1` | interstitial | `/23338698373/cashloanplatform_interstitial` | GPT-managed | NO_FILL |
| loan-amount | `display-dropdown-next-loan-amount` | display | `/23338698373/cashloanplatform_native_in_content_02` | ["fluid"] | NO_FILL |
| loan-amount | `interstitial-next-2` | interstitial | `/23338698373/cashloanplatform_interstitial_02` | GPT-managed | NO_FILL |
| loan-type | `display-dropdown-next-loan-type` | display | `/23338698373/cashloanplatform_native_in_content_04` | ["fluid"] | NO_FILL |
| loan-type | `interstitial-next-3` | interstitial | `/23338698373/cashloanplatform_interstitial_03` | GPT-managed | NO_FILL |
| proceed | `display-dropdown-next-proceed` | display | `/23338698373/cashloanplatform_native_in_content_05` | ["fluid"] | NO_FILL |
| proceed | `interstitial-next-5` | interstitial | `/23338698373/cashloanplatform_interstitial_05` | GPT-managed | RENDERED |

## Interstitial triggers

| Trigger ID | Source | Existing unit |
|---|---|---|
| `interstitial-next-1` | index | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-next-2` | loan-amount | `/23338698373/cashloanplatform_interstitial_02` |
| `interstitial-next-3` | loan-type | `/23338698373/cashloanplatform_interstitial_03` |
| `interstitial-next-4` | employment-type | `/23338698373/cashloanplatform_interstitial_04` |
| `interstitial-next-5` | proceed | `/23338698373/cashloanplatform_interstitial_05` |
| `interstitial-blog-1` | blogs | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-blog-2` | blogs | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-blog-3` | blogs | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-blog-4` | blogs | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-blog-5` | blogs | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-blog-6` | blogs | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-blog-7` | blogs | `/23338698373/cashloanplatform_interstitial` |
| `interstitial-apply-loan` | eligibility-check | `/23338698373/cashloanplatform_interstitial` |

The existing numbering is preserved: employment-type uses Next 4 / _04; loan-type uses Next 3 / _03. Apply Loan is generated on eligibility-check. Static article pages have their own display slot, not an Apply Loan interstitial.

Evidence: `tests/all-ads-current-results.json` contains each page's slot counters, observed sizes, response identifiers, GPT assets, HTTP requests, warnings and JavaScript errors. `tests/all-ads-current-config.json` captures the configured mapping. Run `python tests/all-ads-check.py` to reproduce; the preview substitutes files only inside the test browser and does not deploy them.

No guarantee of future fill, frequency-cap eligibility, or native-format show/dismiss is inferred from these snapshots.

Controlled regression: 126 cases plus boundary, failure and navigation checks passed on the current source. This is not evidence of real GAM fill.

A production resource emitted ERR_NAME_NOT_RESOLVED; the failed resource URL was not captured by this focused pass, so its source remains unidentified. Captured GPT script/ad responses were HTTP 200 and every configured slot returned a render result. This run is not described as console-error-free.
