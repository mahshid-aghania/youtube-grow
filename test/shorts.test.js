import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isEligible, isLongForm, withinWindow, reportWindow, median, summarize, rankBy,
  byChannel, byDay, byYear, fillDays, breakouts, topicBreakdown, compact, buildReport,
  MIN_LONGFORM_SECONDS, MIN_VIEWS, VIEW_THRESHOLDS, DURATION_THRESHOLDS,
} from '../src/shorts.js';

const WINDOW = { start: '2021-01-01T00:00:00Z', end: '2026-09-09T00:00:00Z' };

/** Three eligible long-form videos, plus fields the rollups read. */
const sample = [
  { id: 'a', title: 'A', topic: 'couples', channel: 'One', channelId: 'c1', country: 'US', subs: 100000,
    publishedAt: '2021-08-19T10:00:00Z', durationSec: 600, views: 1_000_000, likes: 100000, comments: 10000, vph: 50 },
  { id: 'b', title: 'B', topic: 'family', channel: 'One', channelId: 'c1', country: 'US', subs: 120000,
    publishedAt: '2023-08-21T10:00:00Z', durationSec: 900, views: 3_000_000, likes: 200000, comments: 20000, vph: 500 },
  { id: 'c', title: 'C', topic: 'couples', channel: 'Two', channelId: 'c2', country: 'DE', subs: 5000,
    publishedAt: '2025-08-21T23:59:59Z', durationSec: 1200, views: 2_000_000, likes: 50000, comments: 5000, vph: 120 },
];

test('isLongForm applies the eight-minute floor', () => {
  assert.equal(isLongForm({ durationSec: 480 }), true);
  assert.equal(isLongForm({ durationSec: 479 }), false);
  assert.equal(isLongForm({ durationSec: undefined }), false);
  assert.equal(isLongForm({ durationSec: 900 }, 1200), false, 'a raised floor is respected');
});

test('isEligible requires both the duration and the million-view floors', () => {
  assert.equal(isEligible({ durationSec: 600, views: 2_000_000 }), true);
  assert.equal(isEligible({ durationSec: 300, views: 2_000_000 }), false, 'too short');
  assert.equal(isEligible({ durationSec: 600, views: 900_000 }), false, 'too few views');
  assert.equal(isEligible({ durationSec: 600 }), false, 'missing view count fails closed');
  assert.equal(isEligible({ views: 2_000_000 }), false, 'missing duration fails closed');
  assert.equal(MIN_LONGFORM_SECONDS, 480);
  assert.equal(MIN_VIEWS, 1_000_000);
});

test('isEligible honours raised thresholds from the filter controls', () => {
  const v = { durationSec: 700, views: 2_000_000 };
  assert.equal(isEligible(v, { minViews: 5_000_000 }), false);
  assert.equal(isEligible(v, { minDurationSec: 1200 }), false);
  assert.equal(isEligible(v, { minViews: 1_000_000, minDurationSec: 600 }), true);
});

test('the offered thresholds match the brief', () => {
  assert.deepEqual(VIEW_THRESHOLDS.map((t) => t.value), [1e6, 5e6, 1e7, 2.5e7, 5e7]);
  assert.equal(DURATION_THRESHOLDS[0].value, 480, 'default minimum is eight minutes');
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

test('topicBreakdown reports the couples/family mix', () => {
  const mix = topicBreakdown(sample);
  assert.equal(mix.find((m) => m.topic === 'couples').count, 2);
  assert.equal(mix.find((m) => m.topic === 'family').count, 1);
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
    publishedAt: '2022-08-20T00:00:00Z', durationSec: 600,
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
    scope: 'couples-family', topics: ['couples', 'family'],
    windowStart: WINDOW.start, windowEnd: WINDOW.end, minViews: 1_000_000, minDurationSec: 480,
    fetchedAt: '2026-09-09T00:00:00Z', source: 'test',
    videos: [
      ...sample,
      // too short
      { id: 'short', channelId: 'c2', subs: 5000, topic: 'family',
        publishedAt: '2022-01-01T00:00:00Z', durationSec: 120, views: 9_000_000, likes: 0, comments: 0, vph: 1 },
      // too few views
      { id: 'small', channelId: 'c2', subs: 5000, topic: 'family',
        publishedAt: '2022-01-01T00:00:00Z', durationSec: 900, views: 500_000, likes: 0, comments: 0, vph: 1 },
      // before 2021
      { id: 'old', channelId: 'c2', subs: 5000, topic: 'family',
        publishedAt: '2019-01-01T00:00:00Z', durationSec: 900, views: 9_000_000, likes: 0, comments: 0, vph: 1 },
    ],
  };
  const report = buildReport(snapshot);
  assert.equal(report.totals.videoCount, 3, 'short, small and pre-2021 records are filtered out');
  assert.equal(report.excluded, 3);
  assert.equal(report.topByViews[0].id, 'b');
  assert.equal(report.yearly.length, 3, 'the three surviving records span three years');
  assert.equal(report.coverage, 'partial');
});

test('buildReport raises the floors when a filter asks it to', () => {
  const snapshot = {
    windowStart: WINDOW.start, windowEnd: WINDOW.end, fetchedAt: '2026-09-09T00:00:00Z',
    videos: sample,
  };
  const filtered = buildReport(snapshot, { minViews: 5_000_000 });
  assert.equal(filtered.totals.videoCount, 0, 'none of the sample clears 5M');
  const byDuration = buildReport(snapshot, { minDurationSec: 1000 });
  assert.equal(byDuration.totals.videoCount, 1, 'only the 20-minute video clears 1000s');
});

test('the committed snapshot is well-formed, eligible and free of future dates', () => {
  const snapshot = JSON.parse(readFileSync(new URL('../data/videos.json', import.meta.url)));
  const report = buildReport(snapshot);

  assert.equal(report.excluded, 0, 'every committed record is eligible and in range');
  assert.ok(report.totals.videoCount >= 25, 'a substantial, diverse set ships');
  assert.ok(report.totals.channelCount >= 15, 'discovery is broad, not a handful of channels');
  assert.equal(new Set(snapshot.videos.map((v) => v.id)).size, snapshot.videos.length, 'no duplicate ids');

  const topics = new Set(snapshot.videos.map((v) => v.topic));
  assert.ok(topics.has('couples') && topics.has('family'), 'both topics are represented');
  // Neither topic is a token handful — both are meaningfully represented.
  const byTopic = report.topics_breakdown;
  assert.ok(byTopic.every((t) => t.count >= 10), 'both couples and family are well represented');

  const years = new Set(snapshot.videos.map((v) => v.publishedAt.slice(0, 4)));
  assert.ok(years.size >= 4, 'coverage spans several publication years, not one');

  const now = Date.now();
  for (const v of snapshot.videos) {
    assert.ok(v.id && v.title && v.channelId, `record ${v.id} has identity fields`);
    assert.ok(v.durationSec >= 480, `record ${v.id} is long-form`);
    assert.ok(v.views >= 1_000_000, `record ${v.id} clears a million views`);
    assert.ok(v.topic === 'couples' || v.topic === 'family', `record ${v.id} is on-topic`);
    const at = Date.parse(v.publishedAt);
    assert.ok(at >= Date.parse('2021-01-01T00:00:00Z'), `record ${v.id} is not before 2021`);
    assert.ok(at < Date.parse('2027-01-01T00:00:00Z'), `record ${v.id} is not after 2026`);
    assert.ok(at <= now, `record ${v.id} is not a future publication`);
  }
});
