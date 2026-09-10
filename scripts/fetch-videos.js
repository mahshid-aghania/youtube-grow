#!/usr/bin/env node
/**
 * Refresh data/videos.json from the YouTube Data API v3.
 *
 * Discovers highly popular, long-form YouTube videos about entertainment and
 * science, published 2021-01-01 through the current date (capped at 2026-12-31),
 * at least 8 minutes long and with at least 1,000,000 verified views.
 *
 * Usage:
 *   YOUTUBE_API_KEY=... node scripts/fetch-videos.js \
 *       [--min-duration 480] [--min-views 1000000] [--pages 2] [--require-key]
 *
 * How it stays honest:
 *   - It searches many topics across every year 2021–2026, so no single subject,
 *     creator or recent year dominates the result set.
 *   - Every candidate is re-fetched through videos.list and judged on its ACTUAL
 *     publication date, duration and view count — never on a search filter or
 *     snippet alone.
 *   - Shorts, upcoming premieres and live streams are excluded; anything missing
 *     the metadata needed to prove eligibility is dropped.
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

const DEFAULTS = { minDuration: 8 * 60, minViews: 1_000_000, pages: 2, requireKey: false };
const RANGE_START = '2021-01-01T00:00:00Z';
const RANGE_END_EXCLUSIVE = '2027-01-01T00:00:00Z'; // 2026-12-31 inclusive

/**
 * Search queries per topic. Varied on purpose, so discovery is broad rather than
 * a fixed channel list. Interpreted across relevant creators and subjects.
 */
const TOPIC_QUERIES = {
  science: [
    'space documentary', 'black hole universe explained', 'astronomy cosmos',
    'physics experiment explained', 'chemistry reaction experiment',
    'biology human body evolution', 'nature wildlife documentary',
    'engineering megaproject how it works', 'artificial intelligence robotics',
    'science documentary full', 'inventions technology explained',
  ],
  entertainment: [
    'challenge competition win', 'game show contest', 'comedy sketch',
    'documentary true story', 'travel adventure expedition',
    'food challenge street food tour', 'behind the scenes',
    'pop culture explained', 'world record stunt', 'reality competition',
  ],
};

/** Terms that mark a video as science-leaning, checked against title+description. */
const SCIENCE_TERMS = [
  'science', 'scientist', 'physics', 'chemistry', 'biology', 'astronomy', 'space',
  'universe', 'cosmos', 'galaxy', 'black hole', 'quantum', 'nasa', 'telescope',
  'nature', 'wildlife', 'animal', 'species', 'ecosystem', 'evolution', 'dna',
  'engineering', 'engineer', 'technology', 'robot', 'robotics', 'artificial intelligence',
  ' ai ', 'experiment', 'documentary', 'invention', 'explained', 'research', 'discovery',
  'climate', 'geology', 'neuroscience', 'brain', 'planet', 'megaproject',
];

/** Terms that mark a video as entertainment-leaning. */
const ENTERTAINMENT_TERMS = [
  'challenge', 'competition', 'contest', 'game show', 'comedy', 'funny', 'prank',
  'reaction', 'sketch', 'story', 'storytelling', 'travel', 'adventure', 'expedition',
  'food', 'eating', 'street food', 'cooking', 'mukbang', 'behind the scenes',
  'world record', 'stunt', 'survive', 'survival', 'win', '$', 'vs', 'versus', 'record',
];

/** YouTube category ids that lean each way (used alongside the term lists). */
const SCIENCE_CATEGORIES = new Set(['28', '27', '15']); // Sci&Tech, Education, Pets&Animals
const ENTERTAINMENT_CATEGORIES = new Set(['24', '23', '17', '19', '20']); // Entertainment, Comedy, Sports, Travel, Gaming

function parseArgs(argv) {
  const args = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--require-key') args.requireKey = true;
    else if (flag === '--min-duration') args.minDuration = Number(argv[++i]);
    else if (flag === '--min-views') args.minViews = Number(argv[++i]);
    else if (flag === '--pages') args.pages = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!Number.isFinite(args.minDuration) || args.minDuration < 1) throw new Error('--min-duration must be a positive number');
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
 * Classify a video as science, entertainment, or neither, from its title,
 * description and category — never a single keyword or category alone. Returns
 * the stronger of the two topics, or null when nothing relevant is found.
 */
export function classifyTopic(item) {
  const haystack = ` ${(item.snippet?.title ?? '')} ${(item.snippet?.description ?? '')} `.toLowerCase();
  const categoryId = item.snippet?.categoryId;
  const count = (terms) => terms.reduce((n, t) => (haystack.includes(t) ? n + 1 : n), 0);

  const science = count(SCIENCE_TERMS) + (SCIENCE_CATEGORIES.has(categoryId) ? 2 : 0);
  const entertainment = count(ENTERTAINMENT_TERMS) + (ENTERTAINMENT_CATEGORIES.has(categoryId) ? 2 : 0);

  if (science === 0 && entertainment === 0) return null;
  return science >= entertainment ? 'science' : 'entertainment';
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
      videoDuration, // 'medium' (4–20m) or 'long' (>20m) — both cleared later by real duration
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
export function ineligibleReason(item, { minDuration, minViews, now }) {
  if ((item.snippet?.liveBroadcastContent ?? 'none') !== 'none') return 'live or upcoming';
  if (item.liveStreamingDetails && !item.liveStreamingDetails.actualEndTime) return 'active live stream';
  const durationSec = parseDuration(item.contentDetails?.duration);
  if (!Number.isFinite(durationSec)) return 'missing duration';
  if (durationSec < minDuration) return `under ${minDuration}s`;
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
        for (const videoDuration of ['medium', 'long']) {
          const ids = await searchIds({ q, ...window, videoDuration, pages: args.pages, key });
          for (const id of ids) candidateIds.add(id);
        }
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
    const reason = ineligibleReason(item, { minDuration: args.minDuration, minViews: args.minViews, now });
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
    scope: 'entertainment-science',
    topics: ['entertainment', 'science'],
    query: 'Popular long-form entertainment and science videos',
    format: 'long',
    minDurationSec: args.minDuration,
    minViews: args.minViews,
    windowStart: RANGE_START,
    windowEnd: new Date(endCap).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    fetchedAt: new Date(now).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    source: 'YouTube Data API v3 search.list (order=viewCount) across science and entertainment '
      + 'topics and publication years, verified with videos.list',
    coverage: 'partial',
    coverageNote:
      `${videos.length} verified videos: long-form (≥${Math.round(args.minDuration / 60)} min), `
      + `at least ${args.minViews.toLocaleString('en-US')} views, published 2021-01-01 through the `
      + 'collection date. YouTube search exposes no complete index, so this is the head of the '
      + 'distribution across entertainment and science — not a census of every qualifying video.',
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
