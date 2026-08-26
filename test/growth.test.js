import test from 'node:test';
import assert from 'node:assert/strict';

import {
  projectSubscribers,
  engagementRate,
  viewVelocity,
  topPerformers,
} from '../src/growth.js';

test('projectSubscribers compounds monthly growth', () => {
  assert.equal(projectSubscribers(1000, 0.05, 0), 1000);
  assert.equal(projectSubscribers(1000, 0.05, 1), 1050);
  assert.equal(projectSubscribers(1000, 0.05, 12), 1796);
});

test('projectSubscribers handles decline and rejects bad input', () => {
  assert.equal(projectSubscribers(2000, -0.1, 3), 1458);
  assert.throws(() => projectSubscribers(-1, 0.05, 3), RangeError);
  assert.throws(() => projectSubscribers(1000, 0.05, 1.5), RangeError);
  assert.throws(() => projectSubscribers(1000, -1, 3), RangeError);
});

test('engagementRate reports interactions as a percentage of views', () => {
  assert.equal(engagementRate({ views: 10000, likes: 450, comments: 50 }), 5);
  assert.equal(engagementRate({ views: 3, likes: 1 }), 33.33);
});

test('engagementRate treats a video with no views as zero, not NaN', () => {
  assert.equal(engagementRate({ views: 0, likes: 10, comments: 2 }), 0);
  assert.throws(() => engagementRate({ views: -5 }), RangeError);
});

test('viewVelocity averages views per day and never divides by zero', () => {
  assert.equal(viewVelocity(5000, 10), 500);
  assert.equal(viewVelocity(1200, 0), 1200);
  assert.equal(viewVelocity(100, 3), 33.3);
});

test('topPerformers ranks by velocity, best first', () => {
  const videos = [
    { title: 'Slow burn', views: 9000, daysSincePublish: 90 },
    { title: 'Breakout', views: 40000, daysSincePublish: 4 },
    { title: 'Steady', views: 6000, daysSincePublish: 12 },
    { title: 'Flat', views: 300, daysSincePublish: 30 },
  ];

  assert.deepEqual(topPerformers(videos, 2), [
    { title: 'Breakout', velocity: 10000 },
    { title: 'Steady', velocity: 500 },
  ]);
  assert.equal(topPerformers(videos).length, 3);
});
