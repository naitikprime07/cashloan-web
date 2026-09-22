# Independent display placements ? 2026-09-22

This update supersedes the shared display configuration IDs in the earlier architecture audit. The existing static AdConfig, single GAM bootstrap and shared AdManager remain in use. No interstitial/anchor lifecycle or navigation was changed.

## Exact placement map

| Logical ID | Page |
| --- | --- |
| display-dropdown-next-index | index.html |
| display-dropdown-next-loan-amount | loan-amount.html |
| display-dropdown-next-employment-type | employment-type.html |
| display-dropdown-next-loan-type | loan-type.html |
| display-dropdown-next-proceed | proceed.html |
| display-blog-top-blogs | blogs.html |
| display-blog-top-eligibility-check | eligibility-check.html |
| display-blog-top-personal-loan | blog-personal-loan.html |
| display-blog-top-auto-loan | blog-auto-loan.html |
| display-blog-top-student-loan | blog-student-loan.html |
| display-blog-top-business-loan | blog-business-loan.html |
| display-blog-top-payday-loan | blog-payday-loan.html |
| display-blog-top-home-loan | blog-home-loan.html |
| display-blog-top-gold-loan | blog-gold-loan.html |

All five `display-dropdown-next-*` entries retain `/23338698373/cashloanplatform_display_dropdownnext`. All nine `display-blog-top-*` entries retain `/23338698373/cashloanplatform_display_blogtop`. No separate verified GAM inventory was found in project configuration; no new inventory paths were invented. Account inventory was not accessible.

Each entry has its own object, page, adUnit and sizes array, so changing one placement does not mutate another. HTML data-ad-logical attributes, exact page maps and display registry keys all use the new IDs. The registry key for a display is now its globally unique logical ID (native format keys remain unchanged).

The dropdown sizes at the beginning of this task were accidentally triple-nested. That failed the existing width filter. The intended dimensions remain 300x250 and 250x250, now represented as [[300,250],[250,250]]. The manager validates numeric pairs and records a failed state with a diagnostic if malformed. It continues to select sizes using the actual wrapper width, rather than device width alone; no CSS scaling/cropping or size changes were introduced.

## Lifecycle

Every current-page placement loads at DOM readiness after shared GPT readiness, before any click is needed. All slots are defined before the first SRA display request. Each gets its own slot object and state, but shares the event dispatcher and bootstrap. Repeated init is guarded; there are no click/resize-driven display requests or retry loops. Nonempty render marks ready; empty render marks no-fill, preserving the footprint. Failed configuration/GPT does not block navigation. Reload creates a fresh document; persisted history events retain existing slots rather than creating duplicates.

## Verification

- Config check: 14 unique IDs, independent mutable size arrays and matching exact page maps.
- Browser matrix: 14 placements at 320/360/375/390/412/430/1440 widths. Tests check the actual wrapper width, path, config/DOM/registry ID agreement, slot/display/service/listener guards, fill/no-fill, stable wrapper, overflow, reload and simulated persisted history events. Simulated GPT/BFCache tests do not establish real creative delivery or a real BFCache hit.
- Production: all 14 corresponding cashloanplatform.com URLs returned HTTP 200 without a CSP response header. At about 1.5 seconds after DOMContentLoaded per page, personal-loan and auto-loan blog pages returned filled 300x250 blogTop render events. The other 12 display placements returned no-fill. One display render result was observed per page in this window; this is not proof of all future network behavior.
- Production still has no data-ad-logical attributes on these containers: it is running the older implementation, not this local update. New tags are NOT deployed or live-verified. This demonstrates stale deployment relative to local changes, not proof of a Cloudflare cache fault.
- No-fill on the retained valid paths requires checking GAM demand, targeting and creative eligibility if persistent; this cannot be fixed by inventing paths or repeated preload. No GAM-side inventory change is required merely to use these logical IDs.

## Files changed in this update

- js/ad-config.js: 14 separate entries and exact page maps.
- js/ad-manager.js: use unique display IDs, validate page/config mapping and size structure.
- Five flow HTML files: index, loan-amount, employment-type, loan-type, proceed.
- Nine Blog Top HTML files: blogs, eligibility-check, blog-personal-loan, blog-auto-loan, blog-student-loan, blog-business-loan, blog-payday-loan, blog-home-loan, blog-gold-loan.
- DISPLAY-ADS.md and AD-CONFIGURATION.md: report and link to current display naming.

All 14 HTML files now use ad-config.js and ad-manager.js version 20260922-3. Deploy these HTML files and both scripts together. GPT loader, CSS, pixel, form behavior, interstitial identifiers, anchor configuration and all destinations remain unchanged by this update.
