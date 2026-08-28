import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildReport } from '../src/shorts.js';
import { overviewMetrics, keyInsights, viewsChartRows } from '../src/insights.js';

const snapshot = JSON.parse(readFileSync(new URL('../data/roblox-shorts.json', import.meta.url)));
const report = buildReport(snapshot);

test('overviewMetrics returns six cards, each with a value and a caption', () => {
  const cards = overviewMetrics(report);
  assert.equal(cards.length, 6);
  for (const c of cards) {
    assert.ok(c.id && c.label && c.icon && c.tone, `${c.id} is fully specified`);
    assert.ok(typeof c.value === 'string' && c.value.length > 0, `${c.id} has a value`);
    assert.ok(typeof c.caption === 'string' && c.caption.length > 0, `${c.id} has a caption`);
  }
});

test('overviewMetrics reads real figures off the committed snapshot', () => {
  const byId = Object.fromEntries(overviewMetrics(report).map((c) => [c.id, c]));
  assert.equal(byId.shorts.value, '68');
  assert.equal(byId.views.exact, report.totals.views.toLocaleString('en-US'));
  assert.equal(byId.channels.value, String(report.totals.channelCount));
  assert.equal(byId.leader.caption, report.topByViews[0].title);
});

test('overviewMetrics degrades to dashes on an empty window rather than throwing', () => {
  const empty = {
    totals: { videoCount: 0, channelCount: 0, views: 0, likes: 0, comments: 0,
              medianViews: 0, meanViews: 0, engagementRate: 0, medianDurationSec: 0, peakVph: 0 },
    topByViews: [], topByVph: [], topChannels: [], breakouts: [], daily: [],
  };
  const cards = overviewMetrics(empty);
  assert.equal(cards.length, 6);
  assert.equal(cards.find((c) => c.id === 'leader').value, '—');
  assert.equal(cards.find((c) => c.id === 'breakout').value, '—');
});

test('keyInsights states facts recomputed from the loaded data', () => {
  const insights = keyInsights(report);
  assert.ok(insights.length >= 3);
  const leader = insights.find((i) => i.id === 'leader');
  assert.ok(leader.headline.includes(report.topByViews[0].channel));
  assert.ok(leader.detail.includes(report.topByViews[0].title));
});

test('keyInsights omits the momentum note when one video leads on both measures', () => {
  const top = report.topByViews[0];
  const same = { ...report, topByVph: [top] };
  assert.equal(keyInsights(same).some((i) => i.id === 'velocity'), false);

  const different = { ...report, topByVph: [report.topByViews[1]] };
  assert.equal(keyInsights(different).some((i) => i.id === 'velocity'), true);
});

test('keyInsights returns nothing rather than filler for an empty window', () => {
  const empty = {
    totals: { videoCount: 0, views: 0, medianViews: 0, meanViews: 0, medianDurationSec: 0 },
    topByViews: [], topByVph: [], breakouts: [],
  };
  assert.deepEqual(keyInsights(empty), []);
});

test('viewsChartRows scales every bar against the largest video', () => {
  const rows = viewsChartRows(report, 5);
  assert.equal(rows.length, 5);
  assert.equal(rows[0].ratio, 1, 'the leader fills the track');
  for (const r of rows) {
    assert.ok(r.ratio > 0 && r.ratio <= 1, `${r.id} sits inside the scale`);
    assert.ok(r.display.length > 0 && r.exact.includes(','), 'carries both compact and exact values');
  }
  assert.ok(rows[0].value >= rows[4].value, 'rows stay in rank order');
});

test('viewsChartRows survives an empty report', () => {
  assert.deepEqual(viewsChartRows({ topByViews: [] }), []);
});
