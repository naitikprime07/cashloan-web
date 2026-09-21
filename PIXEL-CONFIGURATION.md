# One pixel event per persistent browser

## Configuration and scope

js/pixel-config.js retains Meta Pixel ID 2355848365180702 and the enabled switch.
Only blogs.html includes pixel-config.js followed by pixel-loader.js. allowedPaths permits /blogs and /blogs.html (including trailing slashes). Other pages neither load nor fire the pixel.
No page URL is used as a marker. The existing CashLoanPixel.pageView() entry point
now means attempt the one-time event; repeated calls return the same promise.

## Persistent identity and atomic claim

js/pixel-loader.js owns initialization, storage and event dispatch.
IndexedDB database: cashloan-tracking
Object store: pixelClaims
Marker key: cashloan:unique-user:meta:2355848365180702

The record contains a random 128-bit browserId, claimedAt timestamp and event name.
It contains no form values or fingerprint and the browserId is not sent to Meta.
The scope is this origin and browser storage profile, not a person across devices.

The loader first reads the marker. If none exists, it loads the Meta library and
waits for its load event and active callMethod. It then opens a readwrite transaction,
checks the key again and adds a marker only when none exists. IndexedDB serializes these transactions across tabs. Only the
transaction that commits a new marker can initialize fbq and queue
trackSingle(ID, PageView). Subsequent documents do not load fbevents.js or call
fbq init/PageView. A global singleton and a shared pending promise prevent
duplicate/reentrant calls in one document. Existing fbq is reused; the optional
externallyInitialized setting still supports externally owned initialization.

## Navigation and persistence

Refresh, reload, all page transitions, blog clicks, back/forward (cached or not)
and reopening the browser use the same marker and send no additional events.
There are no ad, click, scroll, resize, DOM, popstate or pageshow tracking hooks.
Prerendered documents wait for activation before claiming.

## Delivery tradeoff

This is at-most-once application dispatch while the marker exists, not guaranteed
exactly-once receipt at Meta. The marker is committed AFTER the library loads but BEFORE calling init/trackSingle. If the browser crashes, closes, blocks the script or loses connectivity
after the claim, delivery may not happen. After event dispatch is attempted, the marker is retained and there is no automatic
retry. A script-load failure before dispatch leaves no marker, allowing a later
page load to try again. A database failure causes no pixel dispatch; the loader never
falls back to per-page/session tracking. 'queued' does not prove Meta receipt.

Clearing or browser eviction of site data, private browsing, a different browser,
device, profile or origin can produce a new identity. No browser-only implementation
can identify the same person permanently. External tag managers or unrelated pixel
scripts must not independently send PageView, because this marker governs only
this centralized loader. Access tokens are not used or stored.

## Verification

Development checks covered all pages, navigation, browser restart, concurrent tabs,
unavailable storage and blocked tracking. Their scripts and results were removed
from the deployment workspace at the owner's request; production tracking does
not depend on them.

Browser inspection:
CashLoanPixel.getState()
Expected after first dispatch: queued (or unavailable if blocked).
Expected on subsequent visits: already-recorded.
DevTools Application > IndexedDB > cashloan-tracking > pixelClaims shows the marker.
Do not delete it unless deliberately testing a new browser identity.

## Production investigation (2026-09-21)

The live config/loader matched the local pre-fix versions. Pixel ID was correct.
The homepage had no CSP header/meta policy, no captured CSP violations, and valid
JavaScript MIME types. Meta's base library and pixel configuration loaded with 200.
Meta's own BotBlocking configuration suppressed the HeadlessChrome diagnostic run.
A fresh browser using a standard Chrome user-agent sent exactly one GET /tr/ with
id=2355848365180702 and ev=PageView; Meta returned HTTP 200. Subsequent reload,
Blog List/detail navigation and back/forward produced no extra requests. HTTP 200
confirms endpoint response, not account-level Events Manager processing.

A separate local defect was corrected: the old loader saved its permanent claim
before the external library had loaded. Previously blocked attempts could therefore
consume the one-time marker without any event. The revised loader waits for actual
library readiness, then atomically claims and sends. Web Locks serialize the full
sequence where supported; IndexedDB remains the final cross-tab event guard.
Existing legacy markers are intentionally preserved: their delivery status cannot
be inferred safely, and deleting them automatically could duplicate real events.

HTML uses pixel-loader.js?v=20260921-3 for cache separation after deployment.
Deploy the updated loader AND HTML to enable the fix. The production script had a
four-hour cache policy during inspection. No Cloudflare rewrite/order issue was
observed. http redirects to https; www did not resolve in the diagnostic environment.

After deploying, inspect without changing storage:
await CashLoanPixel.getDiagnostics()

This returns origin, ID, state, marker presence, library readiness and last error.
It does not fire a new event or delete the marker. For first-visit verification,
use an isolated fresh profile; do not clear real visitor markers. Meta Events Manager
receipt/traffic permissions require access to the owner's account and were not verified.
\nCurrent scope: Blog List only. Existing persistent markers remain valid and are not reset by this scope change. Both pixel script URLs on blogs.html use version 20260921-3. Earlier platform-wide test results describe the previous scope.\n