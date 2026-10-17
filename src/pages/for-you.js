/**
 * For You — the seven-day production planner.
 *
 * The planner itself is unchanged; this only feeds it. It needs the snapshot
 * for its signals and every recorded shot list for its scene timings, so it is
 * the one page that loads both.
 */

import { loadAllShotlists, loadShotlistIndex, loadSnapshot } from '../data.js';
import { renderStatus, statusUnavailable } from '../nav.js';
import { errorState, setHTML } from '../ui.js';
import { buildReport } from '../shorts.js';
import { mountForYou } from '../foryou.js';
import { renderTitleIdeas, bindTitleIdeas } from '../planner/titleideas.js';

export default async function mount() {
  // The title swipe file is static curated data, so it renders immediately and
  // independently of the snapshot — a failed fetch below must not hide it.
  setHTML('#foryou-titleideas', renderTitleIdeas());
  bindTitleIdeas();

  try {
    const snapshot = await loadSnapshot();
    renderStatus(buildReport(snapshot), snapshot);

    const index = await loadShotlistIndex();
    const shotlists = await loadAllShotlists(index.videoIds ?? []);
    mountForYou(snapshot, shotlists);
  } catch (err) {
    statusUnavailable();
    setHTML('#foryou-board', errorState('Data unavailable',
      `The video snapshot could not be loaded — ${err.message}. The planner reads its `
      + 'signals from that snapshot, so it cannot build a plan without it.'));
  }
}
