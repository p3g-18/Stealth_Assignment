// Measures the Perf Clinic page in headless Chrome under fixed conditions.
// Usage: node scripts/perf-measure.mjs [url] [runs]
// Needs Google Chrome installed; uses only Node built-ins (Node 22+).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const URL_ARG = process.argv[2] ?? 'http://localhost:5174/';
const RUNS = Number(process.argv[3] ?? 3);
const CHROME =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9400 + Math.floor(Math.random() * 500);

// DevTools "Fast 4G" preset and "4x slowdown" CPU throttling.
const NETWORK = { offline: false, latency: 60, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (1.5 * 1024 * 1024) / 8 };
const CPU_SLOWDOWN = 4;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const target = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: 'PUT' })).json();
      const ws = new WebSocket(target.webSocketDebuggerUrl);
      await new Promise((r, j) => ((ws.onopen = r), (ws.onerror = j)));
      let id = 0;
      const pending = new Map();
      ws.onmessage = (m) => {
        const d = JSON.parse(m.data);
        if (d.id && pending.has(d.id)) pending.get(d.id)(d);
      };
      const send = (method, params = {}) =>
        new Promise((resolve) => {
          pending.set(++id, resolve);
          ws.send(JSON.stringify({ id, method, params }));
        });
      return { send, close: () => ws.close() };
    } catch {
      await sleep(200);
    }
  }
  throw new Error('could not connect to Chrome');
}

const EVAL_SAFE = (expr) => `(() => { try { return ${expr}; } catch { return null; } })()`;

async function run() {
  const profile = mkdtempSync(path.join(tmpdir(), 'perf-'));
  const chrome = spawn(CHROME, [
    '--headless=new', '--disable-gpu', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--window-size=1440,900', 'about:blank',
  ], { stdio: 'ignore' });

  try {
    const { send, close } = await connect();
    const evaluate = async (expression, awaitPromise = false) =>
      (await send('Runtime.evaluate', { expression, awaitPromise, returnByValue: true, includeCommandLineAPI: true })).result?.result?.value;

    await send('Page.enable');
    await send('Network.enable');
    await send('Performance.enable');
    await send('Network.setCacheDisabled', { cacheDisabled: true });
    await send('Network.emulateNetworkConditions', NETWORK);
    await send('Emulation.setCPUThrottlingRate', { rate: CPU_SLOWDOWN });
    await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

    // Instrument before page scripts run: paint metrics, long tasks, live timers.
    await send('Page.addScriptToEvaluateOnNewDocument', {
      source: `
        window.__perf = { lcp: 0, cls: 0, longTasks: 0, fcp: 0, liveIntervals: 0 };
        new PerformanceObserver((l) => { for (const e of l.getEntries()) __perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) __perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) __perf.longTasks += e.duration - 50; }).observe({ type: 'longtask', buffered: true });
        new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') __perf.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
        const si = window.setInterval, ci = window.clearInterval, live = new Set();
        window.setInterval = (...a) => { const id = si(...a); live.add(id); __perf.liveIntervals = live.size; return id; };
        window.clearInterval = (id) => { live.delete(id); __perf.liveIntervals = live.size; return ci(id); };
      `,
    });

    await send('Page.navigate', { url: URL_ARG });
    // wait for load + idle
    for (let i = 0; i < 200; i++) {
      if ((await evaluate('document.readyState')) === 'complete') break;
      await sleep(100);
    }
    await sleep(2500);

    const bytes = await evaluate(`performance.getEntriesByType('resource').reduce((s, e) => s + e.transferSize, 0) + performance.getEntriesByType('navigation')[0].transferSize`);
    const load = await evaluate(`JSON.stringify({ fcp: __perf.fcp, lcp: __perf.lcp, cls: __perf.cls, load: performance.getEntriesByType('navigation')[0].loadEventEnd, longTasks: __perf.longTasks })`);

    const metric = async (name) => (await send('Performance.getMetrics')).result.metrics.find((m) => m.name === name).value;

    // Idle: layouts per second with nothing happening (animations only).
    const l0 = await metric('LayoutCount');
    await sleep(2000);
    const idleLayoutsPerSec = ((await metric('LayoutCount')) - l0) / 2;

    // Typing in search: synchronous work per keystroke.
    const typing = await evaluate(EVAL_SAFE(`(() => {
      const input = document.getElementById('search'); const times = [];
      for (const q of ['b','bi','bil','bill','billi','billin','billing']) {
        const t = performance.now(); input.value = q; input.dispatchEvent(new Event('input', { bubbles: true }));
        times.push(performance.now() - t);
      }
      input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true }));
      return times.reduce((a, b) => a + b, 0) / times.length;
    })()`));
    await sleep(1000); // let any debounced work finish

    // One full search + render, called directly (independent of debouncing).
    const search = await evaluate(EVAL_SAFE(`(() => {
      const times = [];
      for (const q of ['billing', 'sql', 'blocked', 'zzz']) { const t = performance.now(); renderResults(q); times.push(performance.now() - t); }
      renderResults('');
      return times.reduce((a, b) => a + b, 0) / times.length;
    })()`));

    // Scrolling: frame times while scrolling the results list.
    const scroll = await evaluate(`new Promise((resolve) => {
      const target = document.getElementById('results').getBoundingClientRect().top + scrollY - 200;
      scrollTo(0, target);
      const deltas = []; let last = performance.now(); let n = 0;
      const step = (now) => { deltas.push(now - last); last = now; scrollBy(0, 25); if (++n < 120) requestAnimationFrame(step); else {
        deltas.shift(); deltas.sort((a, b) => a - b);
        resolve(JSON.stringify({ avg: deltas.reduce((a, b) => a + b, 0) / deltas.length, p95: deltas[Math.floor(deltas.length * 0.95)], over50: deltas.filter((d) => d > 50).length }));
      } };
      requestAnimationFrame((t) => { last = t; requestAnimationFrame(step); });
    })`, true);

    // Hovering rows: work per mousemove.
    const hover = await evaluate(EVAL_SAFE(`(() => {
      const rows = [...document.querySelectorAll('.result-row')].slice(0, 50); const t = performance.now();
      for (const row of rows) { const r = row.getBoundingClientRect(); row.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: r.left + 20, clientY: r.top + 5 })); }
      return (performance.now() - t) / rows.length;
    })()`));

    // Resize: work for one resize event.
    const resize = await evaluate(EVAL_SAFE(`(() => { const t = performance.now(); dispatchEvent(new Event('resize')); document.body.offsetHeight; return performance.now() - t; })()`));

    // Live ticker: open/close 5 times, then look for leftovers.
    const toggle = 'document.getElementById("ticker-toggle").click()';
    for (let i = 0; i < 5; i++) {
      await evaluate(toggle); await sleep(300); await evaluate(toggle); await sleep(100);
    }
    await sleep(1500);
    const tickerAfterClose = await evaluate(`JSON.stringify({ intervals: __perf.liveIntervals, keydownListeners: (getEventListeners(window).keydown || []).length, resizeListeners: (getEventListeners(window).resize || []).length })`);
    await evaluate(toggle);
    const heap0 = await metric('JSHeapUsedSize');
    await sleep(10000);
    const heap1 = await metric('JSHeapUsedSize');
    const cacheSize = await evaluate(EVAL_SAFE('renderedTickerRows.size'));
    await evaluate(toggle);

    // Storage written by the "viewed" tracking.
    const storage = await evaluate(EVAL_SAFE(`(() => { const v = localStorage.getItem('activity:viewed') || ''; return { bytes: v.length, ids: v ? JSON.parse(v).length : 0 }; })()`));

    close();
    return {
      transferKB: Math.round(bytes / 1024),
      ...JSON.parse(load),
      idleLayoutsPerSec,
      typingMsPerKey: typing,
      searchMsPerQuery: search,
      scroll: JSON.parse(scroll),
      hoverMsPerMove: hover,
      resizeMs: resize,
      tickerAfterClose: JSON.parse(tickerAfterClose),
      tickerHeapGrowthKBper10s: Math.round((heap1 - heap0) / 1024),
      tickerRowCache: cacheSize,
      storage,
    };
  } finally {
    chrome.kill();
    await sleep(300);
    rmSync(profile, { recursive: true, force: true });
  }
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const results = [];
for (let i = 0; i < RUNS; i++) results.push(await run());

const pick = (f) => median(results.map(f).filter((v) => v !== null && v !== undefined));
const r1 = (v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v);
console.log(JSON.stringify({
  conditions: `Fast 4G (9 Mbps, 60 ms RTT), CPU ${CPU_SLOWDOWN}x slowdown, cache disabled, 1440x900, median of ${RUNS}`,
  transferKB: pick((r) => r.transferKB),
  fcpMs: r1(pick((r) => r.fcp)),
  lcpMs: r1(pick((r) => r.lcp)),
  cls: r1(pick((r) => r.cls * 1000)) / 1000,
  loadMs: r1(pick((r) => r.load)),
  longTaskMsOverBudget: r1(pick((r) => r.longTasks)),
  idleLayoutsPerSec: pick((r) => r.idleLayoutsPerSec),
  typingMsPerKey: r1(pick((r) => r.typingMsPerKey)),
  searchMsPerQuery: r1(pick((r) => r.searchMsPerQuery)),
  scrollFrameAvgMs: r1(pick((r) => r.scroll.avg)),
  scrollFrameP95Ms: r1(pick((r) => r.scroll.p95)),
  scrollFramesOver50ms: pick((r) => r.scroll.over50),
  hoverMsPerMove: r1(pick((r) => r.hoverMsPerMove)),
  resizeMs: r1(pick((r) => r.resizeMs)),
  tickerIntervalsAfterClose: pick((r) => r.tickerAfterClose.intervals),
  tickerKeydownListenersAfterClose: pick((r) => r.tickerAfterClose.keydownListeners),
  tickerResizeListeners: pick((r) => r.tickerAfterClose.resizeListeners),
  tickerHeapGrowthKBper10s: pick((r) => r.tickerHeapGrowthKBper10s),
  tickerRowCache: pick((r) => r.tickerRowCache),
  viewedStorageKB: r1(pick((r) => r.storage?.bytes) / 1024),
  viewedIds: pick((r) => r.storage?.ids),
}, null, 2));
