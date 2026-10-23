/** YouTube Shorts — the short-form (vertical micro-drama) side of the niche. */

import { compactNumber, exactNumber, multiple } from '../format.js';
import {
  barChart, durationColumn, esc, mountTable, noteCard, rankCell, setHTML, videoCell,
  viewsColumn, vphColumn,
} from '../ui.js';
import { loadShortsReport } from '../data.js';
import { chartRows, withReport } from './shared.js';

const MOUNTS = ['#chart-shorts', '#table-shorts'];

/** Views ÷ subscribers, as a badge — the reach signal that matters most for Shorts. */
const reachColumn = () => ({
  key: 'reach', label: '× subs', align: 'right',
  sortValue: (r) => (r.subs ? r.views / r.subs : 0),
  tooltip: 'Views divided by the channel’s subscriber count — how far the Short travelled beyond its own audience.',
  render: (r) => (r.subs
    ? `<span class="badge-mult" title="${esc(exactNumber(r.views))} views on ${esc(exactNumber(r.subs))} subscribers">${multiple(r.views / r.subs)}</span>`
    : '—'),
});

export default function mount() {
  withReport(MOUNTS, ({ deep, videos }) => {
    setHTML('#chart-shorts', barChartTop(deep.topByViews));

    mountTable('#table-shorts', {
      caption: 'Viral billionaire-romance & betrayal/revenge Shorts ranked by lifetime views',
      rows: deep.topByViews,
      initial: 10,
      searchInput: '#search-shorts',
      minViewsInput: '#filter-views',
      maxDurationInput: '#filter-duration',
      topicInput: '#filter-topic',
      columns: [
        { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
        { key: 'video', label: 'Short', primary: true, render: videoCell },
        viewsColumn('metric-views'),
        vphColumn(),
        durationColumn(),
        reachColumn(),
      ],
    });

    const leader = deep.topByViews[0];
    const biggestReach = [...videos].filter((v) => v.subs).sort((a, b) => (b.views / b.subs) - (a.views / a.subs))[0];
    setHTML('#notes-shorts', noteCard('Why Shorts are tracked separately', `
      <p>These are <strong>vertical Shorts (≤3 minutes)</strong>, not the long-form "full movies"
      on the other pages. In this niche they are the top of the funnel: a punchy betrayal or
      hidden-billionaire beat that hooks a scroller and sends them to the full episode.</p>
      <p>Because they come from small, fast-moving channels, the <strong>× subs</strong> reach
      multiple matters more than raw views.
      ${biggestReach ? `The strongest here, “${biggestReach.title}”, pulled
      ${compactNumber(biggestReach.views)} views on ${compactNumber(biggestReach.subs)} subscribers —
      ${multiple(biggestReach.views / biggestReach.subs)} its audience size.` : ''}</p>
      <p><strong>Views/hr</strong> is this application's own arithmetic — lifetime views divided by
      hours since publication — not official YouTube analytics.
      ${leader ? `The view leader, “${leader.title}”, has ${exactNumber(leader.views)} views.` : ''}
      This is a curated breakout set discovered via vidIQ, not a census of every qualifying Short.</p>`));
  }, loadShortsReport);
}

/** Top-Shorts-by-views bar chart, scaled against the leader. */
function barChartTop(rows) {
  return barChart(chartRows(rows, {
    value: (r) => r.views,
    display: (r) => compactNumber(r.views),
  }));
}
