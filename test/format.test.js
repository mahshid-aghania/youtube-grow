import test from 'node:test';
import assert from 'node:assert/strict';

import {
  compactNumber, exactNumber, duration, shortDuration,
  percent, multiple, timestamp, shortDate, dateRange, relativeTime,
} from '../src/format.js';

test('compactNumber abbreviates at each magnitude and drops a trailing .0', () => {
  assert.equal(compactNumber(43836834), '43.8M');
  assert.equal(compactNumber(2000000), '2M', 'not "2.0M"');
  assert.equal(compactNumber(4500), '4.5K');
  assert.equal(compactNumber(950), '950');
  assert.equal(compactNumber(2.4e9), '2.4B');
  assert.equal(compactNumber(0), '0');
});

test('compactNumber handles negatives and rejects non-numbers', () => {
  assert.equal(compactNumber(-1500), '-1.5K');
  assert.equal(compactNumber(Number.NaN), '—');
  assert.equal(compactNumber(undefined), '—');
});

test('exactNumber groups digits for precise readouts', () => {
  assert.equal(exactNumber(43836834), '43,836,834');
  assert.equal(exactNumber(Number.NaN), '—');
});

test('duration and shortDuration format runtimes', () => {
  assert.equal(duration(15), '0:15');
  assert.equal(duration(75), '1:15');
  assert.equal(duration(-1), '—');
  assert.equal(shortDuration(15), '15s');
  assert.equal(shortDuration(50), '50s');
  assert.equal(shortDuration(75), '1:15', 'past a minute it switches to m:ss');
});

test('percent and multiple avoid false precision', () => {
  assert.equal(percent(6.7), '6.7%');
  assert.equal(percent(20), '20%', 'no trailing .0');
  assert.equal(multiple(489.99), '490×');
  assert.equal(multiple(12.34), '12.3×');
  assert.equal(multiple(1.5), '1.50×');
  assert.equal(multiple(Number.NaN), '—');
});

test('timestamp and date helpers render in UTC regardless of host timezone', () => {
  assert.equal(timestamp('2026-08-26T12:50:00Z'), '26 Aug 2026, 12:50 UTC');
  assert.equal(shortDate('2026-08-19T00:00:00Z'), '19 Aug');
  assert.equal(dateRange('2026-08-19T00:00:00Z', '2026-08-26T00:00:00Z'), '19 Aug – 26 Aug 2026');
  assert.equal(timestamp('nonsense'), '—');
  assert.equal(dateRange('x', 'y'), '—');
});

test('relativeTime counts back from an explicit now, never the wall clock', () => {
  const now = Date.parse('2026-08-26T12:00:00Z');
  assert.equal(relativeTime('2026-08-26T11:00:00Z', now), '1 hour ago');
  assert.equal(relativeTime('2026-08-26T09:00:00Z', now), '3 hours ago');
  assert.equal(relativeTime('2026-08-25T12:00:00Z', now), '1 day ago');
  assert.equal(relativeTime('2026-08-26T11:59:30Z', now), 'just now');
  assert.equal(relativeTime('2026-08-26T13:00:00Z', now), 'just now', 'a future stamp is not "-1 hours ago"');
  assert.equal(relativeTime('nope', now), '—');
});
