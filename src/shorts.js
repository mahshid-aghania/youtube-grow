/**
 * Analysis for a snapshot of popular long-form couples and family videos.
 *
 * Pure functions over an array of video records — no network, no clock — so the
 * whole module is directly testable. Fetching lives in scripts/fetch-videos.js.
 *
 * A video record looks like:
 *   { id, title, topic, channel, channelId, country, subs,
 *     publishedAt, durationSec, views, likes, comments, engagementRate, vph }
 *
 * Eligibility (the discovery rules the whole product is built around):
 *   - long-form: at least 8 minutes by default;
 *   - popular:   at least 1,000,000 verified views;
 *   - in range:  published 2021-01-01 through 2026-12-31 inclusive, never in the
 *                future — enforced by withinWindow against the snapshot window,
 *                whose end is the collection time (and is clamped to 2026).
 */

/** Default minimum runtime for a long-form video: eight minutes. */
export const MIN_LONGFORM_SECONDS = 8 * 60;

/** Default minimum verified view count. */
export const MIN_VIEWS = 1_000_000;

/** The publication window the product covers. */
export const ELIGIBLE_START = '2021-01-01T00:00:00Z';
/** Exclusive upper bound: 2026-12-31 inclusive means "before 2027". */
export const ELIGIBLE_END = '2027-01-01T00:00:00Z';

/**
 * The selectable minimum-view thresholds, wired to the filter controls.
 * Each is a { value, label } the interface renders directly.
 */
export const VIEW_THRESHOLDS = [
  { value: 1_000_000, label: '1M+' },
  { value: 5_000_000, label: '5M+' },
  { value: 10_000_000, label: '10M+' },
  { value: 25_000_000, label: '25M+' },
  { value: 50_000_000, label: '50M+' },
];

/** The selectable minimum-duration thresholds, wired to the filter controls. */
export const DURATION_THRESHOLDS = [
  { value: 480, label: '8 min+' },
  { value: 900, label: '15 min+' },
  { value: 1200, label: '20 min+' },
  { value: 1800, label: '30 min+' },
  { value: 3600, label: '1 hour+' },
];

/** Is this a watchable long-form video, at or above `minDurationSec`? */
export function isLongForm(video, minDurationSec = MIN_LONGFORM_SECONDS) {
  return Number.isFinite(video?.durationSec) && video.durationSec >= minDurationSec;
}

/**
 * Does a record meet the duration and view thresholds?
 *
 * Publication-date eligibility is handled separately by withinWindow, because a
 * pure record has no notion of "now"; the snapshot window carries the dates.
 * Records missing the metadata needed to prove eligibility fail closed.
 */
export function isEligible(video, { minDurationSec = MIN_LONGFORM_SECONDS, minViews = MIN_VIEWS } = {}) {
  return isLongForm(video, minDurationSec)
    && Number.isFinite(video?.views) && video.views >= minViews;
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

/**
 * The publication window for a snapshot, with the end clamped so a future date
 * can never slip in: never past the collection time, and never past 2026.
 */
export function reportWindow(snapshot) {
  const start = snapshot.windowStart ?? ELIGIBLE_START;
  const rawEnd = new Date(snapshot.windowEnd ?? snapshot.fetchedAt ?? ELIGIBLE_END).getTime();
  const cap = new Date(ELIGIBLE_END).getTime();
  const end = new Date(Math.min(Number.isNaN(rawEnd) ? cap : rawEnd, cap))
    .toISOString().replace(/\.\d{3}Z$/, 'Z');
  return { start, end };
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
 * the per-video rates, so one small video can't swing it.
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
 * between two videos in the same set.
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

/**
 * Bucket the videos by publication month (UTC), chronological.
 * The covered window spans years, so a per-day series would be mostly empty —
 * a per-month rollup is what actually describes the distribution over time.
 */
export function byMonth(videos) {
  const map = new Map();
  for (const v of videos) {
    const month = v.publishedAt.slice(0, 7);
    const row = map.get(month) ?? { month, videoCount: 0, views: 0 };
    row.videoCount += 1;
    row.views += v.views;
    map.set(month, row);
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Videos and combined views bucketed by publication year (UTC), chronological. */
export function byYear(videos) {
  const map = new Map();
  for (const v of videos) {
    const year = v.publishedAt.slice(0, 4);
    const row = map.get(year) ?? { year, videoCount: 0, views: 0 };
    row.videoCount += 1;
    row.views += v.views;
    map.set(year, row);
  }
  return [...map.values()].sort((a, b) => a.year.localeCompare(b.year));
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

/** How the topic mix breaks down across a set of videos. */
export function topicBreakdown(videos) {
  const counts = new Map();
  for (const v of videos) {
    const topic = v.topic ?? 'other';
    counts.set(topic, (counts.get(topic) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([topic, count]) => ({ topic, count, share: count / (videos.length || 1) }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic));
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
 * The minimum views and duration default to the snapshot's own thresholds (and
 * fall back to the product defaults), but a caller can raise them — this is what
 * the view-threshold and duration filter controls drive.
 *
 * @param {object} snapshot
 * @param {{minViews?: number, minDurationSec?: number}} [filters]
 */
export function buildReport(snapshot, filters = {}) {
  const window = reportWindow(snapshot);
  const minViews = filters.minViews ?? snapshot.minViews ?? MIN_VIEWS;
  const minDurationSec = filters.minDurationSec ?? snapshot.minDurationSec ?? MIN_LONGFORM_SECONDS;

  const eligible = snapshot.videos.filter((v) => isEligible(v, { minViews, minDurationSec }));
  const videos = withinWindow(eligible, window);

  return {
    scope: snapshot.scope ?? 'couples-family',
    topics: snapshot.topics ?? ['couples', 'family'],
    minViews,
    minDurationSec,
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
    yearly: byYear(videos),
    topics_breakdown: topicBreakdown(videos),
    breakouts: breakouts(videos, { minSubs: 1000, limit: 8 }),
  };
}
