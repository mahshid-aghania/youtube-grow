/**
 * Analysis for a snapshot of YouTube Shorts on a topic.
 *
 * Pure functions over an array of video records — no network, no clock — so the
 * whole module is directly testable. Fetching lives in scripts/fetch-shorts.js.
 *
 * A video record looks like:
 *   { id, title, channel, channelId, country, subs,
 *     publishedAt, durationSec, views, likes, comments, engagementRate, vph }
 */

/** YouTube's own cut-off for what counts as a Short. */
export const MAX_SHORT_SECONDS = 180;

export function isShort(video) {
  return Number.isFinite(video.durationSec) && video.durationSec <= MAX_SHORT_SECONDS;
}

/**
 * Keep videos published within [start, end).
 *
 * @param {object[]} videos
 * @param {{start: string|Date, end: string|Date}} window
 */
export function withinWindow(videos, { start, end }) {
  const from = new Date(start).getTime();
  const to = new Date(end).getTime();
  if (Number.isNaN(from) || Number.isNaN(to)) {
    throw new RangeError('window start and end must be valid dates');
  }
  return videos.filter((v) => {
    const at = new Date(v.publishedAt).getTime();
    return !Number.isNaN(at) && at >= from && at < to;
  });
}

/** Median of a numeric array. Returns 0 for an empty array. */
export function median(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Headline totals for a set of videos.
 *
 * engagementRate is computed from the summed counts rather than averaged from
 * the per-video rates, so one tiny video can't swing it.
 */
export function summarize(videos) {
  const views = videos.reduce((t, v) => t + v.views, 0);
  const likes = videos.reduce((t, v) => t + v.likes, 0);
  const comments = videos.reduce((t, v) => t + v.comments, 0);
  const channels = new Set(videos.map((v) => v.channelId));

  return {
    videoCount: videos.length,
    channelCount: channels.size,
    views,
    likes,
    comments,
    medianViews: median(videos.map((v) => v.views)),
    meanViews: videos.length ? Math.round(views / videos.length) : 0,
    engagementRate: views ? Math.round(((likes + comments) / views) * 10000) / 100 : 0,
    medianDurationSec: median(videos.map((v) => v.durationSec)),
    peakVph: videos.reduce((max, v) => Math.max(max, v.vph ?? 0), 0),
  };
}

/** Top N videos by a numeric field, highest first. */
export function rankBy(videos, field, limit = 10) {
  return [...videos]
    .filter((v) => Number.isFinite(v[field]))
    .sort((a, b) => b[field] - a[field])
    .slice(0, limit);
}

/**
 * Roll the videos up per channel, best-performing channel first.
 * `subs` takes the largest value seen, since a channel can gain subscribers
 * between two videos in the same window.
 */
export function byChannel(videos, limit = 10) {
  const map = new Map();
  for (const v of videos) {
    const row = map.get(v.channelId) ?? {
      channelId: v.channelId, channel: v.channel, country: v.country,
      subs: 0, videoCount: 0, views: 0, likes: 0, comments: 0,
    };
    row.videoCount += 1;
    row.views += v.views;
    row.likes += v.likes;
    row.comments += v.comments;
    row.subs = Math.max(row.subs, v.subs ?? 0);
    map.set(v.channelId, row);
  }
  return [...map.values()].sort((a, b) => b.views - a.views).slice(0, limit);
}

/**
 * Views and uploads bucketed by UTC publish date, chronological.
 * Days with no uploads in the set are omitted — see `fillDays` to pad them.
 */
export function byDay(videos) {
  const map = new Map();
  for (const v of videos) {
    const day = v.publishedAt.slice(0, 10);
    const row = map.get(day) ?? { day, videoCount: 0, views: 0 };
    row.videoCount += 1;
    row.views += v.views;
    map.set(day, row);
  }
  return [...map.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Pad a byDay() series so every date in [start, end) is present. */
export function fillDays(series, { start, end }) {
  const bySlot = new Map(series.map((r) => [r.day, r]));
  const out = [];
  const cursor = new Date(start);
  const stop = new Date(end);
  while (cursor < stop) {
    const day = cursor.toISOString().slice(0, 10);
    out.push(bySlot.get(day) ?? { day, videoCount: 0, views: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}

/**
 * Videos that beat their channel's size — views per subscriber.
 * Channels under `minSubs` are skipped: a 300-subscriber channel with one
 * viral hit produces a meaningless ratio in the thousands.
 */
export function breakouts(videos, { minSubs = 1000, limit = 10 } = {}) {
  return videos
    .filter((v) => (v.subs ?? 0) >= minSubs)
    .map((v) => ({ ...v, viewsPerSub: Math.round((v.views / v.subs) * 100) / 100 }))
    .sort((a, b) => b.viewsPerSub - a.viewsPerSub)
    .slice(0, limit);
}

/** 43836834 -> "43.8M". Keeps big tables readable. */
export function compact(n) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(Math.round(n));
}

/**
 * The whole report, from a raw snapshot to everything the page renders.
 *
 * @param {{windowStart: string, windowEnd: string, videos: object[]}} snapshot
 */
export function buildReport(snapshot) {
  const window = { start: snapshot.windowStart, end: snapshot.windowEnd };
  const videos = withinWindow(snapshot.videos.filter(isShort), window);

  return {
    topic: snapshot.topic,
    window,
    fetchedAt: snapshot.fetchedAt,
    source: snapshot.source,
    coverage: snapshot.coverage ?? 'partial',
    coverageNote: snapshot.coverageNote ?? '',
    excluded: snapshot.videos.length - videos.length,
    totals: summarize(videos),
    topByViews: rankBy(videos, 'views', 10),
    topByVph: rankBy(videos, 'vph', 10),
    topChannels: byChannel(videos, 8),
    daily: fillDays(byDay(videos), window),
    breakouts: breakouts(videos, { minSubs: 1000, limit: 8 }),
  };
}
