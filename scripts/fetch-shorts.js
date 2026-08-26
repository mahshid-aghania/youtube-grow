#!/usr/bin/env node
/**
 * Refresh data/<topic>-shorts.json from the YouTube Data API v3.
 *
 * Usage:
 *   YOUTUBE_API_KEY=... node scripts/fetch-shorts.js [--topic roblox] [--days 7] [--pages 4]
 *
 * Without YOUTUBE_API_KEY the script exits 0 without touching anything, so the
 * deploy still succeeds against the committed snapshot. Pass --require-key to
 * make a missing key a hard failure instead.
 *
 * Quota: each search page costs 100 units and covers 50 videos; the videos and
 * channels lookups cost 1 unit each. The default 4 pages is ~400 units against
 * a standard 10,000/day allowance.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const API = 'https://www.googleapis.com/youtube/v3';
const MAX_SHORT_SECONDS = 180;

function parseArgs(argv) {
  const args = { topic: 'roblox', days: 7, pages: 4, requireKey: false };
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--require-key') args.requireKey = true;
    else if (flag === '--topic') args.topic = argv[++i];
    else if (flag === '--days') args.days = Number(argv[++i]);
    else if (flag === '--pages') args.pages = Number(argv[++i]);
    else throw new Error(`Unknown argument: ${flag}`);
  }
  if (!args.topic) throw new Error('--topic must not be empty');
  if (!Number.isInteger(args.days) || args.days < 1) throw new Error('--days must be a positive integer');
  if (!Number.isInteger(args.pages) || args.pages < 1) throw new Error('--pages must be a positive integer');
  return args;
}

/** ISO 8601 duration (PT1M30S) -> seconds. */
export function parseDuration(iso) {
  const m = /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(iso ?? '');
  if (!m) return Number.NaN;
  const [, d, h, min, s] = m;
  return (Number(d ?? 0) * 86400) + (Number(h ?? 0) * 3600) + (Number(min ?? 0) * 60) + Number(s ?? 0);
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

/** Fetch up to `pages` x 50 candidate video ids for the topic and window. */
async function searchVideoIds({ topic, publishedAfter, publishedBefore, pages, key }) {
  const ids = [];
  let pageToken;
  for (let page = 0; page < pages; page += 1) {
    const data = await get('search', {
      part: 'id',
      q: topic,
      type: 'video',
      videoDuration: 'short',
      order: 'viewCount',
      publishedAfter,
      publishedBefore,
      maxResults: '50',
      ...(pageToken ? { pageToken } : {}),
    }, key);

    for (const item of data.items ?? []) {
      if (item.id?.videoId) ids.push(item.id.videoId);
    }
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return [...new Set(ids)];
}

const chunk = (arr, size) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size));

async function hydrate(ids, key) {
  const videos = [];
  for (const batch of chunk(ids, 50)) {
    const data = await get('videos', {
      part: 'snippet,contentDetails,statistics',
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
    const data = await get('channels', {
      part: 'statistics',
      id: batch.join(','),
      maxResults: '50',
    }, key);
    for (const c of data.items ?? []) {
      subs.set(c.id, Number(c.statistics?.subscriberCount ?? 0));
    }
  }
  return subs;
}

/** Shape an API item into the record src/shorts.js expects. */
export function toRecord(item, subs, now) {
  const views = Number(item.statistics?.viewCount ?? 0);
  const likes = Number(item.statistics?.likeCount ?? 0);
  const comments = Number(item.statistics?.commentCount ?? 0);
  const publishedAt = item.snippet.publishedAt;
  const hoursLive = Math.max(1, (now - new Date(publishedAt).getTime()) / 3.6e6);

  return {
    id: item.id,
    title: item.snippet.title,
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
  const end = new Date(now);
  const start = new Date(now - args.days * 86400000);

  console.log(`Searching "${args.topic}" Shorts from ${start.toISOString()} to ${end.toISOString()}`);
  const ids = await searchVideoIds({
    topic: args.topic,
    publishedAfter: start.toISOString(),
    publishedBefore: end.toISOString(),
    pages: args.pages,
    key,
  });
  console.log(`  ${ids.length} candidate videos`);

  const items = await hydrate(ids, key);
  const subs = await channelSubs(items.map((i) => i.snippet.channelId), key);

  const videos = items
    .map((item) => toRecord(item, subs, now))
    .filter((v) => Number.isFinite(v.durationSec) && v.durationSec <= MAX_SHORT_SECONDS)
    .sort((a, b) => b.views - a.views);

  const dropped = items.length - videos.length;
  if (dropped > 0) console.log(`  dropped ${dropped} over ${MAX_SHORT_SECONDS}s`);

  const snapshot = {
    topic: args.topic,
    query: args.topic,
    format: 'short',
    windowDays: args.days,
    windowStart: start.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    windowEnd: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    fetchedAt: end.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    source: `YouTube Data API v3 search.list (order=viewCount, ${args.pages} page(s))`,
    coverage: 'partial',
    coverageNote:
      `Top ${args.pages * 50} results by view count for "${args.topic}". ` +
      'YouTube search does not expose a complete index, so this is the head of ' +
      'the distribution, not a census of every Short published in the window.',
    videos,
  };

  const out = resolve(process.cwd(), 'data', `${args.topic}-shorts.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${videos.length} Shorts to ${out}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
