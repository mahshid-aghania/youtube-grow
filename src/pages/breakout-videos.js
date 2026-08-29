/** Breakout Videos — reach relative to channel size. */

import { compactNumber, exactNumber, multiple } from '../format.js';
import {
  durationColumn, esc, mountTable, noteCard, numCell, rankCell, setHTML, videoCell, viewsColumn,
} from '../ui.js';
import { withReport } from './shared.js';

const MOUNTS = ['#table-breakouts'];
const MIN_SUBS = 1000;

export default function mount() {
  withReport(MOUNTS, ({ deep, videos }) => {
    mountTable('#table-breakouts', {
      caption: 'Videos ranked by views relative to their channel’s subscriber count',
      rows: deep.breakouts,
      initial: 10,
      searchInput: '#search-breakouts',
      emptyText: `No channel in this window clears the ${MIN_SUBS.toLocaleString('en-GB')}-subscriber floor.`,
      columns: [
        { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
        { key: 'video', label: 'Video', primary: true, render: videoCell },
        { key: 'subs', label: 'Subs', align: 'right', sortValue: (r) => r.subs,
          tooltip: 'The channel’s subscriber total at collection time.',
          render: (r) => numCell(compactNumber(r.subs), exactNumber(r.subs)) },
        viewsColumn('metric-views'),
        durationColumn(),
        { key: 'ratio', label: '× subs', align: 'right', sortValue: (r) => r.viewsPerSub,
          tooltip: `Views divided by subscriber count. Channels under ${MIN_SUBS.toLocaleString('en-GB')} subscribers are excluded.`,
          render: (r) => `<span class="badge-mult" title="${esc(exactNumber(r.views))} views on ${esc(exactNumber(r.subs))} subscribers">${multiple(r.viewsPerSub)}</span>` },
      ],
    });

    const excluded = videos.filter((v) => (v.subs ?? 0) < MIN_SUBS).length;
    setHTML('#notes-breakouts', noteCard('How the multiple is calculated, and who is excluded', `
      <p>The <strong>× subs</strong> column is lifetime views divided by the channel's
      subscriber count at collection time. A video showing 200× reached two hundred times as
      many views as its channel has subscribers.</p>
      <p><strong>Channels under ${MIN_SUBS.toLocaleString('en-GB')} subscribers are excluded.</strong>
      Below that floor the ratio stops describing anything: a channel with 3 subscribers and a
      modest video produces a five-figure multiple that says more about the denominator than
      the video. ${excluded > 0
        ? `${excluded} of ${videos.length} tracked Shorts in this window sit below the floor and
           are not listed here.`
        : 'No tracked Short in this window sits below the floor.'}</p>
      <p>Both halves of the ratio are point-in-time totals, so a video that went wide months ago
      is compared against today's subscriber count — which the video itself may have grown.</p>`));
  });
}
