#!/usr/bin/env node
/**
 * Seed data/videos.json from a hand-verified set of real niche videos.
 *
 * The production path is scripts/fetch-videos.js (YouTube Data API v3). That
 * needs YOUTUBE_API_KEY and is what the deploy workflow runs. This script exists
 * for the case where the key is not available locally: it writes the same
 * snapshot shape from a curated list of REAL videos collected via vidIQ
 * (channel + video lookups) on 2026-10-23, so the dashboard can show the actual
 * niche instead of a stale one.
 *
 * Every row below is a real, verified upload — id, title, publish date, runtime,
 * views, likes and comments are copied from the live API, not invented. The
 * derived fields (durationSec, engagementRate, vph) are computed here exactly as
 * toRecord() computes them in fetch-videos.js, so the two producers agree.
 *
 * Usage: node scripts/seed-snapshot.js
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { parseDuration } from './fetch-videos.js';

const FETCHED_AT = '2026-10-23T00:00:00Z';
const WINDOW_START = '2026-06-01T00:00:00Z';
const MIN_VIEWS = 50_000;
const MAX_DURATION_SEC = 4 * 60 * 60; // 4 hours — these "full movies" run 10 min to ~3.5 hr

/** Channel metadata: subscriber counts and country, from vidIQ on 2026-10-23. */
const CHANNELS = {
  'UCbw9c3sH6tWOGYu_suuhmjQ': { channel: 'FablePop', subs: 51600, country: 'DE' },
  'UC5BrEbDWjAHRUdZ182CQRqg': { channel: 'Fate Comes Back', subs: 9160, country: 'US' },
  'UCV791S60neFPQk6_igVkM5Q': { channel: 'Next Episode Drama', subs: 98900, country: 'US' },
  'UC6gHoXVdH-kbAMQc-JH8cTg': { channel: 'Hush Drama', subs: 13000, country: 'US' },
  'UCQBaCudo1jvKyEJwILrRdHg': { channel: 'EverAfter Drama', subs: 22400, country: 'US' },
};

/**
 * Curated real uploads. [id, channelId, topic, publishedAt, durationISO, views, likes, comments, title]
 * topic is 'romance' (billionaire/CEO/Cinderella) or 'betrayal' (revenge/family-secret).
 */
const RAW = [
  // FablePop (UCbw9c3sH6tWOGYu_suuhmjQ)
  ['zViG3A8YHZo', 'UCbw9c3sH6tWOGYu_suuhmjQ', 'betrayal', '2026-10-02T16:00:08Z', 'PT40M12S', 3112440, 60036, 1765, 'My New Family Completely Changed Me… But They Hid a Huge Secret | Full Movie'],
  ['z4ODg1sVcNg', 'UCbw9c3sH6tWOGYu_suuhmjQ', 'betrayal', '2026-09-19T16:00:02Z', 'PT25M25S', 669154, 11412, 285, 'My Husband Cheated Because He Thought I Was Poor! But I Was the Richest Woman in the City! Full Movie'],
  ['bHCI5XUSppM', 'UCbw9c3sH6tWOGYu_suuhmjQ', 'romance', '2026-10-18T16:27:18Z', 'PT41M28S', 364515, 11698, 656, '150 years ago, people destroyed me because I was smart. Then I was reborn in the modern world!'],
  ['30U4KVRKCtQ', 'UCbw9c3sH6tWOGYu_suuhmjQ', 'betrayal', '2026-10-10T16:00:23Z', 'PT32M32S', 318844, 5519, 239, 'My Bad Sister Stole My Husband and my money, But… | Full Movie | English Movie'],
  ['wWGWu1NtGhk', 'UCbw9c3sH6tWOGYu_suuhmjQ', 'romance', '2026-09-07T16:00:32Z', 'PT11M43S', 105384, 1941, 63, 'The Maid Who Saved the President — Full Movie | They treated her like nothing, but…'],
  ['54HtBsSUCwk', 'UCbw9c3sH6tWOGYu_suuhmjQ', 'romance', '2026-09-03T16:00:28Z', 'PT9M44S', 54794, 1430, 60, 'I Fell in Love with a Frog… But He Was a Missing Prince! | Full Movie'],

  // Fate Comes Back (UC5BrEbDWjAHRUdZ182CQRqg)
  ['uAj08_jcW7s', 'UC5BrEbDWjAHRUdZ182CQRqg', 'romance', '2026-09-17T17:00:09Z', 'PT45M1S', 513337, 6093, 178, 'Billionaire Chooses Poor Maid Over 10 Rich Heiresses! | FULL STORY'],
  ['3WtIwpwb7Uw', 'UC5BrEbDWjAHRUdZ182CQRqg', 'romance', '2026-10-03T15:30:08Z', 'PT42M50S', 256473, 2888, 154, 'Village Girl Refused a Billionaire’s Money—Then He Fell in Love With Her | Full Movie'],
  ['N5qdrr8pXf8', 'UC5BrEbDWjAHRUdZ182CQRqg', 'betrayal', '2026-09-20T15:47:50Z', 'PT1H22M59S', 251890, 3459, 219, 'Her Groom Betrayed Her With Her Cousin—So She Walked Away and Took Back Her Empire | Full Movie'],
  ['fG70MaeK6KU', 'UC5BrEbDWjAHRUdZ182CQRqg', 'betrayal', '2026-10-17T14:00:18Z', 'PT1H20M', 117224, 873, 32, 'He Betrayed His Billionaire Girlfriend When He Thought She Had Lost Everything | Full Movie'],
  ['ECOaNXSBvqk', 'UC5BrEbDWjAHRUdZ182CQRqg', 'romance', '2026-10-06T15:00:07Z', 'PT40M16S', 88066, 1302, 47, 'THE VILLAGE BUTCHER GIRL Rescued a Man From the GARBAGE—He Was a MISSING BILLIONAIRE | Full Movie'],
  ['cT0ISfbW4qc', 'UC5BrEbDWjAHRUdZ182CQRqg', 'betrayal', '2026-09-26T17:44:13Z', 'PT46M57S', 86149, 1117, 91, 'She Paid $10 Million to Steal My Husband—Then Learned I Owned Everything | Full Movie'],

  // Next Episode Drama (UCV791S60neFPQk6_igVkM5Q)
  ['0S5q2HlzIUE', 'UCV791S60neFPQk6_igVkM5Q', 'romance', '2026-07-25T18:00:06Z', 'PT1H6M28S', 5344280, 54603, 1350, '【FULL】Secret Baby: My Cold Boss is the Father!'],
  ['3Swd_Z6WaN4', 'UCV791S60neFPQk6_igVkM5Q', 'betrayal', '2026-10-15T15:00:05Z', 'PT1H12M4S', 1462544, 11580, 253, '【FULL】Betrayed by Ex, I Married a Mafia Boss'],
  ['nNfGZmPI9ek', 'UCV791S60neFPQk6_igVkM5Q', 'romance', '2026-10-03T15:00:02Z', 'PT1H18M23S', 385157, 3681, 99, '【FULL】Amnesia! I Woke Up Married to My Billionaire Nemesis'],
  ['E9VgVvPMllg', 'UCV791S60neFPQk6_igVkM5Q', 'betrayal', '2026-08-05T15:00:16Z', 'PT1H26M51S', 365276, 3529, 180, '【FULL】Betrayed on Christmas, The Mafia Godfather Returns!'],
  ['nUHMvgoXX5E', 'UCV791S60neFPQk6_igVkM5Q', 'romance', '2026-08-14T22:00:21Z', 'PT1H6M24S', 308203, 3911, 199, '【FULL】Accidental Kiss! My Hockey Rival Became My Roommate'],
  ['_-G2iII36Tw', 'UCV791S60neFPQk6_igVkM5Q', 'romance', '2026-09-09T15:00:34Z', 'PT1H7M4S', 217806, 1746, 56, '【FULL】I Stopped Chasing Him, Then the Genius Transfer Student Claimed Me'],
  ['Gvxpj7zzZAI', 'UCV791S60neFPQk6_igVkM5Q', 'betrayal', '2026-09-22T22:00:39Z', 'PT1H17M27S', 206817, 1732, 50, '【FULL】Poisoned at the Altar: His Ex-Bodyguard Will Do Anything to Steal Him Back'],
  ['ds6VjS1N724', 'UCV791S60neFPQk6_igVkM5Q', 'romance', '2026-10-18T02:00:15Z', 'PT1H29M', 205940, 2870, 122, '【FULL】He spent years searching for his lost bride... only to find their son attacking her.'],
  ['BNC1Nhoe8S8', 'UCV791S60neFPQk6_igVkM5Q', 'betrayal', '2026-10-10T15:00:24Z', 'PT1H30M30S', 82777, 1837, 62, '【FULL】My Ex Dumped Me, So I Seduced Her Billionaire Boss!'],

  // Hush Drama (UC6gHoXVdH-kbAMQc-JH8cTg)
  ['M3nVS4uNyGM', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'romance', '2026-09-27T12:00:10Z', 'PT2H4M55S', 653328, 7795, 202, 'She Escaped Her Captors—And Ran Straight Into the Mine’s Most Dangerous Man | Full | Eng Dub'],
  ['8rXOXpBB0CU', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'betrayal', '2026-08-12T02:00:29Z', 'PT2H55M21S', 568621, 6526, 187, 'Ex Left Her After She Went Deaf. Then She Married the Heir Who Loved Her for 7 Years | Full | Eng Dub'],
  ['mU9XkJBmCMk', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'romance', '2026-09-25T07:00:38Z', 'PT2H11M48S', 531198, 2614, 58, 'She Secretly Loved Him for 8 Years—Then He Asked Her to Marry Him | Full | Eng Dub'],
  ['1eTGuNFxQQ0', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'romance', '2026-08-30T16:00:05Z', 'PT2H13M23S', 471051, 5014, 239, 'They Divorced After a Year of Marriage—Then He Finally Fell in Love With His Ex-Wife | Full | Eng Dub'],
  ['ssRDRhsw26k', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'romance', '2026-09-05T12:26:04Z', 'PT1H33M4S', 351421, 3834, 125, 'A 6-Year-Old Girl Became a CEO’s Bodyguard—Then Found Out He Was Her Dad | Full | Eng Dub'],
  ['is34nvMk9TM', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'betrayal', '2026-08-24T16:00:32Z', 'PT1H59M55S', 323538, 3912, 186, 'Her Ex Tried to Ruin Her Life—Her Secret CEO Husband Made Him Pay | Full | Eng Dub'],
  ['BVd8cyNv8ps', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'romance', '2026-10-02T01:30:37Z', 'PT2H7M22S', 296602, 1685, 72, 'She Asked for a Divorce—Then Her Husband Learned She Was the Star He’d Been Chasing | Full | Eng Dub'],
  ['InBJyE5zyIA', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'betrayal', '2026-10-01T12:25:36Z', 'PT1H59M57S', 292170, 2337, 127, 'She Married the Youngest Brother—But Her Baby Was the Eldest Brother’s | Full | Eng Dub'],
  ['K4oITS5wxP8', 'UC6gHoXVdH-kbAMQc-JH8cTg', 'romance', '2026-10-15T12:41:38Z', 'PT1H52M39S', 286212, 2972, 64, 'She Could Hear Babies’ Thoughts—Then Her Own Baby Revealed Its Billionaire Dad | Full | Eng Dub'],

  // EverAfter Drama (UCQBaCudo1jvKyEJwILrRdHg)
  ['RQHWiLUrtg4', 'UCQBaCudo1jvKyEJwILrRdHg', 'romance', '2026-07-17T00:12:26Z', 'PT3H24M57S', 1005459, 17369, 955, 'I Spent Four Years Hating My Husband… Then I Learned the Truth'],
  ['B_NWM6qqvtk', 'UCQBaCudo1jvKyEJwILrRdHg', 'romance', '2026-09-06T23:12:30Z', 'PT3H4M3S', 758891, 7864, 443, 'Everyone Feared Him, But She Found The Gentle Heart Behind His Mask'],
  ['R3-PP4qB3uo', 'UCQBaCudo1jvKyEJwILrRdHg', 'romance', '2026-09-09T23:12:02Z', 'PT2H20M31S', 474311, 4674, 215, 'The CEO Who Never Stopped For Anyone, Finally Stopped For Her'],
  ['0bVfXPfBuSE', 'UCQBaCudo1jvKyEJwILrRdHg', 'romance', '2026-09-21T23:12:34Z', 'PT2H5M53S', 406692, 4971, 262, 'They Married Without Love, Until Sharing A Home Changed Everything'],
  ['m4a2xCtJXPs', 'UCQBaCudo1jvKyEJwILrRdHg', 'betrayal', '2026-09-18T23:12:15Z', 'PT3H30M50S', 313046, 3408, 185, 'Two Strangers Were Betrayed By Their Spouses, Then They Fell For Each Other'],
  ['gQUqKjfAinA', 'UCQBaCudo1jvKyEJwILrRdHg', 'romance', '2026-09-27T23:12:14Z', 'PT3H30M28S', 303792, 3159, 130, 'She Needed A New Start, He Needed A Wife, So They Made A Deal'],
  ['Ucf8DJWFwgs', 'UCQBaCudo1jvKyEJwILrRdHg', 'romance', '2026-09-23T23:12:35Z', 'PT2H3M51S', 302017, 2721, 151, 'She Married A Stranger, But He Had Been Searching For Her All Along'],
  ['w8-DTIQ5obQ', 'UCQBaCudo1jvKyEJwILrRdHg', 'betrayal', '2026-07-01T00:13:03Z', 'PT3H9M30S', 100424, 1652, 51, 'My Fiancé Betrayed Me… So I Married a Stranger'],
  ['QcEWaF2cTzg', 'UCQBaCudo1jvKyEJwILrRdHg', 'betrayal', '2026-09-14T23:12:22Z', 'PT2H49M42S', 76006, 1040, 57, 'The Real Heiress Returned For Revenge, But The CEO Fell For Her'],
];

const now = Date.parse(FETCHED_AT);

const videos = RAW.map(([id, channelId, topic, publishedAt, durationISO, views, likes, comments, title]) => {
  const meta = CHANNELS[channelId];
  if (!meta) throw new Error(`Unknown channel ${channelId} for video ${id}`);
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
  scope: 'ai-drama',
  topics: ['romance', 'betrayal'],
  query: 'Faceless AI full-movie drama — billionaire romance & betrayal/revenge',
  format: 'long',
  maxDurationSec: MAX_DURATION_SEC,
  minViews: MIN_VIEWS,
  windowStart: WINDOW_START,
  windowEnd: FETCHED_AT,
  fetchedAt: FETCHED_AT,
  source: 'vidIQ channel + video lookups (verified counts), 2026-10-23. Production refreshes '
    + 'run scripts/fetch-videos.js against the YouTube Data API v3.',
  coverage: 'partial',
  coverageNote:
    `${videos.length} verified faceless AI "full movie" drama uploads across `
    + `${new Set(videos.map((v) => v.channelId)).size} fast-growing channels (FablePop, Fate Comes Back, `
    + 'Next Episode Drama, Hush Drama, EverAfter Drama), each with at least '
    + `${MIN_VIEWS.toLocaleString('en-US')} verified views, published mid-2026. This niche is brand new, `
    + 'so coverage is a curated head of the billionaire-romance and betrayal/revenge distribution — not a '
    + 'census of every qualifying movie.',
  videos,
};

const out = resolve(process.cwd(), 'data', 'videos.json');
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`Wrote ${videos.length} videos (${new Set(videos.map((v) => v.channelId)).size} channels) to ${out}`);
