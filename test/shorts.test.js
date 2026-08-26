import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isShort, withinWindow, median, summarize, rankBy,
  byChannel, byDay, fillDays, breakouts, compact, buildReport,
} from '../src/shorts.js';

const WINDOW = { start: '2026-08-19T00:00:00Z', end: '2026-08-26T00:00:00Z' };

const sample = [
  { id: 'a', title: 'A', channel: 'One', channelId: 'c1', country: 'US', subs: 100000,
    publishedAt: '2026-08-19T10:00:00Z', durationSec: 15, views: 1000, likes: 100, comments: 10, vph: 50 },
  { id: 'b', title: 'B', channel: 'One', channelId: 'c1', country: 'US', subs: 120000,
    publishedAt: '2026-08-21T10:00:00Z', durationSec: 30, views: 3000, likes: 200, comments: 20, vph: 500 },
  { id: 'c', title: 'C', channel: 'Two', channelId: 'c2', country: 'DE', subs: 5000,
    publishedAt: '2026-08-21T23:59:59Z', durationSec: 60, views: 2000, likes: 50, comments: 5, vph: 120 },
];

test('isShort uses YouTube\'s three-minute cut-off', () => {
  assert.equal(isShort({ durationSec: 15 }), true);
  assert.equal(isShort({ durationSec: 180 }), true);
  assert.equal(isShort({ durationSec: 181 }), false);
  assert.equal(isShort({ durationSec: undefined }), false);
});

test('withinWindow includes the start instant and excludes the end', () => {
  const videos = [
    { publishedAt: '2026-08-19T00:00:00Z' },
    { publishedAt: '2026-08-26T00:00:00Z' },
    { publishedAt: '2026-08-18T23:59:59Z' },
    { publishedAt: '2026-08-22T12:00:00Z' },
  ];
  const kept = withinWindow(videos, WINDOW);
  assert.deepEqual(kept.map((v) => v.publishedAt), [
    '2026-08-19T00:00:00Z',
    '2026-08-22T12:00:00Z',
  ]);
});

test('withinWindow rejects an unparseable window', () => {
  assert.throws(() => withinWindow([], { start: 'nope', end: WINDOW.end }), RangeError);
});

test('median handles odd, even, and empty inputs', () => {
  assert.equal(median([5, 1, 3]), 3);
  assert.equal(median([4, 1, 3, 2]), 2.5);
  assert.equal(median([]), 0);
});

test('summarize totals the set and counts distinct channels', () => {
  const s = summarize(sample);
  assert.equal(s.videoCount, 3);
  assert.equal(s.channelCount, 2);
  assert.equal(s.views, 6000);
  assert.equal(s.likes, 350);
  assert.equal(s.comments, 35);
  assert.equal(s.medianViews, 2000);
  assert.equal(s.meanViews, 2000);
  assert.equal(s.peakVph, 500);
});

test('summarize weights engagement by views, not by video', () => {
  // 385 interactions over 6000 views = 6.42%, regardless of per-video rates.
  assert.equal(summarize(sample).engagementRate, 6.42);
  assert.equal(summarize([]).engagementRate, 0);
  assert.equal(summarize([]).videoCount, 0);
});

test('rankBy sorts descending and drops records missing the field', () => {
  assert.deepEqual(rankBy(sample, 'views', 2).map((v) => v.id), ['b', 'c']);
  assert.deepEqual(rankBy(sample, 'vph', 1).map((v) => v.id), ['b']);
  assert.equal(rankBy([{ id: 'x' }, ...sample], 'views').length, 3);
});

test('byChannel rolls up per channel and keeps the largest subscriber count', () => {
  const [first, second] = byChannel(sample);
  assert.equal(first.channel, 'One');
  assert.equal(first.videoCount, 2);
  assert.equal(first.views, 4000);
  assert.equal(first.subs, 120000, 'takes the max, not the first or last seen');
  assert.equal(second.channel, 'Two');
});

test('byDay buckets by UTC date and fillDays pads the gaps', () => {
  assert.deepEqual(byDay(sample), [
    { day: '2026-08-19', videoCount: 1, views: 1000 },
    { day: '2026-08-21', videoCount: 2, views: 5000 },
  ]);

  const filled = fillDays(byDay(sample), WINDOW);
  assert.equal(filled.length, 7, 'one entry per day of the window');
  assert.deepEqual(filled.map((d) => d.day), [
    '2026-08-19', '2026-08-20', '2026-08-21', '2026-08-22',
    '2026-08-23', '2026-08-24', '2026-08-25',
  ]);
  assert.deepEqual(filled[1], { day: '2026-08-20', videoCount: 0, views: 0 });
});

test('breakouts rank by views per subscriber and skip tiny channels', () => {
  const withMinnow = [...sample, {
    id: 'd', channel: 'Minnow', channelId: 'c3', subs: 300,
    publishedAt: '2026-08-20T00:00:00Z', durationSec: 10,
    views: 900000, likes: 1, comments: 1, vph: 10,
  }];
  const ranked = breakouts(withMinnow, { minSubs: 1000 });
  assert.ok(!ranked.some((v) => v.id === 'd'), '300-sub channel is excluded');
  assert.equal(ranked[0].id, 'c');
  assert.equal(ranked[0].viewsPerSub, 0.4);
});

test('compact abbreviates at each magnitude', () => {
  assert.equal(compact(43836834), '43.8M');
  assert.equal(compact(4500), '4.5K');
  assert.equal(compact(950), '950');
  assert.equal(compact(2.4e9), '2.4B');
  assert.equal(compact(Number.NaN), '—');
});

test('buildReport assembles a full report and reports what it dropped', () => {
  const snapshot = {
    topic: 'roblox', windowStart: WINDOW.start, windowEnd: WINDOW.end,
    fetchedAt: '2026-08-26T12:00:00Z', source: 'test',
    videos: [
      ...sample,
      { id: 'long', channel: 'Two', channelId: 'c2', subs: 5000,
        publishedAt: '2026-08-20T00:00:00Z', durationSec: 600, views: 1, likes: 0, comments: 0, vph: 1 },
      { id: 'old', channel: 'Two', channelId: 'c2', subs: 5000,
        publishedAt: '2026-08-01T00:00:00Z', durationSec: 15, views: 1, likes: 0, comments: 0, vph: 1 },
    ],
  };
  const report = buildReport(snapshot);
  assert.equal(report.totals.videoCount, 3, 'the long video and the old one are filtered out');
  assert.equal(report.excluded, 2);
  assert.equal(report.daily.length, 7);
  assert.equal(report.topByViews[0].id, 'b');
  assert.equal(report.coverage, 'partial', 'defaults to partial when unstated');
});

test('the committed snapshot is well-formed and inside its own window', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../data/roblox-shorts.json', import.meta.url)));
  const report = buildReport(snapshot);

  assert.equal(report.excluded, 0, 'every record is a Short published inside the window');
  assert.ok(report.totals.videoCount > 0);
  assert.equal(new Set(snapshot.videos.map((v) => v.id)).size, snapshot.videos.length, 'no duplicate ids');

  for (const v of snapshot.videos) {
    assert.ok(v.id && v.title && v.channelId, `record ${v.id} has identity fields`);
    assert.ok(Number.isFinite(v.views) && v.views >= 0, `record ${v.id} has a view count`);
  }
});
