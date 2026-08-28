/**
 * Shorts Intelligence — interface layer.
 *
 * All analysis lives in shorts.js / shotlist.js / insights.js; this file only
 * renders it. Composed of small component functions returning HTML strings,
 * mounted into the shell in index.html.
 */

import {
  buildReport, isShort, withinWindow, rankBy, byChannel, breakouts,
} from './shorts.js';
import {
  parseVideoId, normaliseShotlist, sceneRange, longestScene, timecode,
} from './shotlist.js';
import { overviewMetrics, keyInsights, viewsChartRows } from './insights.js';
import { mountForYou } from './foryou.js';
import {
  compactNumber, exactNumber, shortDuration, percent, multiple,
  timestamp, dateRange, relativeTime,
} from './format.js';

/* ---------- helpers ---------- */

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const watchUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
const channelUrl = (id) => `https://www.youtube.com/channel/${encodeURIComponent(id)}`;
const thumbUrl = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;

const $ = (sel, root = document) => root.querySelector(sel);
const setHTML = (sel, html) => { const node = $(sel); if (node) node.innerHTML = html; };

/** Every external link gets rel="noopener noreferrer" and a visible marker. */
const extLink = (href, label, className = '') =>
  `<a class="${className}" href="${href}" target="_blank" rel="noopener noreferrer">${label}${ICON.ext}</a>`;

/* ---------- icons (inline, so there is no icon-font request) ---------- */

const svg = (path, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

const ICON = {
  overview: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  play: svg('<rect x="2" y="4" width="20" height="16" rx="4"/><path d="m10 9 5 3-5 3z"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  users: svg('<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/>'),
  trending: svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
  film: svg('<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M2.5 12h19"/>'),
  trophy: svg('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/><path d="M10 14v3h4v-3M8 21h8"/>'),
  insight: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3"/>', 15),
  arrow: `<svg class="th-sort__arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>`,
  ext: `<svg class="ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  empty: svg('<circle cx="12" cy="12" r="9"/><path d="M8 13h8"/>', 26),
  alert: svg('<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17.5v.01"/>', 26),
};

/* ---------- state components ---------- */

const emptyState = (title, body) => `
  <div class="state" role="status">
    <span class="state__icon">${ICON.empty}</span>
    <p class="state__title">${esc(title)}</p>
    <p class="state__body">${esc(body)}</p>
  </div>`;

const errorState = (title, body) => `
  <div class="state state--error" role="alert">
    <span class="state__icon">${ICON.alert}</span>
    <p class="state__title">${esc(title)}</p>
    <p class="state__body">${esc(body)}</p>
  </div>`;

/* ---------- overview ---------- */

function metricCard(m) {
  return `
    <article class="metric" style="--tone: var(--${toneVar(m.tone)}); --tone-wash: var(--${toneVar(m.tone)}-wash);">
      <div class="metric__top">
        <h3 class="metric__label">${esc(m.label)}</h3>
        <span class="metric__icon">${ICON[m.icon] ?? ICON.overview}</span>
      </div>
      <p class="metric__value" title="${esc(m.exact)}">${esc(m.value)}</p>
      <p class="metric__caption">${esc(m.caption)}</p>
    </article>`;
}

/* "neutral" has no hue of its own; it borrows the strong border. */
const toneVar = (tone) => (tone === 'neutral' ? 'border-strong' : tone);

const insightCard = (i) => `
  <article class="insight">
    <span class="insight__icon">${ICON.insight}</span>
    <div>
      <h3 class="insight__headline">${esc(i.headline)}</h3>
      <p class="insight__detail">${esc(i.detail)}</p>
    </div>
  </article>`;

/* ---------- data table ---------- */

/**
 * A sortable, filterable table.
 *
 * `columns` entries: { key, label, align, tooltip, sortValue, render, primary }
 * The rendered table re-sorts and re-filters in place; sorting is driven by
 * `sortValue`, never by the formatted string, so "1.2M" sorts above "900K".
 */
function mountTable(mountSel, { rows, columns, caption, initial = 10, searchInput, emptyText }) {
  const mount = $(mountSel);
  if (!mount) return;

  let sortKey = null;
  let sortDir = 'desc';
  let expanded = false;
  let query = '';

  const searchable = (row) =>
    `${row.title ?? ''} ${row.channel ?? ''}`.toLowerCase();

  function visibleRows() {
    let out = rows;
    if (query) out = out.filter((r) => searchable(r).includes(query));
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      out = [...out].sort((a, b) => {
        const diff = col.sortValue(a) - col.sortValue(b);
        return sortDir === 'asc' ? diff : -diff;
      });
    }
    return out;
  }

  function render() {
    const all = visibleRows();

    if (all.length === 0) {
      mount.innerHTML = query
        ? emptyState('No matches', `Nothing matches “${query}”. Clear the search to see every row.`)
        : emptyState('Nothing to show', emptyText ?? 'This window contains no qualifying videos.');
      return;
    }

    const shown = expanded ? all : all.slice(0, initial);
    const head = columns.map((c) => {
      const isSorted = sortKey === c.key;
      const tip = c.tooltip
        ? `<span class="info" tabindex="0" role="note" aria-label="${esc(c.tooltip)}" title="${esc(c.tooltip)}">i</span>`
        : '';
      const inner = c.sortValue
        ? `<button type="button" class="th-sort" data-sort="${c.key}">${esc(c.label)}${ICON.arrow}</button>${tip}`
        : `${esc(c.label)}${tip}`;
      return `<th scope="col"${c.align === 'right' ? ' class="col-num"' : ''}${
        isSorted ? ` aria-sort="${sortDir === 'asc' ? 'ascending' : 'descending'}"` : ''}>${inner}</th>`;
    }).join('');

    const body = shown.map((row, i) => `
      <tr>${columns.map((c) => `
        <td class="${c.align === 'right' ? 'col-num' : ''}${c.primary ? ' cell-primary' : ''}${
          c.cellClass ? ` ${c.cellClass}` : ''}"${
          c.primary ? '' : ` data-label="${esc(c.label)}"`}>${c.render(row, i)}</td>`).join('')}
      </tr>`).join('');

    mount.innerHTML = `
      <div class="tablecard">
        <div class="tablewrap">
          <table>
            <caption class="sr-only">${esc(caption)}</caption>
            <thead><tr>${head}</tr></thead>
            <tbody>${body}</tbody>
          </table>
        </div>
        ${all.length > initial ? `
          <div class="showmore">
            <button type="button" class="btn btn--ghost" data-toggle>
              ${expanded ? 'Show fewer' : `Show all ${all.length}`}
            </button>
          </div>` : ''}
      </div>`;
  }

  mount.addEventListener('click', (e) => {
    const sortBtn = e.target.closest('[data-sort]');
    if (sortBtn) {
      const key = sortBtn.dataset.sort;
      if (sortKey === key) sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      else { sortKey = key; sortDir = 'desc'; }
      render();
      return;
    }
    if (e.target.closest('[data-toggle]')) {
      expanded = !expanded;
      render();
    }
  });

  if (searchInput) {
    const input = $(searchInput);
    if (input) {
      input.addEventListener('input', () => {
        query = input.value.trim().toLowerCase();
        expanded = false;
        render();
      });
    }
  }

  render();
}

/* ---------- shared cell renderers ---------- */

const rankCell = (i) =>
  `<span class="rank${i < 3 ? ' rank--medal' : ''}" aria-label="Rank ${i + 1}">${i + 1}</span>`;

const videoCell = (v) => `
  <div class="cell-video">
    <img class="thumb" src="${thumbUrl(v.id)}" alt="" loading="lazy" width="64" height="36"
         onerror="this.style.visibility='hidden'">
    <div class="cell-video__body">
      ${extLink(watchUrl(v.id), esc(v.title), 'cell-video__title')}
      <div class="cell-video__meta">
        <span>${esc(v.channel)}</span>
        <span aria-hidden="true">·</span>
        <span>${compactNumber(v.subs)} subs</span>
        <span class="badge-dur">${shortDuration(v.durationSec)}</span>
      </div>
    </div>
  </div>`;

const numCell = (value, exact, className = '') =>
  `<span class="${className}" title="${esc(exact)}">${esc(value)}</span>`;

/* ---------- chart ---------- */

/** Horizontal bars for the top videos. One series, so no legend is required. */
function viewsChart(rows) {
  if (rows.length === 0) return '';
  return `
    <div class="card chart">
      ${rows.map((r) => `
        <div class="chart__row">
          <span class="chart__label" title="${esc(r.label)}">${esc(r.channel)} — ${esc(r.label)}</span>
          <span class="chart__value">${esc(r.display)}</span>
          <span class="chart__track">
            <span class="chart__fill" style="width:${(r.ratio * 100).toFixed(1)}%"></span>
          </span>
        </div>`).join('')}
    </div>`;
}

/* ---------- shot analyzer ---------- */

const HOOK_SECONDS = 3;

function sceneCard(scene, { longestN, lastN, title }) {
  const isHook = scene.startSec < HOOK_SECONDS;
  const isLongest = scene.n === longestN;
  const isPayoff = scene.n === lastN;

  const classes = ['scene'];
  if (isHook) classes.push('scene--hook');
  else if (isLongest) classes.push('scene--longest');
  else if (isPayoff) classes.push('scene--payoff');

  const tags = [
    isHook && '<span class="scene__tag scene__tag--hook">Hook</span>',
    isLongest && '<span class="scene__tag scene__tag--longest">Longest</span>',
    isPayoff && '<span class="scene__tag scene__tag--payoff">Payoff</span>',
  ].filter(Boolean).join('');

  const approx = !scene.frame.withinScene;
  const frameLabel = approx
    ? `≈ ${timecode(scene.frame.atSec)}`
    : timecode(scene.frame.atSec);

  return `
    <article class="${classes.join(' ')}">
      <div class="scene__index">
        <span class="scene__num">${scene.n}</span>
        <span class="scene__rail" aria-hidden="true"></span>
      </div>
      <div class="scene__frame${approx ? ' scene__frame--approx' : ''}">
        <img src="${esc(scene.frame.url)}" width="148" height="83" loading="lazy"
             alt="Still from ${esc(title)} at ${timecode(scene.frame.atSec)}"
             onerror="this.style.visibility='hidden'">
        <span class="scene__frame-time">${frameLabel}${
          approx ? '<span class="sr-only">— frame taken outside this scene</span>' : ''}</span>
      </div>
      <div class="scene__body">
        <div class="scene__meta">
          <span class="scene__time">${sceneRange(scene)}</span>
          <span class="badge-dur">${scene.durationSec}s · ${percent(scene.share)}</span>
          ${tags}
        </div>
        <div class="scene__grid">
          <div class="scene__field">
            <p class="scene__field-label">Character does</p>
            <p class="scene__field-value">${esc(scene.action)}</p>
          </div>
          <div class="scene__field">
            <p class="scene__field-label">Character says</p>
            <p class="scene__field-value scene__field-value--said">${esc(scene.dialogue)}</p>
          </div>
          <div class="scene__field">
            <p class="scene__field-label">Camera</p>
            <p class="scene__field-value">${esc(scene.camera)}</p>
          </div>
        </div>
      </div>
    </article>`;
}

function shotlistView(list) {
  const longest = longestScene(list);
  const lastN = list.scenes[list.scenes.length - 1].n;
  const approxCount = list.scenes.filter((s) => !s.frame.withinScene).length;

  return `
    <div class="card summary">
      <img class="summary__thumb" src="${thumbUrl(list.videoId)}" width="200" height="113"
           alt="Thumbnail for ${esc(list.title)}" onerror="this.style.visibility='hidden'">
      <div class="summary__body">
        <h3 class="summary__title">${extLink(list.url, esc(list.title))}</h3>
        <div class="summary__facts">
          <span class="pill">${esc(list.channel)}</span>
          <span class="pill">${shortDuration(list.durationSeconds)}</span>
          <span class="pill">${list.sceneCount} scenes</span>
          <span class="pill">${list.meanSceneSec}s average</span>
        </div>
        <div class="summary__hook">
          <p class="summary__hook-label">${ICON.bolt} Hook · first ${list.hook?.seconds ?? HOOK_SECONDS}s</p>
          <p class="summary__hook-text">${esc(list.hook?.why ?? 'No hook analysis recorded for this video.')}</p>
        </div>
      </div>
    </div>

    <div class="timeline">
      ${list.scenes.map((s) => sceneCard(s, { longestN: longest.n, lastN, title: list.title })).join('')}
    </div>

    <details class="disclosure">
      <summary>About the frames — why ${approxCount} of ${list.sceneCount} are marked approximate</summary>
      <div class="disclosure__body">
        <p>YouTube publishes only three stills per video, at roughly a quarter, half and
        three-quarters through, and those are the only per-timestamp images available
        without downloading the file. Each scene shows the nearest one and the time it
        was taken. A dimmed frame marked <strong>≈</strong> falls outside that scene — it
        is the closest available still, not a shot from that scene. A true frame per
        scene would require downloading the video and extracting it.</p>
      </div>
    </details>`;
}

/* ---------- analyzer controller ---------- */

function mountAnalyzer(index) {
  const form = $('#analyzer-form');
  const input = $('#analyzer-input');
  const hint = $('#analyzer-hint');
  const button = $('#analyzer-submit');
  const out = $('#analyzer-out');
  const chips = $('#analyzer-chips');
  if (!form || !input || !out) return;

  const setHint = (text, state = '') => {
    hint.textContent = text;
    hint.dataset.state = state;
    input.setAttribute('aria-invalid', state === 'error' ? 'true' : 'false');
  };

  const setLoading = (on) => {
    button.dataset.loading = String(on);
    button.disabled = on;
  };

  const markActive = (videoId) => {
    for (const chip of chips?.querySelectorAll('[data-id]') ?? []) {
      chip.setAttribute('aria-pressed', String(chip.dataset.id === videoId));
    }
  };

  async function show(videoId, { focus = true } = {}) {
    setLoading(true);
    out.setAttribute('aria-busy', 'true');
    try {
      const res = await fetch(`./data/shotlists/${encodeURIComponent(videoId)}.json`);

      if (res.status === 404) {
        out.innerHTML = errorState(
          'No scene analysis for this video yet',
          'Breaking a video into scenes needs a model that can watch it, which this page '
          + 'cannot do on its own. Ask for it to be analysed and it will appear here.');
        setHint('That link is valid, but no analysis has been recorded for it yet.', 'error');
        markActive(null);
        return;
      }
      if (!res.ok) throw new Error(`the server returned ${res.status}`);

      const list = normaliseShotlist(await res.json());
      out.innerHTML = shotlistView(list);
      setHint(`Showing ${list.sceneCount} scenes from “${list.title}”.`);
      markActive(videoId);
      if (focus) out.querySelector('.summary__title a')?.focus({ preventScroll: true });
    } catch (err) {
      out.innerHTML = errorState('Could not load that analysis', `The request failed — ${err.message}.`);
      setHint('Something went wrong loading that analysis.', 'error');
    } finally {
      setLoading(false);
      out.setAttribute('aria-busy', 'false');
    }
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const videoId = parseVideoId(input.value);
    if (!videoId) {
      setHint('That does not look like a YouTube link. Paste a youtube.com/shorts, '
        + 'youtube.com/watch or youtu.be URL, or the 11-character video ID.', 'error');
      input.focus();
      return;
    }
    show(videoId);
  });

  input.addEventListener('input', () => {
    if (input.getAttribute('aria-invalid') === 'true') {
      setHint('Paste a YouTube Shorts link, or pick one of the analysed videos below.');
    }
  });

  if (chips && index.videoIds.length) {
    chips.innerHTML = `<span class="analyzer__chips-label">Analysed videos</span>`
      + index.videoIds.map((id) => `
        <button type="button" class="chip" data-id="${esc(id)}" aria-pressed="false">
          <img class="chip__thumb" src="${thumbUrl(id)}" alt="" width="32" height="18" loading="lazy"
               onerror="this.style.display='none'">
          ${esc(id)}
        </button>`).join('');

    chips.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-id]');
      if (!chip) return;
      input.value = `https://www.youtube.com/shorts/${chip.dataset.id}`;
      show(chip.dataset.id);
    });

    // Seed with the first analysis so the workspace is never empty on arrival.
    input.value = `https://www.youtube.com/shorts/${index.videoIds[0]}`;
    show(index.videoIds[0], { focus: false });
  } else {
    out.innerHTML = emptyState('No analyses available',
      'No scene breakdowns have been recorded yet.');
  }
}

/* ---------- shell: navigation ---------- */

function mountShell() {
  const sidebar = $('#sidebar');
  const scrim = $('#scrim');
  const toggle = $('#menu-toggle');

  const setOpen = (open) => {
    sidebar.dataset.open = String(open);
    scrim.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('.nav__link')?.focus();
  };

  toggle?.addEventListener('click', () => setOpen(sidebar.dataset.open !== 'true'));
  scrim?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.dataset.open === 'true') { setOpen(false); toggle.focus(); }
  });
  // A tap on a section link should close the drawer behind it.
  sidebar?.addEventListener('click', (e) => {
    if (e.target.closest('.nav__link') && window.matchMedia('(max-width: 1080px)').matches) setOpen(false);
  });

  // Scrollspy: mark the section currently nearest the top of the viewport.
  const links = [...document.querySelectorAll('.nav__link[href^="#"]')];
  const sections = links
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      for (const link of links) {
        link.setAttribute('aria-current',
          String(link.getAttribute('href') === `#${entry.target.id}`));
      }
    }
  }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

  sections.forEach((s) => observer.observe(s));
}

/* ---------- boot ---------- */

function renderHeader(report, snapshot) {
  const window = dateRange(report.window.start, report.window.end);
  setHTML('#head-status', `
    <span class="pill pill--live"><span class="dot"></span>Snapshot loaded</span>
    <span class="pill">${esc(window)}</span>
    <span class="pill" title="${esc(timestamp(report.fetchedAt))}">Updated ${esc(relativeTime(report.fetchedAt))}</span>
    <span class="pill pill--amber" title="${esc(snapshot.coverageNote ?? '')}">Coverage: ${esc(report.coverage)}</span>`);
}

function renderOverview(report) {
  setHTML('#metrics', overviewMetrics(report).map(metricCard).join(''));
  const insights = keyInsights(report);
  setHTML('#insights', insights.length
    ? insights.map(insightCard).join('')
    : emptyState('No observations', 'The loaded window contains no videos to describe.'));
}

function renderTables(report, deep) {
  mountTable('#table-views', {
    caption: 'Top Roblox Shorts ranked by lifetime views',
    rows: deep.topByViews,
    initial: 10,
    searchInput: '#search-views',
    columns: [
      { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
      { key: 'video', label: 'Video', primary: true, render: videoCell },
      { key: 'views', label: 'Views', align: 'right', sortValue: (r) => r.views,
        tooltip: 'Lifetime views reported for the video at collection time.',
        render: (r) => numCell(compactNumber(r.views), exactNumber(r.views), 'metric-views') },
      { key: 'vph', label: 'Views/hr', align: 'right', sortValue: (r) => r.vph,
        tooltip: 'Lifetime views divided by hours since publication — an average pace, not a live rate.',
        render: (r) => numCell(compactNumber(r.vph), `${exactNumber(Math.round(r.vph))} views per hour`, 'metric-vph') },
    ],
  });

  mountTable('#table-vph', {
    caption: 'Roblox Shorts ranked by average views per hour',
    rows: deep.topByVph,
    initial: 10,
    columns: [
      { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
      { key: 'video', label: 'Video', primary: true, render: videoCell },
      { key: 'vph', label: 'Views/hr', align: 'right', sortValue: (r) => r.vph,
        tooltip: 'Lifetime views divided by hours since publication — an average pace, not a live rate.',
        render: (r) => numCell(compactNumber(r.vph), `${exactNumber(Math.round(r.vph))} views per hour`, 'metric-vph') },
      { key: 'views', label: 'Views', align: 'right', sortValue: (r) => r.views,
        render: (r) => numCell(compactNumber(r.views), exactNumber(r.views)) },
    ],
  });

  mountTable('#table-channels', {
    caption: 'Channels ranked by total views across their Shorts in this window',
    rows: deep.topChannels,
    initial: 10,
    columns: [
      { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
      { key: 'channel', label: 'Channel', primary: true, render: (c) => `
          <div class="cell-video__body">
            ${extLink(channelUrl(c.channelId), esc(c.channel), 'cell-video__title')}
            <div class="cell-video__meta"><span>${compactNumber(c.subs)} subscribers</span></div>
          </div>` },
      { key: 'count', label: 'Shorts', align: 'right', sortValue: (c) => c.videoCount,
        render: (c) => numCell(String(c.videoCount), `${c.videoCount} Shorts in this window`) },
      { key: 'views', label: 'Views', align: 'right', sortValue: (c) => c.views,
        render: (c) => numCell(compactNumber(c.views), exactNumber(c.views), 'metric-channel') },
    ],
  });

  mountTable('#table-breakouts', {
    caption: 'Videos ranked by views relative to their channel’s subscriber count',
    rows: deep.breakouts,
    initial: 10,
    emptyText: 'No channel in this window clears the 1,000-subscriber floor.',
    columns: [
      { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
      { key: 'video', label: 'Video', primary: true, render: videoCell },
      { key: 'subs', label: 'Subs', align: 'right', sortValue: (r) => r.subs,
        render: (r) => numCell(compactNumber(r.subs), exactNumber(r.subs)) },
      { key: 'views', label: 'Views', align: 'right', sortValue: (r) => r.views,
        render: (r) => numCell(compactNumber(r.views), exactNumber(r.views)) },
      { key: 'ratio', label: '× subs', align: 'right', sortValue: (r) => r.viewsPerSub,
        tooltip: 'Views divided by subscriber count. Channels under 1,000 subscribers are excluded.',
        render: (r) => `<span class="badge-mult" title="${esc(exactNumber(r.views))} views on ${esc(exactNumber(r.subs))} subscribers">${multiple(r.viewsPerSub)}</span>` },
    ],
  });

  setHTML('#chart-views', viewsChart(viewsChartRows(report, 8)));
}

async function boot() {
  mountShell();

  // The analyzer loads from its own file and does not depend on the snapshot,
  // so a snapshot failure must not take the whole page down with it.
  let index = { videoIds: [] };
  try {
    const res = await fetch('./data/shotlists/index.json');
    if (res.ok) index = await res.json();
  } catch { /* the analyzer renders its own empty state */ }
  mountAnalyzer(index);

  try {
    const res = await fetch('./data/roblox-shorts.json');
    if (!res.ok) throw new Error(`the snapshot returned ${res.status}`);
    const snapshot = await res.json();
    const report = buildReport(snapshot);

    if (report.totals.videoCount === 0) {
      setHTML('#head-status', '<span class="pill pill--amber">Snapshot empty</span>');
      for (const sel of ['#metrics', '#insights', '#chart-views',
                         '#table-views', '#table-vph', '#table-channels', '#table-breakouts']) {
        setHTML(sel, emptyState('No videos in this window',
          'The snapshot loaded, but it contains no Shorts for the tracked period.'));
      }
      return;
    }

    // The overview keeps buildReport's top-10 summary; the tables re-rank the
    // same filtered set more deeply, so "Show all" has something to reveal.
    const videos = withinWindow(snapshot.videos.filter(isShort),
      { start: snapshot.windowStart, end: snapshot.windowEnd });
    const deep = {
      topByViews: rankBy(videos, 'views', 40),
      topByVph: rankBy(videos, 'vph', 40),
      topChannels: byChannel(videos, 30),
      breakouts: breakouts(videos, { minSubs: 1000, limit: 30 }),
    };

    renderHeader(report, snapshot);
    renderOverview(report);
    renderTables(report, deep);

    // The planner reads the same snapshot plus whatever shot lists exist, so
    // its recommendations cite the numbers shown above.
    const shotlists = await Promise.all((index.videoIds ?? []).map(async (id) => {
      try {
        const r = await fetch(`./data/shotlists/${encodeURIComponent(id)}.json`);
        return r.ok ? await r.json() : null;
      } catch { return null; }
    }));
    mountForYou(snapshot, shotlists.filter(Boolean));
  } catch (err) {
    setHTML('#head-status', '<span class="pill pill--amber">Snapshot unavailable</span>');
    const message = `The Shorts snapshot could not be loaded — ${err.message}.`;
    setHTML('#metrics', errorState('Data unavailable', message));
    for (const sel of ['#insights', '#chart-views', '#table-views',
                       '#table-vph', '#table-channels', '#table-breakouts']) {
      setHTML(sel, '');
    }
  }
}

boot();
