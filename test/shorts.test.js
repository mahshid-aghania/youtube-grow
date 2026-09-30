import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isEligible, isShortForm, withinWindow, reportWindow, median, summarize, rankBy,
  byChannel, byDay, byYear, fillDays, breakouts, topicBreakdown, compact, buildReport,
  MAX_SHORTFORM_SECONDS, MIN_VIEWS, VIEW_THRESHOLDS, DURATION_THRESHOLDS,
} from '../src/shorts.js';

const WINDOW = { start: '2021-01-01T00:00:00Z', end: '2026-09-09T00:00:00Z' };

/** Three eligible short-form videos, plus fields the rollups read. */
const sample = [
  { id: 'a', title: 'A', topic: 'lessons', channel: 'One', channelId: 'c1', country: 'US', subs: 100000,
    publishedAt: '2021-08-19T10:00:00Z', durationSec: 60, views: 1_000_000, likes: 100000, comments: 10000, vph: 50 },
  { id: 'b', title: 'B', topic: 'inspiring', channel: 'One', channelId: 'c1', country: 'US', subs: 120000,
    publishedAt: '2023-08-21T10:00:00Z', durationSec: 120, views: 3_000_000, likes: 200000, comments: 20000, vph: 500 },
  { id: 'c', title: 'C', topic: 'lessons', channel: 'Two', channelId: 'c2', country: 'DE', subs: 5000,
    publishedAt: '2025-08-21T23:59:59Z', durationSec: 180, views: 2_000_000, likes: 50000, comments: 5000, vph: 120 },
];

test('isShortForm applies the three-minute ceiling', () => {
  assert.equal(isShortForm({ durationSec: 180 }), true);
  assert.equal(isShortForm({ durationSec: 181 }), false);
  assert.equal(isShortForm({ durationSec: 0 }), false, 'zero duration fails closed');
  assert.equal(isShortForm({ durationSec: undefined }), false);
  assert.equal(isShortForm({ durationSec: 90 }, 60), false, 'a tighter ceiling is respected');
});

test('isEligible requires both the duration ceiling and the million-view floor', () => {
  assert.equal(isEligible({ durationSec: 60, views: 2_000_000 }), true);
  assert.equal(isEligible({ durationSec: 600, views: 2_000_000 }), false, 'too long');
  assert.equal(isEligible({ durationSec: 60, views: 900_000 }), false, 'too few views');
  assert.equal(isEligible({ durationSec: 60 }), false, 'missing view count fails closed');
  assert.equal(isEligible({ views: 2_000_000 }), false, 'missing duration fails closed');
  assert.equal(MAX_SHORTFORM_SECONDS, 180);
  assert.equal(MIN_VIEWS, 1_000_000);
});

test('isEligible honours tightened thresholds from the filter controls', () => {
  const v = { durationSec: 90, views: 2_000_000 };
  assert.equal(isEligible(v, { minViews: 5_000_000 }), false);
  assert.equal(isEligible(v, { maxDurationSec: 60 }), false);
  assert.equal(isEligible(v, { minViews: 1_000_000, maxDurationSec: 120 }), true);
});

test('the offered thresholds match the brief', () => {
  assert.deepEqual(VIEW_THRESHOLDS.map((t) => t.value), [1e6, 5e6, 1e7, 2.5e7, 5e7]);
  assert.equal(DURATION_THRESHOLDS[0].value, 180, 'default ceiling is three minutes');
});

test('withinWindow includes the start instant and excludes the end', () => {
  const videos = [
    { publishedAt: '2021-01-01T00:00:00Z' },
    { publishedAt: '2026-09-09T00:00:00Z' },
    { publishedAt: '2020-12-31T23:59:59Z' },
    { publishedAt: '2023-06-01T12:00:00Z' },
  ];
  const kept = withinWindow(videos, WINDOW);
  assert.deepEqual(kept.map((v) => v.publishedAt), [
    '2021-01-01T00:00:00Z',
    '2023-06-01T12:00:00Z',
  ]);
});

test('withinWindow rejects an unparseable window', () => {
  assert.throws(() => withinWindow([], { start: 'nope', end: WINDOW.end }), RangeError);
});

test('reportWindow clamps the end so a future date can never slip in', () => {
  assert.deepEqual(reportWindow({ windowStart: '2021-01-01T00:00:00Z', windowEnd: '2025-06-01T00:00:00Z' }),
    { start: '2021-01-01T00:00:00Z', end: '2025-06-01T00:00:00Z' });
  // A window that runs past 2026 is capped at the 2027 boundary.
  const capped = reportWindow({ windowStart: '2021-01-01T00:00:00Z', windowEnd: '2030-01-01T00:00:00Z' });
  assert.equal(capped.end, '2027-01-01T00:00:00Z');
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
  assert.equal(s.views, 6_000_000);
  assert.equal(s.medianViews, 2_000_000);
  assert.equal(s.peakVph, 500);
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
  assert.equal(first.views, 4_000_000);
  assert.equal(first.subs, 120000, 'takes the max, not the first or last seen');
  assert.equal(second.channel, 'Two');
});

test('byYear buckets by publication year across the multi-year range', () => {
  assert.deepEqual(byYear(sample), [
    { year: '2021', videoCount: 1, views: 1_000_000 },
    { year: '2023', videoCount: 1, views: 3_000_000 },
    { year: '2025', videoCount: 1, views: 2_000_000 },
  ]);
});

test('topicBreakdown reports the lessons/inspiring mix', () => {
  const mix = topicBreakdown(sample);
  assert.equal(mix.find((m) => m.topic === 'lessons').count, 2);
  assert.equal(mix.find((m) => m.topic === 'inspiring').count, 1);
});

test('byDay/fillDays still bucket by day for callers that want it', () => {
  const oneDay = [sample[0], { ...sample[0], id: 'a2' }];
  assert.deepEqual(byDay(oneDay), [{ day: '2021-08-19', videoCount: 2, views: 2_000_000 }]);
  const filled = fillDays(byDay(oneDay), { start: '2021-08-19T00:00:00Z', end: '2021-08-22T00:00:00Z' });
  assert.equal(filled.length, 3);
});

test('breakouts rank by views per subscriber and skip tiny channels', () => {
  const withMinnow = [...sample, {
    id: 'd', channel: 'Minnow', channelId: 'c3', subs: 300,
    publishedAt: '2022-08-20T00:00:00Z', durationSec: 45,
    views: 5_000_000, likes: 1, comments: 1, vph: 10,
  }];
  const ranked = breakouts(withMinnow, { minSubs: 1000 });
  assert.ok(!ranked.some((v) => v.id === 'd'), '300-sub channel is excluded');
  assert.equal(ranked[0].id, 'c', 'best views-per-sub leads');
  assert.equal(ranked[0].viewsPerSub, 400);
});

test('compact abbreviates at each magnitude', () => {
  assert.equal(compact(43836834), '43.8M');
  assert.equal(compact(562892320), '562.9M');
  assert.equal(compact(2.4e9), '2.4B');
  assert.equal(compact(Number.NaN), '—');
});

test('buildReport keeps only eligible, in-window videos and reports what it dropped', () => {
  const snapshot = {
    scope: 'life-lessons', topics: ['lessons', 'inspiring'],
    windowStart: WINDOW.start, windowEnd: WINDOW.end, minViews: 1_000_000, maxDurationSec: 180,
    fetchedAt: '2026-09-09T00:00:00Z', source: 'test',
    videos: [
      ...sample,
      // too long (over the short-form ceiling)
      { id: 'long', channelId: 'c2', subs: 5000, topic: 'inspiring',
        publishedAt: '2022-01-01T00:00:00Z', durationSec: 600, views: 9_000_000, likes: 0, comments: 0, vph: 1 },
      // too few views
      { id: 'small', channelId: 'c2', subs: 5000, topic: 'inspiring',
        publishedAt: '2022-01-01T00:00:00Z', durationSec: 90, views: 500_000, likes: 0, comments: 0, vph: 1 },
      // before 2021
      { id: 'old', channelId: 'c2', subs: 5000, topic: 'inspiring',
        publishedAt: '2019-01-01T00:00:00Z', durationSec: 90, views: 9_000_000, likes: 0, comments: 0, vph: 1 },
    ],
  };
  const report = buildReport(snapshot);
  assert.equal(report.totals.videoCount, 3, 'long, small and pre-2021 records are filtered out');
  assert.equal(report.excluded, 3);
  assert.equal(report.topByViews[0].id, 'b');
  assert.equal(report.yearly.length, 3, 'the three surviving records span three years');
  assert.equal(report.coverage, 'partial');
});

test('buildReport tightens the floors when a filter asks it to', () => {
  const snapshot = {
    windowStart: WINDOW.start, windowEnd: WINDOW.end, fetchedAt: '2026-09-09T00:00:00Z',
    videos: sample,
  };
  const filtered = buildReport(snapshot, { minViews: 5_000_000 });
  assert.equal(filtered.totals.videoCount, 0, 'none of the sample clears 5M');
  const byDuration = buildReport(snapshot, { maxDurationSec: 100 });
  assert.equal(byDuration.totals.videoCount, 1, 'only the 60-second video clears a 100s ceiling');
});

test('the committed snapshot is well-formed, eligible and free of future dates', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../data/videos.json', import.meta.url)));
  const report = buildReport(snapshot);

  assert.equal(report.excluded, 0, 'every committed record is eligible and in range');
  assert.ok(report.totals.videoCount >= 30, 'a substantial, diverse set ships');
  assert.ok(report.totals.channelCount >= 10, 'discovery is broad, not a handful of channels');
  assert.equal(new Set(snapshot.videos.map((v) => v.id)).size, snapshot.videos.length, 'no duplicate ids');

  const topics = new Set(snapshot.videos.map((v) => v.topic));
  assert.ok(topics.has('lessons') && topics.has('inspiring'), 'both topics are represented');
  // Neither topic is a token handful — both are meaningfully represented.
  const byTopic = report.topics_breakdown;
  assert.ok(byTopic.every((t) => t.count >= 10), 'both life lessons and inspiring stories are well represented');

  const years = new Set(snapshot.videos.map((v) => v.publishedAt.slice(0, 4)));
  assert.ok(years.size >= 2, 'coverage spans more than one publication year');

  const now = Date.now();
  for (const v of snapshot.videos) {
    assert.ok(v.id && v.title && v.channelId, `record ${v.id} has identity fields`);
    assert.ok(v.durationSec > 0 && v.durationSec <= 180, `record ${v.id} is short-form`);
    assert.ok(v.views >= 1_000_000, `record ${v.id} clears a million views`);
    assert.ok(v.topic === 'lessons' || v.topic === 'inspiring', `record ${v.id} is on-topic`);
    const at = Date.parse(v.publishedAt);
    assert.ok(at >= Date.parse('2021-01-01T00:00:00Z'), `record ${v.id} is not before 2021`);
    assert.ok(at < Date.parse('2027-01-01T00:00:00Z'), `record ${v.id} is not after 2026`);
    assert.ok(at <= now, `record ${v.id} is not a future publication`);
  }
});
