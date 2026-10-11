const { pageSize, tickerIntervalMs, tickerVisibleRows, storageKey } = window.APP_CONFIG;

const grid = document.getElementById('agents');
const searchInput = document.getElementById('search');
const resultsList = document.getElementById('results');
const resultsCount = document.getElementById('results-count');
const topbar = document.querySelector('.topbar');
const backToTop = document.getElementById('back-to-top');
const progress = document.getElementById('read-progress');
const tickerToggle = document.getElementById('ticker-toggle');
const preview = document.getElementById('row-preview');
const scrollContext = document.getElementById('scroll-context');

const minCardHeight = 220;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'UTC' });
}

function countByAgent(events) {
  const counts = {};
  events.forEach((event) => {
    counts[event.agent] = (counts[event.agent] || 0) + 1;
  });
  return counts;
}

function renderAgents() {
  const counts = countByAgent(window.ACTIVITY);
  grid.innerHTML = window.AGENTS.map((agent, index) => {
    const image = 'assets/agents/agent-' + String((index % 12) + 1).padStart(2, '0') + '.png';
    return (
      '<article class="agent-card">' +
      '<img class="agent-avatar" src="' + image + '" alt="">' +
      '<h3>' + escapeHtml(agent.name) + '</h3>' +
      '<p class="agent-owner">' + escapeHtml(agent.owner) + '</p>' +
      '<p class="agent-description">' + escapeHtml(agent.description) + '</p>' +
      '<p class="agent-count">' + (counts[agent.name] || 0).toLocaleString() + ' calls today</p>' +
      '</article>'
    );
  }).join('');
  grid.querySelectorAll('img').forEach((img) => img.addEventListener('load', equalizeCardHeights));
}

function equalizeCardHeights() {
  const cards = grid.querySelectorAll('.agent-card');
  cards.forEach((card) => {
    card.style.height = '';
    const rowTop = card.offsetTop;
    let tallest = Math.max(card.offsetHeight, minCardHeight);
    cards.forEach((other) => {
      if (other.offsetTop === rowTop) {
        tallest = Math.max(tallest, other.offsetHeight);
      }
    });
    card.style.height = tallest + 'px';
  });
}

const MAX_VIEWED = 5000;

function loadViewed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
  } catch {
    return new Set();
  }
}

const viewed = loadViewed();

function rememberViewed(items) {
  const before = viewed.size;
  for (const item of items) viewed.add(item.id);
  if (viewed.size === before) return;
  // keep the most recently seen ids only, and write once
  if (viewed.size > MAX_VIEWED) {
    const recent = [...viewed].slice(-MAX_VIEWED);
    viewed.clear();
    recent.forEach((id) => viewed.add(id));
  }
  try {
    localStorage.setItem(storageKey, JSON.stringify([...viewed]));
  } catch {
    // storage full or blocked: "New" badges just won't persist
  }
}

// Sorted once, newest first. ISO timestamps in the same format sort correctly as strings.
const newestFirst = [...window.ACTIVITY].sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
const searchText = newestFirst.map((event) =>
  [event.id, event.timestamp, event.agent, event.tool, event.status, event.latencyMs, event.summary]
    .join(' ')
    .toLowerCase(),
);

function search(query) {
  const needle = query.trim().toLowerCase();
  if (!needle) return newestFirst;
  const matches = [];
  for (let i = 0; i < newestFirst.length; i++) {
    if (searchText[i].includes(needle)) matches.push(newestFirst[i]);
  }
  return matches;
}

function renderResults(query) {
  const matches = search(query);
  const page = matches.slice(0, pageSize);
  resultsCount.textContent = matches.length.toLocaleString() + ' matching tool calls';
  resultsList.innerHTML = page.map((event) => {
    const isNew = !viewed.has(event.id);
    return (
      '<li class="result-row status-' + event.status + '" data-id="' + event.id + '" data-minute="' + event.timestamp.slice(11, 16) + '">' +
      '<span class="result-time">' + formatTime(event.timestamp) + '</span>' +
      '<span class="result-agent">' + escapeHtml(event.agent) + '</span>' +
      '<span class="result-tool">' + escapeHtml(event.tool) + '</span>' +
      '<span class="result-status">' + event.status + '</span>' +
      '<span class="result-latency">' + event.latencyMs + ' ms</span>' +
      '<span class="result-summary">' + escapeHtml(event.summary) + '</span>' +
      (isNew ? '<span class="badge-new">New</span>' : '') +
      '</li>'
    );
  }).join('');
  observeRows();
  rememberViewed(page);
}

const callsPerMinute = new Map();
for (const event of window.ACTIVITY) {
  const minute = event.timestamp.slice(11, 16);
  callsPerMinute.set(minute, (callsPerMinute.get(minute) || 0) + 1);
}

// rows currently inside the middle band of the viewport (30%–60% from the top)
const rowsInBand = new Set();
let focusedRow = null;

const focusObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) rowsInBand.add(entry.target);
      else rowsInBand.delete(entry.target);
    }
    updateFocusedRow();
  },
  { rootMargin: '-30% 0px -40% 0px' },
);

function observeRows() {
  focusObserver.disconnect();
  rowsInBand.clear();
  focusedRow = null;
  resultsList.querySelectorAll('.result-row').forEach((row) => focusObserver.observe(row));
  updateFocusedRow();
}

function updateFocusedRow() {
  let next = null;
  for (const row of rowsInBand) {
    if (!next || next.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_PRECEDING) next = row;
  }
  if (next === focusedRow) return;
  focusedRow?.classList.remove('in-focus');
  next?.classList.add('in-focus');
  focusedRow = next;
  if (next) {
    const minute = next.dataset.minute;
    scrollContext.textContent = minute + ' UTC · ' + (callsPerMinute.get(minute) || 0) + ' calls that minute';
  } else {
    scrollContext.textContent = '';
  }
}

let scrollFrame = 0;

function onScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    scrollFrame = 0;
    const scrolled = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = 'scaleX(' + (max > 0 ? scrolled / max : 0) + ')';
    topbar.classList.toggle('topbar-raised', scrolled > 8);
    backToTop.classList.toggle('visible', scrolled > window.innerHeight);
  });
}

function hidePreview() {
  preview.hidden = true;
}

function showPreview(event) {
  const row = event.target.closest('.result-row');
  if (!row) return;
  const item = window.ACTIVITY.find((candidate) => candidate.id === row.dataset.id);
  if (!item) return;
  preview.textContent = item.summary;
  preview.style.top = event.clientY + 12 + 'px';
  preview.style.left = event.clientX + 12 + 'px';
  preview.hidden = false;
}

const renderedTickerRows = new Map();
let tickerPanel = null;

function tickerRow(event) {
  if (renderedTickerRows.has(event.id)) {
    return renderedTickerRows.get(event.id).cloneNode(true);
  }
  const row = document.createElement('li');
  row.className = 'ticker-row status-' + event.status;
  row.innerHTML =
    '<span class="ticker-time">' + formatTime(event.timestamp) + '</span>' +
    '<span class="ticker-agent">' + escapeHtml(event.agent) + '</span>' +
    '<span class="ticker-tool">' + escapeHtml(event.tool) + '</span>';
  renderedTickerRows.set(event.id, row);
  return row.cloneNode(true);
}

function positionTicker() {
  if (!tickerPanel) return;
  tickerPanel.style.maxHeight = window.innerHeight - 120 + 'px';
}

function openTicker() {
  const panel = document.createElement('aside');
  panel.className = 'ticker';
  panel.innerHTML = '<header class="ticker-header">Live tool calls</header><ul class="ticker-list"></ul>';
  document.body.appendChild(panel);
  tickerPanel = panel;
  const list = panel.querySelector('.ticker-list');

  setInterval(() => {
    const event = window.ACTIVITY[Math.floor(Math.random() * window.ACTIVITY.length)];
    list.prepend(tickerRow(event));
    while (list.children.length > tickerVisibleRows) {
      list.lastElementChild.remove();
    }
  }, tickerIntervalMs);

  window.addEventListener('resize', positionTicker);
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeTicker();
  });
  positionTicker();
  tickerToggle.setAttribute('aria-pressed', 'true');
  tickerToggle.textContent = 'Hide live calls';
}

function closeTicker() {
  if (!tickerPanel) return;
  tickerPanel.remove();
  tickerPanel = null;
  tickerToggle.setAttribute('aria-pressed', 'false');
  tickerToggle.textContent = 'Show live calls';
}

let searchTimer = 0;
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => renderResults(searchInput.value), 150);
});
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', equalizeCardHeights);
resultsList.addEventListener('mousemove', showPreview);
resultsList.addEventListener('mouseleave', hidePreview);
resultsList.addEventListener('wheel', hidePreview);
resultsList.addEventListener('touchstart', hidePreview);
backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
tickerToggle.addEventListener('click', () => (tickerPanel ? closeTicker() : openTicker()));

renderAgents();
equalizeCardHeights();
renderResults('');
