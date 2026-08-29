/** Top Shorts by views — the complete reach ranking. */

import { viewsChartRows } from '../insights.js';
import { compactNumber } from '../format.js';
import {
  barChart, durationColumn, mountTable, noteCard, rankCell, setHTML, videoCell,
  viewsColumn, vphColumn,
} from '../ui.js';
import { withReport } from './shared.js';

const MOUNTS = ['#chart-views', '#table-views'];

export default function mount() {
  withReport(MOUNTS, ({ report, deep }) => {
    setHTML('#chart-views', barChart(viewsChartRows(report, 8)));

    mountTable('#table-views', {
      caption: 'Top Roblox Shorts ranked by lifetime views',
      rows: deep.topByViews,
      initial: 10,
      searchInput: '#search-views',
      columns: [
        { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
        { key: 'video', label: 'Video', primary: true, render: videoCell },
        viewsColumn(),
        vphColumn(),
        durationColumn(),
      ],
    });

    setHTML('#notes-top-shorts', noteCard('What these numbers mean', `
      <p><strong>Views</strong> is the lifetime total YouTube reported for the video when the
      snapshot was collected — not views earned inside the tracked window. A video published
      shortly before the window closed carries its whole history here.</p>
      <p><strong>Views/hr</strong> divides those lifetime views by the hours since publication.
      It is an average pace over the video's whole life, not a live rate, and it flatters
      anything published very recently.</p>
      <p><strong>Subscriber counts</strong> are the channel's total at collection time. Each
      title links to the video on YouTube.</p>
      <p>This snapshot is the head of the distribution for ${compactNumber(report.totals.videoCount)}
      tracked Shorts, not a census of everything published.</p>`));
  });
}
