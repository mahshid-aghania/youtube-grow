import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseDuration, toRecord, classifyTopic, ineligibleReason,
} from '../scripts/fetch-videos.js';

test('parseDuration converts ISO 8601 durations to seconds', () => {
  assert.equal(parseDuration('PT15S'), 15);
  assert.equal(parseDuration('PT8M1S'), 481);
  assert.equal(parseDuration('PT17M44S'), 1064);
  assert.equal(parseDuration('PT1H2M3S'), 3723);
  assert.equal(parseDuration('PT3H17M49S'), 11869);
});

test('parseDuration returns NaN for junk rather than a wrong number', () => {
  assert.ok(Number.isNaN(parseDuration('nope')));
  assert.ok(Number.isNaN(parseDuration('')));
  assert.ok(Number.isNaN(parseDuration(undefined)));
});

const item = {
  id: 'abc123',
  snippet: {
    title: 'Billionaire CEO Secretly Married the Poor Maid He Once Hated | Full Movie',
    description: 'A Cinderella love story: the arrogant billionaire falls for the maid his family rejected.',
    channelTitle: 'Some Channel',
    channelId: 'UC123',
    publishedAt: '2024-08-20T12:00:00.000Z',
    defaultAudioLanguage: 'en-US',
    categoryId: '24',
    liveBroadcastContent: 'none',
  },
  contentDetails: { duration: 'PT2M31S' },
  statistics: { viewCount: '12880489', likeCount: '75214', commentCount: '1938' },
};

test('toRecord maps a verified item onto the analysis shape, with a topic', () => {
  const now = Date.parse('2024-08-21T12:00:00Z'); // 24h after publish
  const r = toRecord(item, new Map([['UC123', 6970000]]), now);

  assert.equal(r.id, 'abc123');
  assert.equal(r.durationSec, 151);
  assert.equal(r.views, 12880489, 'string counts become numbers');
  assert.equal(r.subs, 6970000);
  assert.equal(r.lang, 'en', 'locale is trimmed to a language code');
  assert.equal(r.publishedAt, '2024-08-20T12:00:00Z');
  assert.equal(r.topic, 'romance');
  assert.equal(r.vph, Math.round((12880489 / 24) * 100) / 100);
});

test('classifyTopic uses title, description and category, not one signal alone', () => {
  assert.equal(classifyTopic(item), 'romance');
  assert.equal(classifyTopic({ snippet: { title: 'My Bad Sister Stole My Husband—Then I Took Revenge', description: 'Betrayal and a cheating affair; she plotted a trap to get even', categoryId: '24' } }), 'betrayal');
  assert.equal(classifyTopic({ snippet: { title: 'Official Music Video', description: 'a song', categoryId: '10' } }), null,
    'an off-topic video is rejected, not force-fit');
});

const now = Date.parse('2026-09-09T12:00:00Z');
const opts = { maxDuration: 14400, minViews: 50_000, now };

test('ineligibleReason enforces the runtime ceiling and view floor', () => {
  assert.equal(ineligibleReason(item, opts), null, 'a real long-form hit passes');
  assert.equal(ineligibleReason({ ...item, contentDetails: { duration: 'PT5H0M0S' } }, opts), 'over 14400s');
  assert.equal(ineligibleReason({ ...item, statistics: { viewCount: '40000' } }, opts), 'under 50000 views');
});

test('ineligibleReason excludes future dates and anything outside 2021–2026', () => {
  const at = (iso) => ({ ...item, snippet: { ...item.snippet, publishedAt: iso } });
  assert.equal(ineligibleReason(at('2021-01-01T00:00:00Z'), opts), null, 'the 2021 boundary is inclusive');
  assert.equal(ineligibleReason(at('2020-12-31T23:59:59Z'), opts), 'before 2021');
  assert.equal(ineligibleReason(at('2027-01-01T00:00:00Z'), opts), 'after 2026');
  // A stamp after "now" but still within 2026 is rejected as a future publication.
  assert.equal(ineligibleReason(at('2026-10-01T00:00:00Z'), opts), 'future publish date');
});

test('ineligibleReason drops records missing metadata needed to prove eligibility', () => {
  assert.equal(ineligibleReason({ ...item, contentDetails: {} }, opts), 'missing duration');
  assert.equal(ineligibleReason({ ...item, statistics: {} }, opts), 'missing view count');
  const noDate = { ...item, snippet: { ...item.snippet, publishedAt: 'nonsense' } };
  assert.equal(ineligibleReason(noDate, opts), 'missing publish date');
});

test('ineligibleReason excludes live streams and upcoming premieres', () => {
  const upcoming = { ...item, snippet: { ...item.snippet, liveBroadcastContent: 'upcoming' } };
  assert.equal(ineligibleReason(upcoming, opts), 'live or upcoming');
  const liveNow = { ...item, snippet: { ...item.snippet, liveBroadcastContent: 'live' } };
  assert.equal(ineligibleReason(liveNow, opts), 'live or upcoming');
  const activeStream = { ...item, liveStreamingDetails: { actualStartTime: '2026-01-01T00:00:00Z' } };
  assert.equal(ineligibleReason(activeStream, opts), 'active live stream');
});
