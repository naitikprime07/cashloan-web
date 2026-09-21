# One pixel event per persistent browser

## Configuration and scope

js/pixel-config.js retains Meta Pixel ID 2355848365180702 and the enabled switch.
Every HTML page includes pixel-config.js followed by pixel-loader.js exactly once.
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

The loader opens a readwrite transaction, checks the key and adds a marker only
when none exists. IndexedDB serializes these transactions across tabs. Only the
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
exactly-once receipt at Meta. The marker is committed BEFORE calling external
pixel code. If the browser crashes, closes, blocks the script or loses connectivity
after the claim, delivery may not happen. The marker is retained and there is no
automatic retry. A database failure causes no pixel dispatch; the loader never
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
