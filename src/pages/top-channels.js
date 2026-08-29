/** Top Channels — the complete publisher ranking. */

import { compactNumber, exactNumber } from '../format.js';
import {
  barChart, channelUrl, esc, extLink, mountTable, noteCard, numCell, rankCell, setHTML,
} from '../ui.js';
import { chartRows, withReport } from './shared.js';

const MOUNTS = ['#chart-channels', '#table-channels'];

/** Average views per Short this channel has in the window, when it is meaningful. */
const avgPerShort = (c) => (c.videoCount > 0 ? c.views / c.videoCount : 0);

export default function mount() {
  withReport(MOUNTS, ({ deep, report }) => {
    setHTML('#chart-channels', barChart(chartRows(deep.topChannels, {
      value: (c) => c.views,
      display: (c) => compactNumber(c.views),
    }).map((row) => ({ ...row, label: `${row.channel}`, channel: 'Total views' }))));

    mountTable('#table-channels', {
      caption: 'Channels ranked by total views across their Shorts in this window',
      rows: deep.topChannels,
      initial: 10,
      searchInput: '#search-channels',
      columns: [
        { key: 'rank', label: '#', cellClass: 'cell-rank', render: (_r, i) => rankCell(i) },
        { key: 'channel', label: 'Channel', primary: true, render: (c) => `
            <div class="cell-video__body">
              ${extLink(channelUrl(c.channelId), esc(c.channel), 'cell-video__title')}
              <div class="cell-video__meta"><span>${compactNumber(c.subs)} subscribers</span></div>
            </div>` },
        { key: 'count', label: 'Shorts', align: 'right', sortValue: (c) => c.videoCount,
          tooltip: 'How many of this channel’s Shorts appear in the tracked window.',
          render: (c) => numCell(String(c.videoCount), `${c.videoCount} Shorts in this window`) },
        { key: 'subs', label: 'Subs', align: 'right', sortValue: (c) => c.subs,
          render: (c) => numCell(compactNumber(c.subs), exactNumber(c.subs)) },
        { key: 'avg', label: 'Avg / Short', align: 'right', sortValue: avgPerShort,
          tooltip: 'Total views divided by the number of this channel’s Shorts in the window.',
          render: (c) => (c.videoCount > 0
            ? numCell(compactNumber(avgPerShort(c)), `${exactNumber(Math.round(avgPerShort(c)))} views per tracked Short`)
            : '<span class="muted">—</span>') },
        { key: 'views', label: 'Views', align: 'right', sortValue: (c) => c.views,
          tooltip: 'Every tracked Short from this channel, added together.',
          render: (c) => numCell(compactNumber(c.views), exactNumber(c.views), 'metric-channel') },
      ],
    });

    setHTML('#notes-channels', noteCard('How this ranking is built', `
      <p><strong>Views</strong> sums the lifetime views of every Short this channel published
      inside the tracked window. A channel with one enormous video can outrank one with several
      solid ones — the <strong>Shorts</strong> and <strong>Avg / Short</strong> columns are
      there to tell those two cases apart.</p>
      <p><strong>Avg / Short</strong> is total views divided by tracked Shorts, so it describes
      this window only, not the channel's catalogue.</p>
      <p><strong>Subs</strong> is the channel's subscriber total at collection time. It is not
      window-scoped and says nothing about how many of those subscribers watched.</p>
      <p>${report.totals.channelCount} channels appear in this window. Channel names link to
      YouTube.</p>`));
  });
}
