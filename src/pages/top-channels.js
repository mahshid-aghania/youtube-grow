/** Top Channels — the complete publisher ranking. */

import { compactNumber, exactNumber } from '../format.js';
import {
  barChart, channelUrl, esc, extLink, mountTable, noteCard, numCell, rankCell, setHTML,
} from '../ui.js';
import { chartRows, withReport } from './shared.js';

const MOUNTS = ['#chart-channels', '#table-channels'];

/** Average views per tracked video this channel has, when it is meaningful. */
const avgPerVideo = (c) => (c.videoCount > 0 ? c.views / c.videoCount : 0);

export default function mount() {
  withReport(MOUNTS, ({ deep, report }) => {
    setHTML('#chart-channels', barChart(chartRows(deep.topChannels, {
      value: (c) => c.views,
      display: (c) => compactNumber(c.views),
    }).map((row) => ({ ...row, label: `${row.channel}`, channel: 'Total views' }))));

    mountTable('#table-channels', {
      caption: 'Channels ranked by total views across their tracked videos',
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
        { key: 'count', label: 'Videos', align: 'right', sortValue: (c) => c.videoCount,
          tooltip: 'How many of this channel’s tracked videos appear here.',
          render: (c) => numCell(String(c.videoCount), `${c.videoCount} tracked videos`) },
        { key: 'subs', label: 'Subs', align: 'right', sortValue: (c) => c.subs,
          render: (c) => numCell(compactNumber(c.subs), exactNumber(c.subs)) },
        { key: 'avg', label: 'Avg / video', align: 'right', sortValue: avgPerVideo,
          tooltip: 'Total views divided by the number of this channel’s tracked videos.',
          render: (c) => (c.videoCount > 0
            ? numCell(compactNumber(avgPerVideo(c)), `${exactNumber(Math.round(avgPerVideo(c)))} views per tracked video`)
            : '<span class="muted">—</span>') },
        { key: 'views', label: 'Views', align: 'right', sortValue: (c) => c.views,
          tooltip: 'Every tracked Short from this channel, added together.',
          render: (c) => numCell(compactNumber(c.views), exactNumber(c.views), 'metric-channel') },
      ],
    });

    setHTML('#notes-channels', noteCard('How this ranking is built', `
      <p><strong>Views</strong> sums the lifetime views of every tracked video this channel
      published. A channel with one enormous video can outrank one with several
      solid ones — the <strong>Videos</strong> and <strong>Avg / video</strong> columns are
      there to tell those two cases apart.</p>
      <p><strong>Avg / video</strong> is total views divided by tracked videos, so it describes
      this tracked set only, not the channel's catalogue.</p>
      <p><strong>Subs</strong> is the channel's subscriber total at collection time. It is not
      window-scoped and says nothing about how many of those subscribers watched.</p>
      <p>${report.totals.channelCount} channels appear in this window. Channel names link to
      YouTube.</p>`));
  });
}
