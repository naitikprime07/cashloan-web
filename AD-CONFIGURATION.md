# CashLoan ad architecture

Production origin remains https://cashloanplatform.com. Unit paths and all four existing keys remain in js/ad-config.js.

## Root cause

The app is a centered 480px maximum column. Loan-step screens have 20px side padding. The old CSS selector targeting all div IDs starting with google_ads_iframe assigned every Google wrapper a 480px maximum and, above 480px, left:50%, right:auto, and translateX(-50%). This affected display containers and full-screen interstitials. The bottom-anchor script compounded this with guessed DOM selection, left offsets and resize listeners. All these overrides are removed.

The old config/loader selected sizes using browser width despite the narrow app; blogTop was incorrectly configured as rectangles. App-wide overflow clipping is removed. The overflowing blog-header decorative glow is bounded at its source. Ad ancestors have no transforms, filters, perspective or containment.

## Placement map

| Key | Pages and container | Position / lifecycle |
| --- | --- | --- |
| dropdownNext | index, loan-amount, loan-type, employment-type; unique gam-*-dropdown-next ID inside .screen > .inline-ad-container | Normal flow, display slot |
| blogTop | blogs, eligibility-check, seven blog detail pages; gam-blog-top inside .blog-top-ad-container under app or main | Normal flow, banner display slot |
| interstitial | four loan steps, proceed, blogs, eligibility-check | GPT-generated browser-level INTERSTITIAL |
| blogBottomAnchor | blogs and eligibility-check, existing data marker | GPT-generated browser-level BOTTOM_ANCHOR |

Other pages contain no ads. Separate HTML documents reuse gam-blog-top safely. Navigation is normal document navigation, not an SPA.

## Responsive sizing

The loader measures wrapper content width and filters sizes before both defineSlot and defineSizeMapping. GPT mapping uses a [0,0] entry with that measured subset because viewport breakpoints cannot represent this narrow container. ResizeObserver rebuilds only slots whose eligible size set changes, destroying the old slot first.

- Rectangle: 300x250 when it fits; 250x250 fallback. At 320px, step content is only 280px wide.
- Banner: 300x50/100 and 320x50/100. Configured 468x60, 728x90 and 970x90 are excluded unless actual content width permits them.
- Banner wrapper has 10px side padding: 300px available at 320px, maximum 460px. Larger banners never serve in this shell.
- No stretching, scaling, iframe overrides or creative clipping. Too-narrow and empty placements retain their reserved footprint.

## Lifecycle

Initialization and script injection are guarded. Pending records prevent duplicate definition/display before GPT loads. Destroy invalidates pending records. Display-only destruction leaves native slots independently managed. Back/forward restoration rechecks geometry without redisplaying unchanged slots.

Native anchors intentionally use the browser viewport; they cannot correctly be narrowed with publisher CSS. Only app bottom clearance and sticky action-bar offset change after fill. Clearance uses reported creative height plus 30px for controls, retained conservatively after dismissal until destruction/no-fill. Google wrappers remain untouched. The picker uses native dialog top-layer stacking, aligned to its select button, without extreme z-index values.

## Verification

Development checks were run during implementation. Their scripts and saved results were removed from the deployment workspace at the owner's request; the live site does not require them.


These tests verify layout, not GAM delivery. A real GPT smoke check loaded the library and registered display, anchor and interstitial slots without wrapper transforms. No filled native overlay was observed; real anchor presentation and interstitial dismissal still require a filled live session.


## Stable display footprints

CSS reserves 250px for dropdownNext (20px above, 16px below) and 100px for blogTop before GPT runs. Both rectangle sizes are 250px tall; 100px accommodates the tallest configured banner. Creatives are centered without scaling or clipping. Blank, delayed, failed, blocked and no-fill states preserve the same footprint. Each display slot overrides page-level collapse behavior using setConfig({ collapseDiv: "DISABLED" }); the global setting and native formats remain unchanged. No JavaScript positions the Next button.


## Oversized creative protection

Display slot elements now have explicit heights matching their reservations. Their SafeFrame settings disable overlay/push expansion. Render events validate returned sizes; scoped mutation and resize observers reject the whole creative if its rendered geometry escapes the slot or wrapper, including later expansion. Rejected slots remain blank for that document without retrying; their reserved footprint stays intact. Google-generated native anchor/interstitial elements are excluded. No creative is cropped or scaled.


## Blog List integration

blogs.html loads the existing bottom-anchor.js and opts in using data-bottom-anchor. The existing blogBottomAnchor key is reused. Native GPT positions the anchor at browser level; no narrow-shell positioning overrides are applied. The manager reserves creative height plus 30px after fill and no space for no-fill/unsupported formats. Its started flag and generation guard prevent duplicate queued initialization, slots and display calls. Ordinary page navigation scopes slots to each document; back/forward restoration retains the existing instance.


Pixel audit: no fbq, PageView, Meta base script, tracking utility or pixel ID/config exists in this checkout. The owner subsequently authorized a new static pixel feature. See PIXEL-CONFIGURATION.md; Platform-wide one-time tracking is configured with the supplied public pixel ID.
\nPixel scope update: all HTML pages now use the existing loader and one IndexedDB claim per identifiable browser/origin, not per-page events. PIXEL-CONFIGURATION.md supersedes the earlier Blog List-only pixel audit.\n
\nCurrent pixel scope: only Blog List loads tracking; /blogs and /blogs.html are allowed. Persistent one-time-browser protection is unchanged. This supersedes the earlier platform-wide scope.\n