#!/usr/bin/env node
/**
 * Seed data/shorts.json — the short-form (YouTube Shorts) side of the niche.
 *
 * The full-movie channels barely post Shorts; the Shorts half of this niche
 * lives on dedicated vertical micro-drama channels that post teaser clips and
 * standalone <3-minute dramas (billionaire-romance reveals, "my sister stole my
 * husband" betrayals, CEO reveals, revenge beats). This script writes a
 * short-form snapshot from a curated list of REAL viral Shorts discovered via
 * vidIQ outliers on 2026-10-23.
 *
 * Shape matches scripts/seed-snapshot.js, but with short-form thresholds, so the
 * same buildReport() powers the dedicated Shorts page. Every row is a real,
 * verified upload; derived fields are computed like toRecord() in fetch-videos.js.
 *
 * Usage: node scripts/seed-shorts.js
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { parseDuration } from './fetch-videos.js';

const FETCHED_AT = '2026-10-23T00:00:00Z';
const WINDOW_START = '2026-09-01T00:00:00Z';
const MIN_VIEWS = 100_000;
const MAX_DURATION_SEC = 4 * 60; // YouTube Shorts ceiling, with headroom for 3-minute clips

/** Channel metadata: subscriber counts and country, from vidIQ on 2026-10-23. */
const CHANNELS = {
  'UCTp4wacvvdCnLnqcPpljf0Q': { channel: 'Velmora', subs: 4200, country: 'US' },
  'UC0S57eizOfe7CwW8vC6ODWg': { channel: 'Szabina Edmund', subs: 29400, country: 'US' },
  'UCcUSHBZ7sE2LAOpytsuqjmg': { channel: 'Ariafjjt908', subs: 12300, country: 'US' },
  'UCvcxzIV-Ry9uSrM63VPqDvg': { channel: 'Sorrowful Drama', subs: 24300, country: 'US' },
  'UCz7HZgjtReyinCSKpbWa0iA': { channel: 'Ai Flim Studio', subs: 11400, country: null },
  'UCb2bS9PwjUwf-uT9lQTlvuA': { channel: 'StoryVerse', subs: 1300, country: null },
  'UCXC1qZ5VWnJ9eQebuZZHHTA': { channel: 'Dorna Zahra', subs: 9400, country: 'US' },
  'UCj1D8-PhS_NxfkiCf82l1Ng': { channel: 'Heba Noor', subs: 4900, country: 'US' },
  'UCOF5Lia90WyPqUtTj0FRyDA': { channel: 'Noble Hearts', subs: 20900, country: 'US' },
  'UCF0WEtO0Y4y_xU2-Yqct7tg': { channel: 'DramaZen', subs: 11900, country: 'US' },
  'UCECsBiJ7ZupOe5W5obSZ5Zg': { channel: 'shortsAihub', subs: 56100, country: null },
  'UCaNYDZRv7jleJuxErZFFnWA': { channel: 'MistRain Studio', subs: 3000, country: null },
  'UCX6ExULVSZ8VPPXwFnwTZCg': { channel: 'Dumloong', subs: 78800, country: 'AR' },
  'UCq96UM2lDLe3HLw2eUsxrZg': { channel: 'EverTale Animation', subs: 5200, country: null },
};

/**
 * Curated real Shorts. [id, channelId, topic, publishedAt, durationISO, views, likes, comments, title]
 * topic is 'romance' (billionaire/CEO/hidden-wealth) or 'betrayal' (revenge/sister/family).
 */
const RAW = [
  ['xdog6P2Ncyc', 'UCb2bS9PwjUwf-uT9lQTlvuA', 'romance', '2026-10-10T17:01:43Z', 'PT31S', 760375, 7927, 182, 'One Wedding Moment Changed Everything!'],
  ['hj9_hXc_agI', 'UCOF5Lia90WyPqUtTj0FRyDA', 'romance', '2026-10-08T22:00:26Z', 'PT3M', 805340, 15650, 299, 'Billionaire Refused Handshake — She Withdrew $2B Investment'],
  ['9eVbUPUAGWo', 'UCF0WEtO0Y4y_xU2-Yqct7tg', 'betrayal', '2026-10-08T09:32:30Z', 'PT50S', 457053, 9775, 62, 'Revenge For My Lost Light — a surgeon avenges his murdered love'],
  ['SRVfUeSDDno', 'UC0S57eizOfe7CwW8vC6ODWg', 'betrayal', '2026-09-24T10:55:22Z', 'PT2M43S', 421452, 10688, 149, 'They Left Her Alone on Her Birthday, So She Walked Away Forever!'],
  ['O-Qc7_VlmeA', 'UCq96UM2lDLe3HLw2eUsxrZg', 'betrayal', '2026-10-03T15:33:07Z', 'PT2M57S', 406155, 6975, 114, 'The World’s Best Chef Hated My Mother and Wanted Revenge (Part 2)'],
  ['tJYPKIhKj8A', 'UCz7HZgjtReyinCSKpbWa0iA', 'betrayal', '2026-10-10T12:54:02Z', 'PT31S', 375541, 4053, 50, '“You Are No Longer Part of This Family. Walk Away.”'],
  ['fMdub3_OAg8', 'UCcUSHBZ7sE2LAOpytsuqjmg', 'romance', '2026-10-05T11:51:42Z', 'PT2M50S', 344342, 3739, 47, 'She Thought He Had a Wife and Child—18 Years Later, She Learned the Truth'],
  ['E8YSCuTsNxU', 'UCaNYDZRv7jleJuxErZFFnWA', 'betrayal', '2026-10-06T23:15:16Z', 'PT2M56S', 248920, 7263, 104, 'He Gave My Grand Prize to His New Favorite'],
  ['5bWczb7afEA', 'UCECsBiJ7ZupOe5W5obSZ5Zg', 'romance', '2026-10-16T10:30:29Z', 'PT1M46S', 182304, 4827, 5, 'During Dinner, the CEO Noticed the Girl Beside Him…'],
  ['r8S2cv0ZTho', 'UCj1D8-PhS_NxfkiCf82l1Ng', 'betrayal', '2026-10-08T04:24:51Z', 'PT31S', 177485, 2787, 50, '“Cancel the Honeymoon — Did You Forge My Signature on the Deeds?”'],
  ['Vxc1kSzkrzo', 'UCTp4wacvvdCnLnqcPpljf0Q', 'betrayal', '2026-09-27T06:00:20Z', 'PT31S', 175360, 3529, 93, 'He Married Her for Her Money… But She Knew His Plan All Along'],
  ['sZ4Yb0O-S_w', 'UCX6ExULVSZ8VPPXwFnwTZCg', 'romance', '2026-09-29T09:17:57Z', 'PT2M59S', 150896, 2335, 9, 'He Thought His Wife Was Poor… Until She Became His Boss'],
  ['irIoqR0vH4M', 'UCvcxzIV-Ry9uSrM63VPqDvg', 'betrayal', '2026-09-25T05:26:15Z', 'PT2M29S', 129516, 3214, 15, 'My Sister Framed Me With a Video, So I Took Her Spot at the Altar'],
  ['MqVYK0q92VI', 'UCXC1qZ5VWnJ9eQebuZZHHTA', 'betrayal', '2026-10-14T10:31:58Z', 'PT2M43S', 114909, 3016, 22, 'My Boyfriend Proposed to My Sister Behind My Back!'],
];

const now = Date.parse(FETCHED_AT);

const videos = RAW.map(([id, channelId, topic, publishedAt, durationISO, views, likes, comments, title]) => {
  const meta = CHANNELS[channelId];
  if (!meta) throw new Error(`Unknown channel ${channelId} for short ${id}`);
  const hoursLive = Math.max(1, (now - Date.parse(publishedAt)) / 3.6e6);
  return {
    id,
    title,
    topic,
    lang: 'en',
    channel: meta.channel,
    channelId,
    country: meta.country,
    subs: meta.subs,
    publishedAt,
    durationSec: parseDuration(durationISO),
    views,
    likes,
    comments,
    engagementRate: views ? Math.round(((likes + comments) / views) * 1000) / 1000 : 0,
    vph: Math.round((views / hoursLive) * 100) / 100,
  };
}).sort((a, b) => b.views - a.views);

const snapshot = {
  scope: 'ai-drama-shorts',
  topics: ['romance', 'betrayal'],
  query: 'Faceless AI billionaire-romance & betrayal short drama — YouTube Shorts',
  format: 'short',
  maxDurationSec: MAX_DURATION_SEC,
  minViews: MIN_VIEWS,
  windowStart: WINDOW_START,
  windowEnd: FETCHED_AT,
  fetchedAt: FETCHED_AT,
  source: 'vidIQ outlier discovery (verified counts), 2026-10-23. Viral Shorts in the '
    + 'billionaire-romance and betrayal/revenge micro-drama niche.',
  coverage: 'partial',
  coverageNote:
    `${videos.length} verified viral YouTube Shorts (vertical micro-drama, ≤3 min) in the `
    + `billionaire-romance and betrayal/revenge niche, each with at least `
    + `${MIN_VIEWS.toLocaleString('en-US')} views and an outsized view-to-subscriber ratio. These are `
    + 'the teaser clips and standalone shorts that feed discovery toward the long-form full movies — a '
    + 'curated breakout set, not a census of every qualifying Short.',
  videos,
};

const out = resolve(process.cwd(), 'data', 'shorts.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${videos.length} Shorts (${new Set(videos.map((v) => v.channelId)).size} channels) to ${out}`);
