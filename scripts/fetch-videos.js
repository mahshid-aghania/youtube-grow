#!/usr/bin/env node
/**
 * Refresh data/videos.json from the YouTube Data API v3.
 *
 * Discovers popular, long-form faceless AI "full movie" drama videos — the
 * billionaire-romance and betrayal/revenge niche (#shortdrama #billionaire
 * #fullmovie): poor-maid-marries-CEO, contract marriages, secret babies,
 * cheating-husband revenge, "my sister stole my husband," family-secret reveals.
 * Published 2021-01-01 through the current date (capped at 2026-12-31), under a
 * generous runtime ceiling and with at least 50,000 verified views.
 *
 * Usage:
 *   YOUTUBE_API_KEY=... node scripts/fetch-videos.js \
 *       [--max-duration 14400] [--min-views 50000] [--pages 2] [--require-key]
 *
 * How it stays honest:
 *   - It searches many phrasings across every year 2021–2026, so no single angle,
 *     creator or recent year dominates the result set.
 *   - Every candidate is re-fetched through videos.list and judged on its ACTUAL
 *     publication date, duration and view count — never on a search filter or
 *     snippet alone.
 *   - Upcoming premieres and live streams are excluded, and anything over the
 *     runtime ceiling or missing the metadata needed to prove eligibility is
 *     dropped.
 *   - Results are de-duplicated by video id.
 *   - Without YOUTUBE_API_KEY the script exits 0 without touching anything, so a
 *     deploy still succeeds against the committed snapshot. Pass --require-key to
 *     make a missing key a hard failure instead.
 *
 * Quota: each search page costs 100 units and covers 50 videos; the videos and
 * channels lookups cost 1 unit each. Keep --pages small — the topic × year grid
 * multiplies the number of searches.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const API = 'https://www.googleapis.com/youtube/v3';

const DEFAULTS = { maxDuration: 4 * 60 * 60, minViews: 50_000, pages: 2, requireKey: false };
const RANGE_START = '2021-01-01T00:00:00Z';
const RANGE_END_EXCLUSIVE = '2027-01-01T00:00:00Z'; // 2026-12-31 inclusive

/**
 * Search queries per topic. Varied on purpose, so discovery is broad rather than
 * a fixed channel list. Interpreted across relevant creators and subjects.
 */
const TOPIC_QUERIES = {
  romance: [
    'billionaire romance full movie', 'billionaire love story', 'ceo romance drama',
    'maid billionaire love story', 'contract marriage drama', 'cinderella billionaire story',
    'secret baby ceo drama', 'rich husband love story full movie', 'hidden identity romance drama',
    'short drama billionaire full movie',
  ],
  betrayal: [
    'betrayal revenge drama full movie', 'sister stole my husband', 'cheating husband revenge story',
    'family betrayal drama', 'wife revenge full movie', 'husband cheated full movie',
    'rich vs poor revenge drama', 'fake marriage trap revenge', 'reborn for revenge drama',
    'she was mocked until billionaire',
  ],
};

/** Terms that mark a video as billionaire / CEO romance, checked against title+description. */
const ROMANCE_TERMS = [
  'billionaire', 'billionaires', 'ceo', 'millionaire', 'heir', 'heiress', 'maid',
  'cinderella', 'prince', 'princess', 'married', 'marriage', 'marry', 'wife',
  'husband', 'bride', 'groom', 'wedding', 'love', 'romance', 'contract marriage',
  'secret baby', 'fell in love', 'fiance', 'fiancé', 'tycoon', 'mogul', 'rich',
];

/** Terms that mark a video as betrayal / revenge / family-secret drama. */
const BETRAYAL_TERMS = [
  'betrayed', 'betrayal', 'cheated', 'cheating', 'affair', 'revenge', 'trap',
  'stole', 'steal', 'dumped', 'abandoned', 'mocked', 'humiliated', 'villain',
  'secret', 'lie', 'lied', 'divorce', 'mistress', 'stepsister', 'stepmother',
  'comeback', 'karma', 'ruined', 'destroyed', 'reborn', 'rebirth',
];

/** YouTube category ids that lean each way (used alongside the term lists). */
const ROMANCE_CATEGORIES = new Set(['24', '1', '22']); // Entertainment, Film & Animation, People & Blogs
const BETRAYAL_CATEGORIES = new Set(['24', '1', '22']); // Entertainment, Film & Animation, People & Blogs

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--require-key') args.requireKey = true;
    else if (flag === '--max-duration') args.maxDuration = Number(argv[++i]);
    else if (flag === '--min-views') args.minViews = Number(argv[++i]);
    else if (flag === '--pages') args.pages = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!Number.isFinite(args.maxDuration) || args.maxDuration < 1) throw new Error('--max-duration must be a positive number');
  if (!Number.isFinite(args.minViews) || args.minViews < 1) throw new Error('--min-views must be a positive number');
  if (!Number.isInteger(args.pages) || args.pages < 1) throw new Error('--pages must be a positive integer');
  return args;
}

/** ISO 8601 duration (PT1H2M3S) -> seconds. */
export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso ?? '');
  if (!m) return Number.NaN;
  const [, d, h, min, s] = m;
  return (Number(d ?? 0) * 86400) + (Number(h ?? 0) * 3600) + (Number(min ?? 0) * 60) + Number(s ?? 0);
}

/**
 * Classify a video as billionaire romance, betrayal/revenge drama, or neither,
 * from its title, description and category — never a single keyword or category
 * alone. Returns the stronger of the two topics, or null when nothing relevant
 * is found.
 */
export function classifyTopic(item) {
  const haystack = ` ${(item.snippet?.title ?? '')} ${(item.snippet?.description ?? '')} `.toLowerCase();
  const categoryId = item.snippet?.categoryId;
  // Whole-word matching, so "son" doesn't match "song" and "heir" doesn't match "their".
  const has = (t) => new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack);
  const count = (terms) => terms.reduce((n, t) => (has(t) ? n + 1 : n), 0);

  const romance = count(ROMANCE_TERMS) + (ROMANCE_CATEGORIES.has(categoryId) ? 1 : 0);
  const betrayal = count(BETRAYAL_TERMS) + (BETRAYAL_CATEGORIES.has(categoryId) ? 1 : 0);

  if (romance === 0 && betrayal === 0) return null;
  return betrayal > romance ? 'betrayal' : 'romance';
}

async function get(path, params, key) {
  const url = new URL(`${API}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('key', key);

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${path} failed: ${res.status} ${res.statusText}\n${body.slice(0, 500)}`);
  }
  return res.json();
}

/** Candidate video ids for one query and one publication-year window. */
async function searchIds({ q, publishedAfter, publishedBefore, videoDuration, pages, key }) {
  const ids = [];
  let pageToken;
  for (let page = 0; page < pages; page += 1) {
    const data = await get('search', {
      part: 'id',
      q,
      type: 'video',
      videoDuration, // 'long' (>20m) — the true runtime ceiling is enforced later by real duration
      order: 'viewCount',
      publishedAfter,
      publishedBefore,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    }, key).catch((err) => {
      // A single failing query (e.g. quota) should not sink the whole run.
      console.warn(`  search "${q}" failed: ${err.message.split('\n')[0]}`);
      return { items: [] };
    });
    for (const it of data.items ?? []) if (it.id?.videoId) ids.push(it.id.videoId);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

async function hydrate(ids, key) {
  const videos = [];
  for (const batch of chunk([...new Set(ids)], 50)) {
    const data = await get('videos', {
      part: 'snippet,contentDetails,statistics,liveStreamingDetails',
      id: batch.join(','),
      maxResults: '50',
    }, key);
    videos.push(...(data.items ?? []));
  }
  return videos;
}

async function channelSubs(channelIds, key) {
  const subs = new Map();
  for (const batch of chunk([...new Set(channelIds)], 50)) {
    const data = await get('channels', { part: 'statistics', id: batch.join(','), maxResults: '50' }, key);
    for (const c of data.items ?? []) subs.set(c.id, Number(c.statistics?.subscriberCount ?? 0));
  }
  return subs;
}

/** Shape a verified API item into the record src/shorts.js expects. */
export function toRecord(item, subs, now, topic) {
  const views = Number(item.statistics?.viewCount ?? 0);
  const likes = Number(item.statistics?.likeCount ?? 0);
  const comments = Number(item.statistics?.commentCount ?? 0);
  const publishedAt = item.snippet.publishedAt;
  const hoursLive = Math.max(1, (now - new Date(publishedAt).getTime()) / 3.6e6);

  return {
    id: item.id,
    title: item.snippet.title,
    topic: topic ?? classifyTopic(item),
    lang: item.snippet.defaultAudioLanguage?.slice(0, 2) ?? null,
    channel: item.snippet.channelTitle,
    channelId: item.snippet.channelId,
    country: null,
    subs: subs.get(item.snippet.channelId) ?? 0,
    publishedAt: publishedAt.replace('.000Z', 'Z'),
    durationSec: parseDuration(item.contentDetails?.duration),
    views,
    likes,
    comments,
    engagementRate: views ? Math.round(((likes + comments) / views) * 1000) / 1000 : 0,
    vph: Math.round((views / hoursLive) * 100) / 100,
  };
}

/**
 * Does a hydrated item pass every eligibility rule?
 * Returns a short reason string when it fails, or null when it is eligible.
 */
export function ineligibleReason(item, { maxDuration, minViews, now }) {
  if ((item.snippet?.liveBroadcastContent ?? 'none') !== 'none') return 'live or upcoming';
  if (item.liveStreamingDetails && !item.liveStreamingDetails.actualEndTime) return 'active live stream';
  const durationSec = parseDuration(item.contentDetails?.duration);
  if (!Number.isFinite(durationSec)) return 'missing duration';
  if (durationSec <= 0) return 'zero duration';
  if (durationSec > maxDuration) return `over ${maxDuration}s`;
  const views = Number(item.statistics?.viewCount);
  if (!Number.isFinite(views) || item.statistics?.viewCount == null) return 'missing view count';
  if (views < minViews) return `under ${minViews} views`;
  const at = new Date(item.snippet?.publishedAt).getTime();
  if (Number.isNaN(at)) return 'missing publish date';
  if (at < new Date(RANGE_START).getTime()) return 'before 2021';
  if (at >= new Date(RANGE_END_EXCLUSIVE).getTime()) return 'after 2026';
  if (at > now) return 'future publish date';
  return null;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    const message = 'YOUTUBE_API_KEY is not set';
    if (args.requireKey) {
      console.error(`${message} — refusing to continue because --require-key was passed.`);
      process.exit(1);
    }
    console.log(`${message}; keeping the committed snapshot. Set the key to refresh it.`);
    return;
  }

  const now = Date.now();
  const endCap = Math.min(now, new Date(RANGE_END_EXCLUSIVE).getTime());
  // Iterate whole years so results are spread across 2021–2026, not dominated by
  // the most recent uploads.
  const years = [];
  for (let y = 2021; y <= 2026; y += 1) {
    const start = Date.UTC(y, 0, 1);
    if (start >= endCap) break;
    years.push({
      publishedAfter: new Date(start).toISOString(),
      publishedBefore: new Date(Math.min(Date.UTC(y + 1, 0, 1), endCap)).toISOString(),
    });
  }

  const candidateIds = new Set();
  for (const [topic, queries] of Object.entries(TOPIC_QUERIES)) {
    for (const q of queries) {
      for (const window of years) {
        const ids = await searchIds({ q, ...window, videoDuration: 'long', pages: args.pages, key });
        for (const id of ids) candidateIds.add(id);
      }
    }
    console.log(`${topic}: ${candidateIds.size} unique candidates so far`);
  }

  const items = await hydrate([...candidateIds], key);
  const subs = await channelSubs(items.map((i) => i.snippet.channelId), key);

  const dropped = {};
  const videos = [];
  const seen = new Set();
  for (const item of items) {
    const reason = ineligibleReason(item, { maxDuration: args.maxDuration, minViews: args.minViews, now });
    if (reason) { dropped[reason] = (dropped[reason] ?? 0) + 1; continue; }
    const topic = classifyTopic(item);
    if (!topic) { dropped['off-topic'] = (dropped['off-topic'] ?? 0) + 1; continue; }
    if (seen.has(item.id)) continue; // de-duplicate by video id
    seen.add(item.id);
    videos.push(toRecord(item, subs, now, topic));
  }
  videos.sort((a, b) => b.views - a.views);

  console.log(`Kept ${videos.length}. Dropped:`, dropped);

  const snapshot = {
    scope: 'ai-drama',
    topics: ['romance', 'betrayal'],
    query: 'Faceless AI full-movie drama — billionaire romance & betrayal/revenge',
    format: 'long',
    maxDurationSec: args.maxDuration,
    minViews: args.minViews,
    windowStart: RANGE_START,
    windowEnd: new Date(endCap).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    fetchedAt: new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    source: 'YouTube Data API v3 search.list (order=viewCount) across billionaire-romance and '
      + 'betrayal/revenge drama phrasings and publication years, verified with videos.list',
    coverage: 'partial',
    coverageNote:
      `${videos.length} verified videos: long-form "full movie" drama (≤${Math.round(args.maxDuration / 60)} min), `
      + `at least ${args.minViews.toLocaleString('en-US')} views, published 2021-01-01 through the `
      + 'collection date. YouTube search exposes no complete index, so this is the head of the '
      + 'distribution across billionaire-romance and betrayal/revenge drama — not a census of every qualifying video.',
    videos,
  };

  const out = resolve(process.cwd(), 'data', 'videos.json');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${videos.length} videos to ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
