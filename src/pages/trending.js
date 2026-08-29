/** Trending Now — the complete views-per-hour ranking. */

import { compactNumber, exactNumber } from '../format.js';
import {
  barChart, durationColumn, mountTable, noteCard, rankCell, setHTML, videoCell,
  viewsColumn, vphColumn,
} from '../ui.js';
import { chartRows, withReport } from './shared.js';

const MOUNTS = ['#chart-vph', '#table-vph'];

export default function mount() {
  withReport(MOUNTS, ({ deep }) => {
    setHTML('#chart-vph', barChart(chartRows(deep.topByVph, {
      value: (r) => r.vph,
      display: (r) => `${compactNumber(r.vph)}/hr`,
    })));

    mountTable('#table-vph', {
      caption: 'Roblox Shorts ranked by average views per hour',
      rows: deep.topByVph,
      initial: 10,
      searchInput: '#search-vph',
      columns: [
        { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
        { key: 'video', label: 'Video', primary: true, render: videoCell },
        vphColumn(),
        viewsColumn('metric-views'),
        durationColumn(),
      ],
    });

    const fastest = deep.topByVph[0];
    setHTML('#notes-trending', noteCard('How views per hour is calculated', `
      <p>Views per hour is this application's own arithmetic: the lifetime views YouTube
      reported for a video, divided by the hours between its publication time and the moment
      the snapshot was collected.</p>
      <p><strong>It is not official YouTube analytics.</strong> Nothing here comes from YouTube
      Analytics, a channel's private dashboard, or any authenticated API — those would require
      the channel owner's credentials. This is a public-data average, computed from the
      snapshot in this repository.</p>
      <p>Because it averages over a video's whole life, it favours recent uploads: a video
      published hours ago is measured over a short window, while one published a week ago has
      had time for its pace to settle.
      ${fastest ? `The leader here, “${fastest.title}”, averages
      ${exactNumber(Math.round(fastest.vph))} views per hour.` : ''}</p>
      <p>There is no trend data in a snapshot — a single window has no history — so this page
      shows no percentage change and no period-over-period comparison.</p>`));
  });
}
