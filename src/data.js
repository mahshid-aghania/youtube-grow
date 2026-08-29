/**
 * Shared data loading.
 *
 * Two things matter here.
 *
 * First, every page must load on its own. A tab opened directly at
 * `/youtube-grow/trending/` has no idea whether any other tab exists, so each
 * page fetches what it needs and nothing more — the Shot Analyzer never reads
 * the snapshot, and only For You reads the shot lists.
 *
 * Second, paths are resolved against this module's own URL rather than the
 * document's. The module always lives at the site root while the document may
 * be a directory down, so `new URL(..., import.meta.url)` gives the right
 * address from `/youtube-grow/` and `/youtube-grow/for-you/` alike, with no
 * base path hard-coded anywhere.
 */

import { buildReport, isShort, withinWindow, rankBy, byChannel, breakouts } from './shorts.js';

/** Absolute URL for a path relative to the site root. */
export const asset = (path) => new URL(path, import.meta.url).href;

/** In-page memo, so two components on one page never fetch the same file twice. */
const inflight = new Map();

function once(key, load) {
  if (!inflight.has(key)) inflight.set(key, load());
  return inflight.get(key);
}

async function getJson(path) {
  const res = await fetch(asset(path));
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json();
}

/** The committed snapshot. */
export const loadSnapshot = () => once('snapshot', () => getJson('data/roblox-shorts.json'));

/** The list of videos with a recorded scene breakdown. */
export const loadShotlistIndex = () => once('shotlist-index', async () => {
  try {
    return await getJson('data/shotlists/index.json');
  } catch {
    // The analyzer renders its own empty state; a missing index is not fatal.
    return { videoIds: [] };
  }
});

/** One recorded scene breakdown. Throws so the caller can tell 404 from failure. */
export async function loadShotlist(videoId) {
  const res = await fetch(asset(`data/shotlists/${encodeURIComponent(videoId)}.json`));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`the server returned ${res.status}`);
  return res.json();
}

/** Every recorded shot list, skipping any that fail. */
export async function loadAllShotlists(videoIds) {
  const lists = await Promise.all(videoIds.map(async (id) => {
    try { return await loadShotlist(id); } catch { return null; }
  }));
  return lists.filter(Boolean);
}

/**
 * The snapshot, the report, and the deeply-ranked tables, computed once.
 *
 * `buildReport` caps its rankings at ten for the overview; the tables re-rank
 * the same filtered set further so "Show all" has something to reveal. The
 * analysis functions themselves are untouched — this only calls them.
 */
export const loadReport = () => once('report', async () => {
  const snapshot = await loadSnapshot();
  const report = buildReport(snapshot);
  const videos = withinWindow(snapshot.videos.filter(isShort),
    { start: snapshot.windowStart, end: snapshot.windowEnd });

  return {
    snapshot,
    report,
    videos,
    deep: {
      topByViews: rankBy(videos, 'views', 40),
      topByVph: rankBy(videos, 'vph', 40),
      topChannels: byChannel(videos, 30),
      breakouts: breakouts(videos, { minSubs: 1000, limit: 30 }),
    },
  };
});
