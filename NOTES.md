# Notes

## What I built

For **Part A** (in `app/`), I went with **React, TypeScript, Vite, TanStack Query, and Tailwind**. I picked Vite over Next.js since this is just a client-side dashboard hitting a third-party API. There's no need for server rendering, SEO, or API routes, so keeping it as a straightforward SPA made the most sense.

- **The core table:** Built a cursor-paged table with infinite scroll, plus a fallback "Load more" button.
- **Polish & UX:** It's fully responsive (the table drops to 3 columns on mobile), has a sticky filter bar, respects `prefers-reduced-motion`, and manages focus properly.
- **Performance:** I spent some time profiling the dashboard. Memoizing the rows completely eliminated long tasks during live updates, even with 2,000 rows loaded (bringing it from 11 long tasks down to 0).

For **Part B**, I made 13 performance fixes (one per commit), measuring the before-and-after with `scripts/perf-measure.mjs`. The full breakdown is in [`PERF.md`](PERF.md).

## Key engineering decisions

I made a few specific architectural choices to handle the quirks of the API and improve the UX:

### 1. The URL is the single source of truth for view state

Search, filters, and the currently open event live entirely in the query string, read through `useSyncExternalStore`. There is no Redux and no duplicated `useState`. Because there's nothing to manually keep in sync, refreshing, hitting Back/Forward, and sharing links all work by default. Input is validated (e.g., an unknown `status` is ignored), and keys are written in a fixed order so the same view always produces the exact same URL. Typing replaces the history entry, while picking a filter pushes a new one—meaning the Back button undoes actual decisions, not individual keystrokes.

### 2. Retry only what can recover (one rule drives behavior and UI)

I designed around the API's actual behavior (like the ~1 in 8 failure rate and 400/404 messages). Every failure is mapped to an `ApiError` with a `retryable` flag (for network drops, 429s, or 5xx errors). That single flag controls both whether TanStack Query retries (twice, with backoff and jitter) and whether the UI offers a "Try again" button. A 404 on a detail link fails instantly instead of wasting ~7 seconds on pointless retries. If a later page fails, it just keeps the rows you've already loaded and pauses infinite scroll so we don't hammer a broken API.

### 3. Live mode: one acceptance rule + a separate feed

When watching the `/stream` endpoint, I noticed it replays past events, resends IDs, reorders events, and sometimes throws a 500 on connect. I handled all of this with a single rule: **accept an event only if it's newer than the newest loaded row and its ID hasn't been seen yet.** For the UI, I initially had new rows auto-inserting into the top of the table, but the constant jumping was distracting. Instead, new events land in a separate fixed-height feed and only merge into the table when you click "Show in list", ensuring the list never moves out from under the reader.

## Trade-offs & known gaps

- **No virtualization.** The DOM gets pretty heavy as you scroll (around 48k nodes at 2,000 rows).
- **No automated tests.** I just relied on scripted headless-Chrome runs against the real API, using proxies to simulate slow, offline, or failing states.
- **Live rows have no cap.** If you leave a session open for a really long time, the live rows will just keep accumulating without a cap.
- **Border contrast.** The contrast ratio on inputs and button borders is a bit low (1.26:1, missing the 3:1 guideline), though the text itself passes AA.
- **Detail panel layout.** The detail panel just overlays the table rather than squishing the layout to fit side-by-side.
- **Part B:** `PERF.md` has the raw numbers but no DevTools screenshots. I also left the ~200ms spent generating the 100k mock events as is.
- **Repo history.** The repo URL in the original brief 404'd, so my git history just starts from the provided download and doesn't include previous context.

## How I used AI tools

I used **Claude Code** (Anthropic's coding agent) throughout the process, and I want to be specific about how we split the work:

- **Claude did:** Wrote most of the code, the headless-Chrome measurement and verification scripts, and the initial drafts of `PERF.md` and these notes. It also explained each change so I could review it.
- **I did:** Directed the work: set the scope, chose Tailwind, opted for the sticky search bar, made the UX call to separate the live feed so the table wouldn't jump around, and decided how to chunk the commits. I reviewed all the changes in the browser and pushed back when things needed adjusting.

**Part B was definitely the most AI-heavy part**, as I'm still building my intuition for browser performance optimization. The fixes I feel most confident explaining myself are the image resizing, deferring render-blocking scripts, fixing the layout thrashing in the scroll handler, and cleaning up the leaked timers in the ticker.
