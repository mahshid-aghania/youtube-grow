import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

import {
  parseVideoId, thumbnailUrl, timecode, sceneRange,
  normaliseShotlist, longestScene,
} from '../src/shotlist.js';

test('parseVideoId accepts every YouTube link shape', () => {
  const id = 'gpBA12uEBIA';
  for (const input of [
    id,
    `https://www.youtube.com/shorts/${id}`,
    `https://youtube.com/shorts/${id}`,
    `https://www.youtube.com/watch?v=${id}`,
    `https://www.youtube.com/watch?app=desktop&v=${id}&t=3s`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?t=5`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `  https://www.youtube.com/shorts/${id}  `,
  ]) {
    assert.equal(parseVideoId(input), id, `failed on: ${input}`);
  }
});

test('parseVideoId returns null for junk instead of throwing', () => {
  for (const input of ['', '   ', 'not a url', 'https://vimeo.com/12345',
                       'https://www.youtube.com/', 'abc', null, undefined, 42, {}]) {
    assert.equal(parseVideoId(input), null, `should reject: ${JSON.stringify(input)}`);
  }
});

test('parseVideoId does not mistake a longer token for an id', () => {
  // A channel id is 24 chars — the watch pattern must not match a prefix of it.
  assert.equal(parseVideoId('https://www.youtube.com/channel/UCRKPNXzPWJtJeoVBaFVuBCw'), null);
});

test('thumbnailUrl builds a YouTube image URL and rejects a bad id', () => {
  assert.equal(thumbnailUrl('gpBA12uEBIA'), 'https://i.ytimg.com/vi/gpBA12uEBIA/hqdefault.jpg');
  assert.equal(thumbnailUrl('gpBA12uEBIA', 'maxresdefault'),
    'https://i.ytimg.com/vi/gpBA12uEBIA/maxresdefault.jpg');
  assert.throws(() => thumbnailUrl('nope'), RangeError);
});

test('timecode formats seconds as m:ss', () => {
  assert.equal(timecode(0), '0:00');
  assert.equal(timecode(9), '0:09');
  assert.equal(timecode(75), '1:15');
  assert.equal(timecode(6.4), '0:06', 'truncates rather than rounding up mid-scene');
  assert.equal(timecode(-1), '—');
  assert.equal(timecode(Number.NaN), '—');
});

const raw = {
  videoId: 'gpBA12uEBIA',
  title: 'Test Short',
  channel: 'Someone',
  durationSeconds: 15,
  scenes: [
    { startSec: 9, endSec: 15, action: 'C', dialogue: 'c', camera: 'static', visual: 'v3' },
    { startSec: 0, endSec: 1, action: 'A', dialogue: 'a', camera: 'static', visual: 'v1' },
    { startSec: 1, endSec: 4, action: 'B', camera: 'cut' },
  ],
};

test('normaliseShotlist sorts scenes into play order and numbers them', () => {
  const s = normaliseShotlist(raw);
  assert.deepEqual(s.scenes.map((x) => x.n), [1, 2, 3]);
  assert.deepEqual(s.scenes.map((x) => x.action), ['A', 'B', 'C']);
  assert.equal(s.sceneCount, 3);
});

test('normaliseShotlist computes duration and share of runtime', () => {
  const s = normaliseShotlist(raw);
  assert.deepEqual(s.scenes.map((x) => x.durationSec), [1, 3, 6]);
  assert.deepEqual(s.scenes.map((x) => x.share), [6.7, 20, 40]);
  assert.equal(s.meanSceneSec, 5);
});

test('normaliseShotlist fills missing optional fields with a dash', () => {
  const s = normaliseShotlist(raw);
  assert.equal(s.scenes[1].dialogue, '—', 'a silent scene still renders a cell');
  assert.equal(s.scenes[1].visual, '');
});

test('normaliseShotlist falls back to the last scene end when runtime is absent', () => {
  const s = normaliseShotlist({ ...raw, durationSeconds: undefined });
  assert.equal(s.durationSeconds, 15);
});

test('normaliseShotlist rejects records the page could not render', () => {
  assert.throws(() => normaliseShotlist(null), TypeError);
  assert.throws(() => normaliseShotlist({ videoId: 'bad', scenes: [{}] }), TypeError);
  assert.throws(() => normaliseShotlist({ ...raw, scenes: [] }), TypeError);
  assert.throws(() => normaliseShotlist({ ...raw, scenes: [{ startSec: 0 }] }), TypeError);
  assert.throws(
    () => normaliseShotlist({ ...raw, scenes: [{ startSec: 5, endSec: 2 }] }),
    TypeError,
    'a scene that ends before it starts is a data error, not a render quirk',
  );
});

test('sceneRange and longestScene read off the normalised record', () => {
  const s = normaliseShotlist(raw);
  assert.equal(sceneRange(s.scenes[0]), '0:00–0:01');
  assert.equal(longestScene(s).action, 'C');
});

test('every committed shot list is valid and matches its filename', () => {
  const dir = new URL('../data/shotlists/', import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json');
  assert.ok(files.length > 0, 'at least one shot list ships with the repo');

  for (const file of files) {
    const record = JSON.parse(readFileSync(new URL(file, dir)));
    const s = normaliseShotlist(record);
    assert.equal(`${s.videoId}.json`, file, `${file} is named after its videoId`);
    assert.ok(s.scenes.length > 0, `${file} has scenes`);
    assert.ok(s.hook?.why, `${file} explains its hook`);
  }
});

test('the shot-list index lists exactly the files on disk', () => {
  const dir = new URL('../data/shotlists/', import.meta.url);
  const index = JSON.parse(readFileSync(new URL('index.json', dir)));
  const onDisk = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => f.replace('.json', '')).sort();

  assert.deepEqual(index.videoIds.slice().sort(), onDisk,
    'a shot list added without updating index.json would be invisible to the page');
});
