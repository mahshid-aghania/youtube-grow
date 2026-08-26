import test from 'node:test';
import assert from 'node:assert/strict';

import { parseDuration, toRecord } from '../scripts/fetch-shorts.js';

test('parseDuration converts ISO 8601 durations to seconds', () => {
  assert.equal(parseDuration('PT15S'), 15);
  assert.equal(parseDuration('PT1M30S'), 90);
  assert.equal(parseDuration('PT3M'), 180);
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('P1DT2H'), 93600);
});

test('parseDuration returns NaN for junk rather than a wrong number', () => {
  assert.ok(Number.isNaN(parseDuration('nope')));
  assert.ok(Number.isNaN(parseDuration('')));
  assert.ok(Number.isNaN(parseDuration(undefined)));
});

const item = {
  id: 'abc123',
  snippet: {
    title: 'A Roblox Short',
    channelTitle: 'Some Channel',
    channelId: 'UC123',
    publishedAt: '2026-08-20T12:00:00.000Z',
    defaultAudioLanguage: 'en-US',
  },
  contentDetails: { duration: 'PT45S' },
  statistics: { viewCount: '240000', likeCount: '11000', commentCount: '1000' },
};

test('toRecord maps an API item onto the analysis shape', () => {
  // 24h after publish, so views-per-hour is exactly views / 24.
  const now = Date.parse('2026-08-21T12:00:00Z');
  const r = toRecord(item, new Map([['UC123', 500000]]), now);

  assert.equal(r.id, 'abc123');
  assert.equal(r.durationSec, 45);
  assert.equal(r.views, 240000, 'string counts become numbers');
  assert.equal(r.subs, 500000);
  assert.equal(r.lang, 'en', 'locale is trimmed to a language code');
  assert.equal(r.publishedAt, '2026-08-20T12:00:00Z');
  assert.equal(r.vph, 10000);
  assert.equal(r.engagementRate, 0.05);
});

test('toRecord survives missing statistics and an unknown channel', () => {
  const bare = { ...item, statistics: {}, snippet: { ...item.snippet, defaultAudioLanguage: undefined } };
  const r = toRecord(bare, new Map(), Date.parse('2026-08-21T12:00:00Z'));

  assert.equal(r.views, 0);
  assert.equal(r.likes, 0);
  assert.equal(r.engagementRate, 0, 'no divide-by-zero on a video with no views');
  assert.equal(r.subs, 0);
  assert.equal(r.lang, null);
});

test('toRecord never divides by less than an hour', () => {
  // Published "in the future" relative to now — the floor keeps vph finite.
  const r = toRecord(item, new Map(), Date.parse('2026-08-20T12:00:00Z'));
  assert.ok(Number.isFinite(r.vph));
  assert.equal(r.vph, 240000);
});
