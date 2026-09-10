/** Top Videos by views — the complete reach ranking. */

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
      caption: 'Top entertainment and science videos ranked by lifetime views',
      rows: deep.topByViews,
      initial: 10,
      searchInput: '#search-views',
      minViewsInput: '#filter-views',
      minDurationInput: '#filter-duration',
      columns: [
        { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
        { key: 'video', label: 'Video', primary: true, render: videoCell },
        viewsColumn(),
        vphColumn(),
        durationColumn(),
      ],
    });

    setHTML('#notes-top-videos', noteCard('What these numbers mean', `
      <p><strong>Views</strong> is the lifetime total YouTube reported for the video when the
      snapshot was collected. Every video here has at least one million verified views and runs
      at least eight minutes; the filters above raise those floors but never lower them.</p>
      <p><strong>Views/hr</strong> divides those lifetime views by the hours since publication.
      It is an average pace over the video's whole life, not a live rate, and it flatters
      anything published very recently.</p>
      <p><strong>Subscriber counts</strong> are the channel's total at collection time. Each
      title links to the video on YouTube.</p>
      <p>This snapshot is the head of the distribution for ${compactNumber(report.totals.videoCount)}
      tracked videos across entertainment and science, not a census of everything published.</p>`));
  });
}
