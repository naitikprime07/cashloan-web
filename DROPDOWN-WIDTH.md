# Current fluid update - release 20260923-3

The owner confirmed that the five loan-flow GAM units have fluid inventory. Their configuration now requests `sizes: ["fluid"]` only. Fixed 300/250 rectangle fallbacks have been removed from these five placements so they cannot select the narrower fixed creative shown in the screenshot. No inventory path changed.

`js/ad-manager.js` now accepts a fluid-only slot and skips the fixed-rectangle SizeMappingBuilder for it. BlogTop still uses the existing rectangle sizes/mapping. Interstitial, anchor, navigation, calculators, pixels and the GPT bootstrap are unchanged.

The loan-only publisher slot in `css/style.css` has width/max-width 100%, border-box sizing, automatic height and visible overflow. No iframe/image resizing, crop, scale or fixed-height creative constraint is applied. The parent is still the same padded content column as Next. Existing 250px minimum reservation remains; native creative height is controlled by GAM and can grow naturally. Page structure and button styling are unchanged.

The five loan HTML files reference config/manager/CSS release `20260923-3`. This update is local, not deployed.

Validation:
- 126 controlled cross-format cases passed, including fixed BlogTop regression checks and native null/no-fill handling.
- 45 fluid width cases passed across all five pages at 320/360/375/390/393/412/430/480/1440 viewport widths. Controlled fluid creative widths matched Next: 280/320/335/350/353/372/390/440/440px. No horizontal scrollbar or overflow, one display/request, and all five Next destinations passed.
- Real GAM with the revised local source substituted only inside the test browser: all 45 display slots successfully requested fluid once and returned NO_FILL. No page JavaScript exceptions, invalid-size errors or slot duplication were recorded. This does NOT verify a live filled fluid creative. No retries were performed and no serving reason beyond no-fill was available.
- Real fill requires an eligible responsive native creative targeted to these exact existing units. Owner confirmation of fluid support does not establish current delivery eligibility. The earlier fixed-size fill observations below do not prove fluid fill.

Evidence: `tests/dropdown-width-fluid-controlled.json`, `tests/dropdown-width-fluid-preview.json`, and the updated `tests/ad-audit-results.json`. Harnesses support both fixed and fluid fixtures; those fixtures are test-only.

[Google GPT fluid sizing](https://developers.google.com/publisher-tag/guides/ad-sizes) describes native creatives using the parent width and content-driven height.

---

The report below is the earlier fixed-size baseline, retained as historical evidence. Its statements about unchanged JavaScript and fixed dropdown sizes are superseded above.

# dropdownNext width verification - 2026-09-23

## Root cause

The visible narrow area is the fixed GAM creative, not a narrower publisher wrapper. Before editing, all five loan pages already had matching wrapper/slot/Next boundaries at every requested viewport. Real production iframe measurements confirmed 250x250 or 300x250 creatives centered inside the wider available area. There is no runtime placeholder or custom fallback ad on these pages; the controlled test fixture exists only in the test harness. No screenshot image was attached to this request, so this conclusion is based on reproduced browser measurements rather than an unseen screenshot.

At a 390px viewport the actual Next button and slot are 350px, not 390px, because their shared .screen parent has 20px padding on each side. A natural 300px creative leaves 25px per side. Increasing the already-correct wrapper width cannot remove that space without changing inventory or distorting the creative.

## Exact changes

- `css/style.css`: replace `.screen > .inline-ad-container > div { max-width: 440px; }` with the loan-only rule below. The slot now follows the parent instead of carrying a separate fixed cap. This is a constraint cleanup, not a claim that the previous measured slot was narrower.
- `index.html`, `loan-amount.html`, `employment-type.html`, `loan-type.html`, `proceed.html`: update only the CSS release reference to `css/style.css?v=20260923-2`.
- Added `tests/dropdown-width.py`, four `tests/dropdown-width-{before,after,production,preview}.json` measurement files, and this report.

```css
.screen > .inline-ad-container > [data-ad-logical] {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
```

No JavaScript or GAM configuration changed. The existing .screen parent supplies the width and padding; no new viewport calculation, padding, negative margin, absolute positioning, scale, zoom, cropping or iframe rule was introduced. BlogTop, anchor, interstitial, dialogs, pixels and navigation were untouched. Next remains in normal flow.

## GAM sizing retained

Configured sizes remain `[[440,250],[300,250],[250,250]]`. Existing SizeMappingBuilder output:

```js
[
  [[480, 0], [[440,250],[300,250],[250,250]]],
  [[340, 0], [[300,250],[250,250]]],
  [[290, 0], [[250,250]]],
  [[0, 0], []]
 ]
```

The viewport mapping accounts for the existing 40px combined gutter. defineSlot fallback sizes are also filtered using the measured element width. The largest fitting size is eligible, while smaller fallbacks remain available. GAM can select a smaller eligible creative: array order does not guarantee largest-size delivery. The frontend does not stretch a smaller response or invent an arbitrary 350px creative size. Actual edge-to-edge creative artwork at every width needs suitable responsive/native inventory in GAM, beyond this container-only change. See [Google GPT ad sizes](https://developers.google.com/publisher-tag/guides/ad-sizes).

## Width and creative measurements

Each row was checked on index, loan-amount, employment-type, loan-type and proceed. Widths are rendered CSS pixels. Creative sizes below are real iframe observations from unmodified production and the revised-CSS browser preview; no-fill cases have no creative.

| Viewport | Next width | Wrapper/slot width | Largest eligible width | Real creative sizes observed | Wrapper gap each side | Creative whitespace each side |
|---|---|---|---|---|---|---|
| 320 | 280 | 280 | 250 | 250x250 | 0 | 15.0 |
| 360 | 320 | 320 | 300 | 300x250 | 0 | 10.0 |
| 375 | 335 | 335 | 300 | 300x250 | 0 | 17.5 |
| 390 | 350 | 350 | 300 | 300x250 | 0 | 25.0 |
| 393 | 353 | 353 | 300 | 300x250 | 0 | 26.5 |
| 412 | 372 | 372 | 300 | 300x250 | 0 | 36.0 |
| 430 | 390 | 390 | 300 | 300x250 | 0 | 45.0 |
| 480 | 440 | 440 | 440 | 300x250, 440x250 | 0 | 0.0, 70.0 |
| 1440 | 440 | 440 | 440 | 300x250 | 0 | 70.0 |

All 45 page/viewport combinations aligned on both edges before and after the CSS change. No page overflow, slot horizontal scrollbar or additional wrapper whitespace was observed. Filled creatives retained their measured natural widths/heights, remained centered and were not transformed. All observed Next buttons use static positioning; their ad-to-button gaps remain the existing layout spacing.

## Validation results and limits

- Controlled baseline: 45 cases passed. Controlled revised CSS: 45 cases passed, including exact natural creative dimensions, no vertical Next shift on render, one GPT script, one display call and request, repeated-init protection, and all five original Next destinations.
- Unmodified production: all 45 pages loaded with HTTP 200 and aligned; 39 display fills and 6 no-fill responses. This is direct observation of production before this CSS change was deployed.
- Revised CSS with real GAM: all 45 cases aligned; 17 display fills and 28 no-fill responses. Each configured display recorded one request and one render response, with one GPT loader. This used local source substitution on the production origin in the test browser only, **not deployment**. Different fill counts are separate serving observations, not proof of a CSS effect.
- No page JavaScript exceptions occurred in either real pass. GPT still reported the existing external `/23338698373/Latest3` duplicate interstitial warning. This was not changed by the dropdown-only task, so the tests are not described as entirely console-warning-free.
- These are Chromium viewport tests using fresh page loads at 320/360/375/390/393/412/430/480/1440, not physical-device or orientation-change certification. Already-served fixed creatives are not resized or replaced by this change.
- No retries, GPT reloads, duplicate slots, altered inventory paths or changed Next destinations were added. No CSS stretch/scale/crop hack was used.

## Reproduce

```text
python tests/dropdown-width.py --mode controlled --label after
python tests/dropdown-width.py --mode production --label production
python tests/dropdown-width.py --mode preview --label preview
```

The controlled fixture is used only in controlled mode. Production mode reads the deployed site. Preview mode substitutes local files inside Chromium while leaving Google ad requests real. The Python Playwright package and Chromium are test-only prerequisites.

The scoped frontend change is ready locally. It does not make a 300px fixed creative fill a 350px slot, and it has not been deployed.
