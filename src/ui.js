/**
 * Shared interface primitives.
 *
 * Every page is built from these: the icon set, the loading, empty and error
 * states, the metric and insight cards, the sortable table, the bar chart and
 * the cell renderers. Nothing here knows which page it is on, and nothing here
 * performs analysis — the numbers arrive already computed.
 */

import { compactNumber, exactNumber, shortDuration } from './format.js';

/* ---------- helpers ---------- */

export const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const watchUrl = (id) => `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
export const channelUrl = (id) => `https://www.youtube.com/channel/${encodeURIComponent(id)}`;
export const thumbUrl = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`;

export const $ = (sel, root = document) => root.querySelector(sel);
export const setHTML = (sel, html) => { const node = $(sel); if (node) node.innerHTML = html; };

/** Every external link gets rel="noopener noreferrer" and a visible marker. */
export const extLink = (href, label, className = '') =>
  `<a class="${className}" href="${href}" target="_blank" rel="noopener noreferrer">${label}${ICON.ext}</a>`;

/* ---------- icons (inline, so there is no icon-font request) ---------- */

const svg = (path, size = 16) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

export const ICON = {
  overview: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  play: svg('<rect x="2" y="4" width="20" height="16" rx="4"/><path d="m10 9 5 3-5 3z"/>'),
  bolt: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  users: svg('<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/>'),
  trending: svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
  film: svg('<rect x="2.5" y="4" width="19" height="16" rx="2.5"/><path d="M7 4v16M17 4v16M2.5 12h19"/>'),
  trophy: svg('<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/><path d="M10 14v3h4v-3M8 21h8"/>'),
  calendar: svg('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9.5 14 1.8 1.8L15 12.5"/>'),
  insight: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.5.4.8 1 .8 1.6V16h5.4v-.5c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3"/>', 15),
  arrow: `<svg class="th-sort__arrow" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg>`,
  ext: `<svg class="ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>`,
  empty: svg('<circle cx="12" cy="12" r="9"/><path d="M8 13h8"/>', 26),
  alert: svg('<path d="M12 3 2.5 20h19z"/><path d="M12 10v4M12 17.5v.01"/>', 26),
};

/* ---------- state components ---------- */

export const emptyState = (title, body) => `
  <div class="state" role="status">
    <span class="state__icon">${ICON.empty}</span>
    <p class="state__title">${esc(title)}</p>
    <p class="state__body">${esc(body)}</p>
  </div>`;

export const errorState = (title, body) => `
  <div class="state state--error" role="alert">
    <span class="state__icon">${ICON.alert}</span>
    <p class="state__title">${esc(title)}</p>
    <p class="state__body">${esc(body)}</p>
  </div>`;

/** The placeholder a table shows while the snapshot is still in flight. */
export const tableSkeleton = () => `
  <div class="tablecard">
    <div class="skeleton skeleton--row"></div>
    <div class="skeleton skeleton--row"></div>
    <div class="skeleton skeleton--row"></div>
  </div>`;

/* ---------- overview cards ---------- */

/* "neutral" has no hue of its own; it borrows the strong border. */
const toneVar = (tone) => (tone === 'neutral' ? 'border-strong' : tone);

export function metricCard(m) {
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

export const insightCard = (i) => `
  <article class="insight">
    <span class="insight__icon">${ICON.insight}</span>
    <div>
      <h3 class="insight__headline">${esc(i.headline)}</h3>
      <p class="insight__detail">${esc(i.detail)}</p>
    </div>
  </article>`;

/** A short prose explanation attached under a table. */
export const noteCard = (title, body) => `
  <details class="disclosure">
    <summary>${esc(title)}</summary>
    <div class="disclosure__body">${body}</div>
  </details>`;

/* ---------- data table ---------- */

/**
 * A sortable, filterable table.
 *
 * `columns` entries: { key, label, align, tooltip, sortValue, render, primary }
 * The rendered table re-sorts and re-filters in place; sorting is driven by
 * `sortValue`, never by the formatted string, so "1.2M" sorts above "900K".
 */
export function mountTable(mountSel, { rows, columns, caption, initial = 10, searchInput, emptyText }) {
  const mount = $(mountSel);
  if (!mount) return;

  let sortKey = null;
  let sortDir = 'desc';
  let query = '';
  let expanded = false;

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

export const rankCell = (i) =>
  `<span class="rank${i < 3 ? ' rank--medal' : ''}" aria-label="Rank ${i + 1}">${i + 1}</span>`;

export const videoCell = (v) => `
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

export const numCell = (value, exact, className = '') =>
  `<span class="${className}" title="${esc(exact)}">${esc(value)}</span>`;

/** Views and views/hr columns, shared by every video table. */
export const viewsColumn = (className = 'metric-views') => ({
  key: 'views', label: 'Views', align: 'right', sortValue: (r) => r.views,
  tooltip: 'Lifetime views reported for the video at collection time.',
  render: (r) => numCell(compactNumber(r.views), exactNumber(r.views), className),
});

export const vphColumn = (className = 'metric-vph') => ({
  key: 'vph', label: 'Views/hr', align: 'right', sortValue: (r) => r.vph,
  tooltip: 'Lifetime views divided by hours since publication — an average pace, not a live rate.',
  render: (r) => numCell(compactNumber(r.vph), `${exactNumber(Math.round(r.vph))} views per hour`, className),
});

export const durationColumn = () => ({
  key: 'duration', label: 'Length', align: 'right', sortValue: (r) => r.durationSec,
  tooltip: 'Video length as reported by YouTube.',
  render: (r) => numCell(shortDuration(r.durationSec), `${r.durationSec} seconds`),
});

/* ---------- chart ---------- */

/**
 * Horizontal bars for a single series. One series, so no legend is required.
 *
 * Rows are `{ label, channel, display, ratio }` — ratio between 0 and 1,
 * already computed by the caller against whichever maximum makes sense there.
 */
export function barChart(rows) {
  if (!rows || rows.length === 0) return '';
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
