# Perf Clinic

## Summary

| Metric | Before | After |
|---|---|---|
| Downloaded on first load | 6,470 KB | 471 KB |
| First Contentful Paint | 3.16 s | 0.22 s |
| Largest Contentful Paint | 6.14 s | 0.66 s |
| Load event | 6.09 s | 0.63 s |
| Main-thread blocking during load (long tasks over 50 ms) | 2,278 ms | 312 ms |
| Scrolling the list, average frame | 184 ms (≈5 fps) | 16.8 ms (60 fps) |
| Frozen time per keystroke in search | 692 ms | 0 ms (debounced; one search ≈ 26 ms) |
| Layouts per second while idle | 60 | 0 |
| Live ticker timers still running after closing it 5× | 5 | 0 |

**How I measured.** I read the code for suspects, then confirmed and quantified each one with `scripts/perf-measure.mjs`. The script drives headless Chrome through the Chrome DevTools Protocol, the same data source the DevTools panels use, under fixed conditions: DevTools "Fast 4G" (9 Mbps, 60 ms RTT), 4× CPU slowdown, cache disabled, 1440×900, median of 3 runs. It records transfer sizes and paint timings (Network panel / Web Vitals), long tasks and frame times (Performance panel), layout count and JS heap (Performance monitor), and event listeners (the Console's `getEventListeners`). For a few items I also took CPU profiles (the Performance panel's Bottom-Up view) or wrote small before/after benchmarks; those are noted below. I measured before and after every fix and made one commit per fix. To reproduce: `npm run perf-clinic`, then `node scripts/perf-measure.mjs http://localhost:5174/`.

---

### 1. Scrolling the list runs at about 5 fps
- **Symptom:** Scrolling stutters badly everywhere on the page, worst over the results list.
- **How I found it:** Frame timing while scrolling the list (rAF deltas in the harness, as in a Performance panel recording) showed every frame taking about 184 ms. Reading `onScroll` showed why.
- **Root cause:** On every scroll event, `onScroll` (1) loops over all 200 rows, removing a class and then calling `getBoundingClientRect()`. Alternating writes and reads forces a fresh layout per row (layout thrashing). (2) It filters all 100,000 events, building a `Date` for each, to count the calls in the focused minute. (3) It changes the top bar's `padding` and the progress bar's `width`, which both trigger layout. All of this ran on every scroll event.
- **Fix:** The focused row now comes from an `IntersectionObserver` with a middle-of-viewport `rootMargin`: the browser reports rows entering or leaving the band, with no measuring in JS. Per-minute counts are computed once into a `Map`. The remaining scroll work is batched into one `requestAnimationFrame` per frame. The progress bar uses `transform: scaleX()`. The top bar only toggles a class when it crosses the threshold. The listener is `passive`.
- **Before / after:** average frame while scrolling **183.6 ms → 16.7 ms**; frames over 50 ms **119 of 119 → 0**.

### 2. Typing in search freezes the page for 0.7 s per key
- **Symptom:** Each keystroke in the search box takes about 0.7 s to appear; typing "billing" locks the page for about 5 s.
- **How I found it:** The harness dispatches `input` events for "b" … "billing" and times each one: about 700 ms of blocked main thread per keystroke. Reading `search()` showed the cause.
- **Root cause:** `search()` serialises all 100,000 events with `JSON.stringify` and lowercases them on every keystroke, then sorts the matches with a comparator that builds two `Date` objects per comparison (about 1.7 M). It ran synchronously on every `input` event.
- **Fix:** Sort once, newest first, comparing ISO strings (same format, so string order equals time order). Build a lowercase search string per event once, from the values only. Debounce input by 150 ms. Empty search returns the pre-sorted list without filtering.
- **Before / after:** frozen time per keystroke **705 ms → 0 ms**; one search plus render **454 ms → 222 ms** at this step, and **26 ms** after fixes 8 and 10. Main-thread blocking during load also fell **2,335 ms → 930 ms**, because the first render no longer ran the slow search.
- **Behaviour note:** the old search also matched JSON *key names*, so typing "latency" or "id" matched every one of the 100,000 events. Results are now identical to the old search for real queries (I checked counts and order for "billing", "sql", "blocked", "priya", "zzz") and no longer match key names.

### 3. Blank page for 2.6 s: data generated before first paint
- **Symptom:** A blank dark screen for several seconds before anything appears.
- **How I found it:** First Contentful Paint was still 2.6 s after removing the big downloads. `index.html` loads `config.js` synchronously in `<head>`, and a CPU profile of the load shows `buildActivity` (the 100,000-event generator) taking about 200 ms at 4× CPU.
- **Root cause:** `config.js` is a classic synchronous script in `<head>`, and it generates 100,000 events. The browser can't parse or paint the rest of the HTML until it finishes. `app.js` at the end of `<body>` was also synchronous.
- **Fix:** Load both scripts with `defer` from `<head>`. They download in parallel, run in order after parsing, and no longer block the first paint.
- **Before / after:** First Contentful Paint **2.64 s → 0.20 s**.

### 4. 4.2 MB hero image
- **Symptom:** The large header image appears long after everything else; on slower connections the page keeps loading for seconds.
- **How I found it:** Resource transfer sizes: `hero.png` is 4.2 MB, about two-thirds of all bytes, and the Largest Contentful Paint entry (`PerformanceObserver`) is this image.
- **Root cause:** A 1700×950 lossless PNG of a grainy gradient, served at the same size to every screen, with no `width`/`height`.
- **Fix:** WebP at 800, 1200 and 1700 px (20 KB / 92 KB / 374 KB), with `srcset` and `sizes` so the browser picks the right one, `width`/`height` to reserve space, and `fetchpriority="high"` because it's the LCP image. I checked visually that the result matches the original.
- **Before / after:** transfer **6,470 KB → 2,673 KB**; LCP **6.14 s → 3.18 s** (0.66 s once the other fixes landed).

### 5. Agent avatars: 1.9 MB of images, plus 600 forced layouts while they load
- **Symptom:** Slow load; the agent grid stutters while avatars appear.
- **How I found it:** Transfer sizes: twelve 320×320 PNGs of about 160 KB each, displayed at 48×48. Reading the code: `equalizeCardHeights` is attached to every avatar's `load` event. I timed one call and counted layouts with the Performance monitor's `LayoutCount`.
- **Root cause:** (1) Oversized images. (2) `equalizeCardHeights` reads `offsetTop`/`offsetHeight` of all cards inside a loop over all cards while writing `style.height` between reads, which is an O(n²) read/write pattern. It ran once per avatar load (24×) and on every resize. One call took 11 ms and forced 24 layouts.
- **Fix:** 96×96 WebP avatars (sharp at 2× density) with `width`/`height`, `loading="lazy"` and `decoding="async"`. Removed `equalizeCardHeights`: CSS grid already stretches items in a row to equal height once `align-items: start` is gone, and `min-height` replaces the JS minimum.
- **Before / after:** avatars **1.9 MB → 48 KB**; total transfer **2,355 KB → 469 KB**; load event **2.71 s → 1.02 s**; about 600 forced layouts during load → 0.

### 6. 327 KB stylesheet that the page doesn't use
- **Symptom:** Slower first paint, especially on slow connections.
- **How I found it:** `theme.css` is 327 KB of utility classes. I compared its 1,437 class selectors with every class used in `index.html` and `app.js`: **zero** overlap. You can confirm this in the DevTools Coverage panel.
- **Root cause:** A full utility framework linked as a render-blocking stylesheet. The browser must download and parse it before painting.
- **Fix:** Removed the `<link>` and the file.
- **Before / after:** transfer **−319 KB**; First Contentful Paint **3.18 s → 2.64 s** (at that step).

### 7. Live ticker keeps running after it's closed
- **Symptom:** The longer you use the page and toggle "Show live calls", the more CPU and memory it uses. Esc handling also piles up.
- **How I found it:** Reading `openTicker`/`closeTicker`, then confirming in the harness: it wraps `setInterval`/`clearInterval` to count live timers, uses `getEventListeners(window)` to count listeners, and samples JS heap size while the ticker is open.
- **Root cause:** `openTicker` starts a `setInterval` whose id is never stored, so `closeTicker` can't clear it, and closed panels keep receiving rows forever. It adds `resize` and `keydown` listeners on every open and never removes them. `renderedTickerRows` caches every row ever rendered in a `Map` that never shrinks.
- **Fix:** Store and clear the interval on close. Register the panel's listeners with one `AbortController` and call `abort()` on close. Replace the JS `max-height` resize handler with CSS `calc(100vh - 120px)`. Drop the row cache (a 3-span row is cheaper to create than to clone from a growing cache).
- **Before / after (after 5 open/close cycles):** timers still running **5 → 0**; `keydown` listeners left behind **5 → 0**; heap growth while open **75 KB → 15 KB per 10 s** (the remainder is normal GC noise).

### 8. Summary cells shrink their font in a layout loop
- **Symptom:** Every search and every window resize hitches.
- **How I found it:** Timing each part of a render separately: `fitSummaries` alone took 235 ms of the roughly 260 ms render. Each loop iteration reads `scrollWidth`.
- **Root cause:** For each of the 200 summary cells, `fitSummaries` lowers the font size 0.5 px at a time and reads `scrollWidth` after each step. Each read forces layout, so 200 cells × several steps of layouts, on every render and resize.
- **Fix:** Removed it. The CSS already truncates with `text-overflow: ellipsis`, and summaries now use a fixed 13 px.
- **Before / after:** search plus render **213 ms → 38 ms**; one `resize` event **242 ms → 3 ms**.

### 9. "Viewed" tracking writes localStorage 200 times per render, and the data grows forever
- **Symptom:** Searching gets slower the more the page has been used.
- **How I found it:** Reading `rememberViewed`, then a benchmark of old vs new code side by side in the same page, starting from 20,000 stored ids.
- **Root cause:** Each render re-parsed the whole stored array, checked every row with `Array.includes` (O(n·m)), and called `localStorage.setItem` **inside the loop**: 200 synchronous writes of the entire, ever-growing JSON per render, with no upper bound.
- **Fix:** Load once into a `Set` (O(1) lookups), write once per render, and keep only the most recent 5,000 ids.
- **Before / after (20,000 ids already stored):** tracking cost per render **290 ms → 1.3 ms**; stored data **310 KB and growing → capped at 78 KB**.

### 10. Work at startup that could wait (part self-inflicted by fix 2)
- **Symptom:** After the fixes above, the main thread was still blocked for about 0.7 s while loading.
- **How I found it:** CPU profile of the load: 325 ms in building the search strings (added by fix 2), plus the sort, the per-minute counts and the id map, and 29 ms in `formatTime`.
- **Root cause:** Fix 2 moved search work to page load. The per-minute counts and the id map are only needed once the user scrolls or hovers. `formatTime` constructed a new `Date` and a locale formatter for every row.
- **Fix:** Build the search strings in 500-event chunks inside `requestIdleCallback` (a synchronous fallback covers a search that arrives first). Build the per-minute counts and the id map on first use. `formatTime` slices the ISO string (`HH:MM:SS`, UTC, same output).
- **Before / after:** long tasks during load **729 ms → 313 ms**; LCP **1.06 s → 0.65 s**; load event **1.03 s → 0.62 s**; search plus render **36 ms → 26 ms**.
- **Not fixed on purpose:** about 200 ms of what remains is `buildActivity` generating the 100,000 fake events. In a real app that data would come from a server.

### 11. Alerts marquee forces a layout every frame
- **Symptom:** The page uses CPU even when nobody touches it; scrolling competes with the animation.
- **How I found it:** The Performance monitor's layout count (`LayoutCount`) kept rising at about 60 per second with the page idle. The only thing running was the `alerts-scroll` keyframe animation on `left`.
- **Root cause:** The keyframes animate `left`, a layout property, so the browser recomputes layout on every frame.
- **Fix:** Animate `transform: translateX()` instead. It runs on the compositor, with no layout or paint. `container-type: inline-size` lets the keyframes keep the original distances relative to the container (`100cqw` → `-120cqw`). Same speed (checked: about 170 px/s).
- **Before / after:** layouts per second while idle **60 → 0**.

### 12. Hover preview scans 100,000 events on every mouse move
- **Symptom:** Moving the mouse over the list feels slightly sticky, worse on slower machines.
- **How I found it:** The harness dispatches `mousemove` over 50 rows: 6.9 ms per move. Reading `showPreview` showed an `Array.find` over all events and `top`/`left` positioning. A side-by-side benchmark isolated the lookup. The `wheel`/`touchstart` listeners are registered without `{ passive: true }`.
- **Root cause:** A linear `find` over 100k events per `mousemove` (which fires 60–120×/s); positioning via `top`/`left`; and non-passive `wheel`/`touchstart` listeners, which make the browser wait for JS before it scrolls.
- **Fix:** `Map` lookup by id (built on first hover). Update the text only when the hovered row changes. At most one update per frame via `requestAnimationFrame`. Position with `transform`. Mark `wheel`/`touchstart` as `{ passive: true }`.
- **Before / after:** lookup per mouse move **1.68 ms → ~0 ms**; work in the `mousemove` handler **6.9 ms → 0 ms** (one rAF callback per frame instead).

### 13. Text invisible until the web font downloads
- **Symptom:** On slow connections, headings and text stay invisible for a moment after the layout appears.
- **How I found it:** Resource timing on Slow 4G (1.6 Mbps, 150 ms RTT): the 64 KB font is requested at about 410 ms and arrives at about 940 ms. Screenshots polled during load show the heading missing until the font arrives.
- **Root cause:** `@font-face` had no `font-display`, so Chrome hides text for up to 3 s while the font loads.
- **Fix:** `font-display: swap` shows text immediately in the fallback font and swaps when IBM Plex arrives (CLS stays 0). **Tried and rejected:** `<link rel="preload">` for the font. It made First Contentful Paint *worse* (0.20 s → 0.64 s on Fast 4G), because the 64 KB font competed with the render-blocking CSS for bandwidth.
- **Before / after (Slow 4G, screenshot polling):** heading first visible at **≈1.4 s → ≈0.6 s**.
