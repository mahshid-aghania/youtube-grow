import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { buildReport, isShort, withinWindow } from '../src/shorts.js';
import { normaliseShotlist } from '../src/shotlist.js';
import { buildSignals, tokenize, keywordCounts, durationBands, leadingBand, sceneSignals } from '../src/planner/signals.js';
import { PILLARS, THEMES, pillarById } from '../src/planner/pillars.js';
import {
  recommendWeek, rankPillars, supportFor, targetDuration, weekDates, addDays,
  makeRandom, hashString, sceneCountFor, WEEK_SLOTS,
} from '../src/planner/recommend.js';
import { buildCharacter, buildCast, identityLock } from '../src/planner/characters.js';
import { buildTimeline, buildScenes } from '../src/planner/story.js';
import { imagePrompt, videoPrompt } from '../src/planner/prompts.js';
import { RIG_OPTIONS, RENDER_OPTIONS, styleBlock } from '../src/planner/robloxstyle.js';
import {
  GAME_CHARACTERS, GAME_WORLDS, gameCharacterById, referenceSheetPrompt, worldById,
} from '../src/planner/games.js';
import { buildDayPlan, planRuntime, LOCKABLE } from '../src/planner/plan.js';
import {
  migrate, loadState, saveState, dayRecord, setDay, variantMap,
  DEFAULT_PREFS, SCHEMA_VERSION,
} from '../src/planner/storage.js';
import { dayMarkdown, weekMarkdown, weekJson, castMarkdown } from '../src/planner/export.js';

/* ---------- fixtures ---------- */

const snapshot = JSON.parse(readFileSync(new URL('../data/roblox-shorts.json', import.meta.url)));
const report = buildReport(snapshot);
const videos = withinWindow(snapshot.videos.filter(isShort),
  { start: snapshot.windowStart, end: snapshot.windowEnd });
const shotlists = ['gpBA12uEBIA', 'Snpt7oqfzP4', 'xQXojdSP54s'].map((id) =>
  normaliseShotlist(JSON.parse(readFileSync(new URL(`../data/shotlists/${id}.json`, import.meta.url)))));
const signals = buildSignals(videos, shotlists, THEMES);
const prefs = { ...DEFAULT_PREFS };
const WEEK = '2026-08-29'; // a Saturday

/* ---------- signals ---------- */

test('tokenize drops stopwords, hashes and short tokens', () => {
  assert.deepEqual(tokenize('The #Roblox Animal Hospital is #1 !!'), ['roblox', 'animal', 'hospital']);
  assert.deepEqual(tokenize(''), []);
  assert.deepEqual(tokenize(null), []);
});

test('keywordCounts counts each word once per video', () => {
  const counts = keywordCounts([{ title: 'roblox roblox roblox hospital' }, { title: 'roblox' }]);
  const roblox = counts.find((c) => c.word === 'roblox');
  assert.equal(roblox.count, 2, 'not 4 — repetition inside one title cannot inflate a keyword');
});

test('signals read real structure out of the committed snapshot', () => {
  assert.equal(signals.sampleSize, 68);
  assert.ok(signals.keywords.length > 0);
  const ah = signals.themes.find((t) => t.id === 'animal-hospital');
  assert.ok(ah.count >= 3, 'Animal Hospital is genuinely present in the window');
  assert.ok(ah.examples.length > 0 && ah.examples[0].title, 'evidence carries a real example');
});

test('durationBands and leadingBand partition the set without loss', () => {
  const bands = durationBands(videos);
  const total = bands.reduce((t, b) => t + b.count, 0);
  assert.equal(total, videos.length, 'every video lands in exactly one band');
  assert.ok(leadingBand(videos).count > 0);
  assert.equal(leadingBand([]), null);
});

test('sceneSignals reports availability rather than inventing numbers', () => {
  assert.equal(sceneSignals([]).available, false);
  assert.equal(sceneSignals(null).available, false);
  const s = sceneSignals(shotlists);
  assert.equal(s.available, true);
  assert.equal(s.sampleSize, 3);
  assert.ok(s.medianSceneSec > 0);
});

/* ---------- recommendation ---------- */

test('makeRandom is deterministic for a seed and varies across seeds', () => {
  const a = makeRandom(hashString('x'));
  const b = makeRandom(hashString('x'));
  assert.equal(a(), b());
  assert.notEqual(makeRandom(hashString('x'))(), makeRandom(hashString('y'))());
});

test('weekDates walks seven days and honours preferred posting days', () => {
  assert.equal(weekDates(WEEK, prefs).length, 7);
  assert.equal(weekDates(WEEK, prefs)[0].dayName, 'Saturday');
  const midweek = weekDates(WEEK, { postingDays: ['Monday', 'Thursday'] });
  assert.deepEqual(midweek.map((d) => d.dayName), ['Monday', 'Thursday']);
});

test('addDays crosses a month boundary in UTC', () => {
  assert.equal(addDays('2026-08-30', 3), '2026-09-02');
});

test('supportFor labels evidence honestly across the three levels', () => {
  const ah = supportFor(pillarById('animal-hospital'), signals);
  assert.equal(ah.level, 'data-supported');
  assert.match(ah.evidence, /\d+ of 68 tracked Shorts/);

  const exp = supportFor(pillarById('experimental'), signals);
  assert.equal(exp.level, 'experimental');
  assert.match(exp.evidence, /Nothing in the tracked window/);
});

test('supportFor never claims support when the sample is empty', () => {
  const empty = { sampleSize: 0, themes: [], momentumThemes: [] };
  assert.equal(supportFor(pillarById('animal-hospital'), empty).level, 'experimental');
});

test('recommendWeek returns one balanced, non-repeating plan per day', () => {
  const week = recommendWeek(signals, prefs, { weekStart: WEEK });
  assert.equal(week.length, 7);
  assert.equal(week[0].dayName, 'Saturday');
  assert.equal(week[6].dayName, 'Friday');

  const pillars = week.map((d) => d.pillarId);
  assert.equal(new Set(pillars).size, 7, 'no format repeats inside one week');
  assert.deepEqual(week.map((d) => d.slot.id), WEEK_SLOTS.map((s) => s.id));
});

test('recommendWeek is deterministic, and a variant changes only that day', () => {
  const a = recommendWeek(signals, prefs, { weekStart: WEEK });
  const b = recommendWeek(signals, prefs, { weekStart: WEEK });
  assert.deepEqual(a.map((d) => d.seedId), b.map((d) => d.seedId));

  const c = recommendWeek(signals, prefs, { weekStart: WEEK, variants: { [a[2].date]: 1 } });
  assert.equal(c[0].seedId, a[0].seedId, 'other days are untouched');
  assert.equal(c[2].pillarId, a[2].pillarId, 'the pillar stays; only the concept moves');
});

test('every regeneration lands on a different concept, and cycles back', () => {
  const day = week[0];
  const seedFor = (variant) => recommendWeek(signals, prefs,
    { weekStart: WEEK, variants: { [day.date]: variant } })[0].seedId;

  const pillar = pillarById(day.pillarId);
  const seen = [];
  for (let v = 0; v < pillar.seeds.length; v += 1) {
    const id = seedFor(v);
    assert.ok(!seen.includes(id), `variant ${v} is a concept not already used`);
    seen.push(id);
  }
  assert.equal(seen.length, pillar.seeds.length, 'regeneration reaches every concept');
  assert.equal(seedFor(pillar.seeds.length), seen[0], 'a full round returns to the original');
});

test('regenerating one day never disturbs another', () => {
  const base = recommendWeek(signals, prefs, { weekStart: WEEK });
  const bumped = recommendWeek(signals, prefs, { weekStart: WEEK, variants: { [base[3].date]: 1 } });
  for (let i = 0; i < base.length; i += 1) {
    if (i === 3) assert.notEqual(bumped[i].seedId, base[i].seedId, 'the regenerated day moved');
    else assert.equal(bumped[i].seedId, base[i].seedId, `day ${i} is untouched`);
  }
});

test('the experimental slot is placed last, never on the opening day', () => {
  const week = recommendWeek(signals, prefs, { weekStart: WEEK });
  assert.equal(week[0].support.level !== 'experimental', true);
  assert.equal(week[6].slot.id, 'experimental');
});

test('targetDuration honours a fixed preference and otherwise cites the data', () => {
  const fixed = targetDuration({ durationMode: 'fixed', durationSec: 30 }, signals);
  assert.equal(fixed.seconds, 30);
  assert.match(fixed.basis, /preferences/);

  const auto = targetDuration({ durationMode: 'auto' }, signals);
  assert.ok(auto.seconds >= 8 && auto.seconds <= 45);
  assert.match(auto.basis, /tracked Shorts fall in the/);

  const blind = targetDuration({}, { sampleSize: 0, momentumBand: null, leadingBand: null });
  assert.match(blind.basis, /No duration signal/);
});

test('sceneCountFor stays inside a workable range', () => {
  assert.ok(sceneCountFor(10, signals) >= 3);
  assert.ok(sceneCountFor(60, signals) <= 9);
});

/* ---------- characters ---------- */

test('buildCharacter is deterministic and fully specified', () => {
  const a = buildCharacter('vet', 'seed-1');
  const b = buildCharacter('vet', 'seed-1');
  assert.deepEqual(a, b);
  assert.notEqual(buildCharacter('vet', 'seed-2').name, a.name);

  for (const field of ['name', 'rig', 'head', 'faceDecal', 'hat', 'hair', 'outfit', 'shoes',
    'accessories', 'colors', 'marks']) {
    assert.ok(a[field] && a[field].length > 0, `${field} is populated`);
  }
  assert.ok(a.mustNotChange.length >= 5 && a.mayChange.length >= 3 && a.negatives.length >= 5);
});

test('identityLock names every attribute a generator would otherwise drift on', () => {
  const c = buildCharacter('intern', 'x');
  const lock = identityLock(c);
  for (const needle of [c.name, c.head, c.faceDecal, c.hat, c.hair, c.outfit, c.shoes,
    c.accessories, c.colors]) {
    assert.ok(lock.includes(needle), `lock repeats "${needle.slice(0, 24)}…"`);
  }
  assert.match(lock, /Do not redesign, replace, age, humanise/);
  // The single most common drift: the generator sculpts a real face.
  assert.match(lock, /it stays a printed decal/);
});

test('buildCast resolves relative heights across the whole cast', () => {
  const seed = pillarById('animal-hospital').seeds[0];
  const cast = buildCast(seed, 'seed');
  assert.equal(cast.length, seed.roles.length);
  for (const c of cast) assert.ok(c.heightNote.length > 0, `${c.name} has a height note`);
});

test('a saved character replaces its role and is marked as reused', () => {
  const seed = pillarById('animal-hospital').seeds[0];
  const mine = { ...buildCharacter('vet', 'mine'), name: 'Dr. Haw' };
  const cast = buildCast(seed, 'seed', { vet: mine });
  const vet = cast.find((c) => c.roleKey === 'vet');
  assert.equal(vet.name, 'Dr. Haw');
  assert.equal(vet.reused, true);
});

/* ---------- story ---------- */

test('buildTimeline always sums exactly to the requested runtime', () => {
  for (const seconds of [8, 12, 15, 22, 30, 45, 60]) {
    for (const count of [3, 4, 5, 6, 7, 8, 9]) {
      const t = buildTimeline(seconds, count);
      assert.equal(t.length, count, `${seconds}s / ${count} scenes produces ${count} scenes`);
      assert.equal(t[0].startSec, 0, 'starts at zero');
      assert.equal(t[t.length - 1].endSec, seconds, `${seconds}s / ${count} ends exactly on target`);
      for (let i = 1; i < t.length; i += 1) {
        assert.equal(t[i].startSec, t[i - 1].endSec, 'no gap or overlap between scenes');
      }
      for (const s of t) assert.ok(s.durationSec > 0, 'every scene has real duration');
    }
  }
});

test('buildTimeline keeps the opening scene short enough to be a hook', () => {
  const t = buildTimeline(60, 5);
  assert.ok(t[0].durationSec <= 3, 'the hook is capped regardless of runtime');
});

test('buildTimeline rejects impossible inputs', () => {
  assert.throws(() => buildTimeline(0, 5), RangeError);
  assert.throws(() => buildTimeline(-5, 5), RangeError);
  assert.throws(() => buildTimeline(20, 0), RangeError);
  assert.throws(() => buildTimeline(20, 2.5), RangeError);
});

test('buildScenes fills every storyboard field the workspace prints', () => {
  const seed = pillarById('tiny-rescue').seeds[0];
  const cast = buildCast(seed, 's');
  const scenes = buildScenes(seed, cast, buildTimeline(20, 5));
  assert.equal(scenes.length, 5);

  const required = ['purpose', 'location', 'characters', 'position', 'action', 'expression',
    'backgroundAction', 'dialogue', 'onScreenText', 'framing', 'angle', 'movement', 'lighting',
    'sfx', 'music', 'transition', 'continuity', 'retention'];
  for (const s of scenes) {
    for (const f of required) {
      assert.ok(s[f] !== undefined && String(s[f]).length > 0, `scene ${s.n} has ${f}`);
    }
  }
  assert.match(scenes[scenes.length - 1].transition, /loop/i, 'the last scene sets up the loop');
});

test('the no-dialogue preference silences every scene', () => {
  const seed = pillarById('comparison').seeds[0];
  const cast = buildCast(seed, 's');
  const scenes = buildScenes(seed, cast, buildTimeline(18, 5), { dialogue: false });
  for (const s of scenes) assert.equal(s.dialogue, '—');
});

/* ---------- prompts ---------- */

test('an image prompt stands alone — identity, scene and negatives all present', () => {
  const seed = pillarById('animal-hospital').seeds[0];
  const cast = buildCast(seed, 's');
  const scene = buildScenes(seed, cast, buildTimeline(20, 5))[2];
  const p = imagePrompt(scene, cast, { platform: 'generic' });

  assert.ok(p.includes('IDENTITY LOCK'), 'carries the identity lock');
  assert.ok(p.includes(cast[0].outfit), 'repeats the outfit rather than referring back');
  assert.ok(p.includes(scene.action), 'states this scene\'s action');
  assert.ok(p.includes('9:16'), 'specifies vertical framing');
  assert.match(p, /NEGATIVE PROMPT/);
  assert.match(p, /no watermark/);
  assert.match(p, /no cropped face/);
});

test('image prompts adapt wording per platform but keep the same scene facts', () => {
  const seed = pillarById('comparison').seeds[0];
  const cast = buildCast(seed, 's');
  const scene = buildScenes(seed, cast, buildTimeline(18, 5))[0];

  const mj = imagePrompt(scene, cast, { platform: 'midjourney' });
  const gpt = imagePrompt(scene, cast, { platform: 'chatgpt' });
  assert.match(mj, /--ar 9:16/, 'Midjourney gets parameter syntax');
  assert.ok(!gpt.includes('--ar'), 'ChatGPT does not');
  for (const p of [mj, gpt]) {
    assert.ok(p.includes(cast[0].name) && p.includes(scene.action), 'scene identity is platform-independent');
  }
});

test('image prompts push on-screen text to the editor rather than the generator', () => {
  const seed = pillarById('family-comedy').seeds[0];
  const cast = buildCast(seed, 's');
  const scene = buildScenes(seed, cast, buildTimeline(15, 5))[0];
  const p = imagePrompt(scene, cast, {});
  assert.match(p, /do not render any text in this image/i);
  assert.match(p, /Add ".*" during editing/);
});

test('a video prompt carries duration, a motion schedule and the anti-drift negatives', () => {
  const seed = pillarById('animal-hospital').seeds[1];
  const cast = buildCast(seed, 's');
  const scenes = buildScenes(seed, cast, buildTimeline(24, 6));
  const p = videoPrompt(scenes[1], cast, { platform: 'veo' });

  assert.ok(p.includes(`exactly ${scenes[1].durationSec} seconds`));
  assert.match(p, /MOTION SCHEDULE/);
  assert.match(p, /IDENTITY LOCK/);
  assert.match(p, /no repeated speech/);
  assert.match(p, /no character morphing/);
  assert.match(p, /no automatic scene transition/);
});

test('a speaking scene demands one delivery; a silent scene forbids lip movement', () => {
  const seed = pillarById('animal-hospital').seeds[0];
  const cast = buildCast(seed, 's');
  const timeline = buildTimeline(20, 5);

  const spoken = buildScenes(seed, cast, timeline, { dialogue: true })[0];
  assert.match(videoPrompt(spoken, cast, {}), /deliver the dialogue exactly once/);
  assert.match(videoPrompt(spoken, cast, {}), /printed decal swapping between open and closed/);
  assert.match(videoPrompt(spoken, cast, {}), /Do not repeat, restart, paraphrase, echo/);

  const silent = buildScenes(seed, cast, timeline, { dialogue: false })[0];
  const sp = videoPrompt(silent, cast, {});
  assert.match(sp, /does not speak/);
  assert.match(sp, /Do not generate any mouth movement/);
});

/* ---------- plan assembly ---------- */

const week = recommendWeek(signals, prefs, { weekStart: WEEK });

test('buildDayPlan produces every section of the production package', () => {
  const plan = buildDayPlan(week[0], prefs);
  for (const key of ['strategy', 'story', 'cast', 'scenes', 'audio', 'publishing', 'meta']) {
    assert.ok(plan[key], `plan has ${key}`);
  }
  assert.equal(plan.scenes.length, plan.strategy.sceneCount);
  assert.equal(planRuntime(plan), plan.strategy.durationSec, 'the storyboard fills the runtime exactly');
  for (const s of plan.scenes) {
    assert.ok(s.imagePrompt.length > 400, `scene ${s.n} has a substantial image prompt`);
    assert.ok(s.videoPrompt.length > 400, `scene ${s.n} has a substantial video prompt`);
  }
});

test('every day of the week assembles without error and keeps its timings', () => {
  for (const rec of week) {
    const plan = buildDayPlan(rec, prefs);
    assert.equal(planRuntime(plan), plan.strategy.durationSec, `${plan.dayName} runtime is exact`);
    assert.ok(plan.cast.length >= 1);
    assert.ok(plan.publishing.titles.length === 3);
    assert.ok(plan.publishing.hashtags.length >= 5 && plan.publishing.hashtags.length <= 10);
    assert.ok(plan.publishing.checklist.length >= 8);
  }
});

test('edits override generated values and duration edits re-time the storyboard', () => {
  const plan = buildDayPlan(week[0], prefs, {
    edits: { title: 'My own title', durationSec: 30, sceneCount: 6 },
  });
  assert.equal(plan.publishing.recommendedTitle, 'My own title');
  assert.equal(plan.strategy.durationSec, 30);
  assert.equal(plan.scenes.length, 6);
  assert.equal(planRuntime(plan), 30, 'an edited duration still ends exactly on target');
});

test('the publishing package refuses to name a best posting time', () => {
  const plan = buildDayPlan(week[0], prefs);
  assert.equal(plan.publishing.publishTime.value, '');
  assert.match(plan.publishing.publishTime.note, /no supportable "best time"/);
});

test('the plan never claims a prediction', () => {
  const text = week.map((r) => JSON.stringify(buildDayPlan(r, prefs))).join(' ').toLowerCase();
  for (const banned of ['guaranteed', 'will go viral', 'will receive', 'youtube will promote']) {
    assert.ok(!text.includes(banned), `plan does not contain "${banned}"`);
  }
  const plan = buildDayPlan(week[0], prefs);
  assert.match(plan.strategy.whyItHolds, /execution, audience fit, timing/);
});

/* ---------- storage ---------- */

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}

test('state round-trips through storage', () => {
  const s = memoryStorage();
  let state = loadState(s);
  assert.equal(state.version, SCHEMA_VERSION);

  state = setDay(state, '2026-08-29', { status: 'ready', variant: 3, locks: ['story'] });
  assert.equal(saveState(s, state), true);

  const back = loadState(s);
  assert.equal(back.days['2026-08-29'].status, 'ready');
  assert.deepEqual(back.days['2026-08-29'].locks, ['story']);
  assert.deepEqual(variantMap(back), { '2026-08-29': 3 });
});

test('storage survives corrupt, absent and unwritable backends', () => {
  const bad = { getItem: () => '{not json', setItem: () => {}, removeItem: () => {} };
  assert.equal(loadState(bad).version, SCHEMA_VERSION, 'a corrupt blob falls back to defaults');

  const throwing = {
    getItem: () => { throw new Error('blocked'); },
    setItem: () => { throw new Error('blocked'); },
    removeItem: () => { throw new Error('blocked'); },
  };
  assert.equal(loadState(throwing).version, SCHEMA_VERSION);
  assert.equal(saveState(throwing, loadState(throwing)), false, 'reports failure instead of throwing');
});

test('migrate carries a v1 payload forward and discards an unknown version', () => {
  const v1 = migrate({ version: 1, preferences: { language: 'Spanish' }, days: { a: { status: 'ready' } } });
  assert.equal(v1.version, SCHEMA_VERSION);
  assert.equal(v1.prefs.language, 'Spanish');
  assert.equal(v1.prefs.aspect, '9:16', 'unspecified preferences take the default');
  assert.equal(v1.days.a.status, 'ready');

  assert.deepEqual(migrate({ version: 99 }).days, {}, 'an unknown schema resets rather than guessing');
});

test('dayRecord fills defaults for a day never touched', () => {
  const r = dayRecord(loadState(memoryStorage()), '2026-01-01');
  assert.deepEqual(r, {
    edits: {}, locks: [], status: 'idea', variant: 0, sceneMarks: {}, gameCharacters: [],
  });
});

/* ---------- locks ---------- */

test('locked fields survive regeneration while unlocked ones move', () => {
  const rec = week[1];
  const first = buildDayPlan(rec, prefs);

  // Regenerating bumps the variant; the story should change.
  const regenerated = recommendWeek(signals, prefs, { weekStart: WEEK, variants: { [rec.date]: 4 } })[1];
  const second = buildDayPlan(regenerated, prefs);

  // With the story locked, the caller passes the original seed back in.
  const locked = buildDayPlan(regenerated, prefs, {
    locks: ['story'], edits: { seed: first.scenes.length ? rec.seed : undefined },
  });
  assert.equal(locked.story.premise, first.story.premise, 'a locked story is preserved verbatim');
  assert.ok(LOCKABLE.includes('story'));
  assert.ok(second.meta.variant === 4);
});

/* ---------- export ---------- */

test('day Markdown preserves every section and both prompt sets', () => {
  const plan = buildDayPlan(week[0], prefs);
  const md = dayMarkdown(plan);

  for (const heading of ['## Strategy', '## Story', '## Character bible', '## Scene storyboard',
    '## Image prompts', '## Image-to-video prompts', '## Audio and editing', '## Publishing package']) {
    assert.ok(md.includes(heading), `export contains ${heading}`);
  }
  for (const s of plan.scenes) {
    assert.ok(md.includes(`Scene ${s.n} — ${s.beatLabel}`), `scene ${s.n} is in the storyboard`);
    assert.ok(md.includes(s.imagePrompt), `scene ${s.n} image prompt exported in full`);
    assert.ok(md.includes(s.videoPrompt), `scene ${s.n} video prompt exported in full`);
  }
  assert.ok(md.includes(plan.cast[0].identityLock), 'the identity lock travels with the export');
});

test('week Markdown and JSON round-trip the whole plan', () => {
  const plans = week.map((r) => buildDayPlan(r, prefs));
  const md = weekMarkdown(plans, WEEK);
  for (const p of plans) assert.ok(md.includes(`${p.dayName} ${p.date}`), `${p.dayName} is in the week export`);

  const parsed = JSON.parse(weekJson(plans, WEEK, prefs));
  assert.equal(parsed.weekStart, WEEK);
  assert.equal(parsed.days.length, 7);
  assert.equal(parsed.days[0].scenes.length, plans[0].scenes.length);
  assert.ok(parsed.days[0].scenes[0].imagePrompt.length > 0);
  assert.equal(parsed.preferences.aspect, '9:16');
});

test('the character bible exports on its own', () => {
  const plan = buildDayPlan(week[0], prefs);
  const md = castMarkdown(plan);
  for (const c of plan.cast) {
    assert.ok(md.includes(c.name) && md.includes(c.outfit) && md.includes(c.identityLock));
  }
});

/* ---------- content integrity ---------- */

test('no pillar seed names a real creator or branded character', () => {
  const banned = ['junell', 'hawks rbx', 'clutchmaker', 'jojo coreblox', 'dr. harlow', 'harlow',
    'bacon', 'minecraft', 'disney', 'pixar'];
  for (const p of PILLARS) {
    for (const s of p.seeds) {
      const blob = JSON.stringify(s).toLowerCase();
      for (const name of banned) {
        assert.ok(!blob.includes(name), `${p.id}/${s.id} avoids "${name}"`);
      }
    }
  }
});

test('every pillar has enough seeds for regeneration to mean something', () => {
  for (const p of PILLARS) {
    assert.ok(p.seeds.length >= 3, `${p.id} offers at least three concepts`);
    for (const s of p.seeds) {
      for (const f of ['premise', 'conflict', 'escalation', 'turn', 'payoff', 'loop', 'setting']) {
        assert.ok(s[f] && s[f].length > 10, `${p.id}/${s.id} has a real ${f}`);
      }
      assert.ok(s.roles.length >= 1 && s.props.length >= 1);
    }
  }
  assert.equal(THEMES.length, PILLARS.filter((p) => p.match.length > 0).length);
});

test('every seed carries a spoken line and an on-screen caption for all five beats', () => {
  const beats = ['hook', 'setup', 'escalation', 'turn', 'payoff'];
  for (const p of PILLARS) {
    for (const s of p.seeds) {
      assert.ok(s.lines, `${s.id} has a line table`);
      assert.ok(s.captions, `${s.id} has a caption table`);
      for (const b of beats) {
        assert.equal(typeof s.lines[b], 'string', `${s.id}.lines.${b} is authored`);
        assert.ok(s.captions[b] && s.captions[b].trim().length > 0,
          `${s.id}.captions.${b} carries real text`);
        // A caption is text the editor burns in, so it has to be short enough
        // to read in a single beat on a phone.
        assert.ok(s.captions[b].split(/\s+/).length <= 6, `${s.id}.captions.${b} stays short`);
      }
      // A seed with nothing spoken anywhere is allowed, but only deliberately.
      const spoken = beats.filter((b) => s.lines[b].trim().length > 0);
      assert.ok(spoken.length > 0 || /no dialogue|on-screen text/i.test(s.premise),
        `${s.id} is only silent throughout if the premise says so`);
    }
  }
});

test('dialogue is speech, never the stage direction or the caption', () => {
  for (const rec of week) {
    const plan = buildDayPlan(rec, prefs);
    for (const s of plan.scenes) {
      if (s.dialogue === '—') continue;
      assert.notEqual(s.dialogue, s.action, `scene ${s.n} does not speak its own action`);
      assert.ok(!s.action.startsWith(s.dialogue),
        `scene ${s.n} dialogue is not a truncated action line`);
      assert.notEqual(s.dialogue, s.onScreenText,
        `scene ${s.n} does not say the words already on screen`);
      // Anything a character says has to fit inside its own scene.
      assert.ok(s.dialogue.split(/\s+/).length <= 12, `scene ${s.n} line is speakable in ${s.durationSec}s`);
    }
  }
});

test('no line and no caption is used twice in the same video', () => {
  for (const rec of week) {
    const plan = buildDayPlan(rec, prefs);
    const spoken = plan.scenes.map((s) => s.dialogue).filter((d) => d !== '—');
    const shown = plan.scenes.map((s) => s.onScreenText).filter((t) => t !== '—');
    assert.equal(new Set(spoken).size, spoken.length, `${rec.date} repeats no dialogue`);
    assert.equal(new Set(shown).size, shown.length, `${rec.date} repeats no caption`);
  }
});

test('a silent scene tells the generator to keep the mouth closed', () => {
  const plan = buildDayPlan(week[0], prefs);
  for (const s of plan.scenes) {
    const prompt = videoPrompt(s, plan.cast, { platform: 'veo' });
    if (s.dialogue === '—') {
      assert.match(prompt, /does not speak/);
      assert.match(prompt, /Do not generate any mouth movement/);
    } else {
      assert.ok(prompt.includes(`"${s.dialogue}"`), `scene ${s.n} carries its line verbatim`);
      assert.match(prompt, /deliver the dialogue exactly once/);
    }
  }
});

test('the caption list covers only the scenes that actually carry text', () => {
  const plan = buildDayPlan(week[0], prefs);
  const withText = plan.scenes.filter((s) => s.onScreenText !== '—');
  assert.equal(plan.audio.captions.length, withText.length);
  for (const c of plan.audio.captions) {
    assert.notEqual(c.text, '—');
    assert.ok(c.emphasis.length > 0, `caption at ${c.at} has a word to emphasise`);
  }
});

test('turning dialogue off silences every scene without emptying the captions', () => {
  const silent = buildDayPlan(week[0], { ...prefs, dialogue: false });
  assert.ok(silent.scenes.every((s) => s.dialogue === '—'));
  assert.ok(silent.scenes.some((s) => s.onScreenText !== '—'),
    'a silent video still carries burned-in text');
  assert.match(silent.audio.voiceover, /No voiceover/);
});

test('consecutive scenes in the same beat do not repeat the same frame', () => {
  for (const rec of week) {
    const plan = buildDayPlan(rec, prefs);
    for (let i = 1; i < plan.scenes.length; i += 1) {
      const a = plan.scenes[i - 1];
      const b = plan.scenes[i];
      if (a.beat !== b.beat) continue;
      assert.notEqual(`${a.framing}|${a.angle}|${a.movement}`, `${b.framing}|${b.angle}|${b.movement}`,
        `${rec.date} scene ${b.n} cuts to a different frame than scene ${a.n}`);
      assert.notEqual(a.action, b.action, `${rec.date} scene ${b.n} advances the beat`);
    }
  }
});

/* ---------- Roblox visual language ---------- */

test('every image prompt states it is a Roblox scene before anything else', () => {
  const plan = buildDayPlan(week[0], prefs);
  for (const s of plan.scenes) {
    const head = s.imagePrompt.slice(0, 400);
    assert.match(head, /inside the video game Roblox/,
      `scene ${s.n} names the world in its opening lines`);
    assert.match(s.imagePrompt, /AVATAR CONSTRUCTION:/);
    assert.match(s.imagePrompt, /flat 2D decal printed on the front surface of the head/);
  }
});

test('prompts forbid the generic-3D drift they used to produce', () => {
  const plan = buildDayPlan(week[0], prefs);
  for (const s of plan.scenes) {
    for (const needle of ['not Pixar style', 'not a realistic human', 'no sculpted facial features',
      'no individual hair strands', 'no skin texture or pores']) {
      assert.ok(s.imagePrompt.includes(needle), `scene ${s.n} rules out "${needle}"`);
      assert.ok(s.videoPrompt.includes(needle), `scene ${s.n} video prompt rules out "${needle}"`);
    }
    // The old style string is exactly what produced a Pixar render.
    assert.doesNotMatch(s.imagePrompt, /Premium cinematic 3D game-inspired animation/);
  }
});

test('a video prompt animates rigid parts and a decal, not a face', () => {
  const plan = buildDayPlan(week[0], prefs);
  const p = plan.scenes[0].videoPrompt;
  assert.match(p, /this is a scene inside the video game Roblox/);
  assert.match(p, /separate rigid Roblox parts/);
  assert.match(p, /the face is a printed decal/);
  assert.match(p, /never bend where a Roblox limb cannot/);
});

test('the rig follows the pillar and every rig produces a real spec', () => {
  for (const rig of RIG_OPTIONS) {
    const block = styleBlock({ rig: rig.id, render: 'ingame' });
    assert.match(block, /AVATAR CONSTRUCTION:/);
    assert.ok(block.length > 900, `${rig.id} carries the full construction spec`);
  }
  // Animal Hospital is played with animal-headed avatars, so a plan set there
  // must not describe a plain blocky avatar.
  const rec = week.find((r) => r.pillarId === 'animal-hospital');
  assert.ok(rec, 'the fixture week includes an Animal Hospital day');
  assert.match(buildDayPlan(rec, prefs).scenes[0].imagePrompt,
    /Roblox avatar rig wearing a large moulded animal head/);

  // Pinning a rig in preferences overrides the pillar's default.
  assert.match(buildDayPlan(rec, { ...prefs, avatarRig: 'r6' }).scenes[0].imagePrompt,
    /Classic R6 avatar construction/);
});

test('render presets change only the lighting, never the geometry', () => {
  for (const preset of RENDER_OPTIONS) {
    const block = styleBlock({ rig: 'r15', render: preset.id });
    assert.match(block, /RENDER:/);
    // Whatever the treatment, the construction rules are still in the prompt.
    assert.match(block, /flat 2D decal/);
    assert.match(block, /separate solid parts|rigid solid/);
  }
});

test('characters are described the way Roblox builds, not the way people look', () => {
  for (const roleKey of ['vet', 'intern', 'kid', 'noob', 'pro']) {
    const c = buildCharacter(roleKey, 'x');
    assert.match(`${c.head} ${c.faceDecal}`, /head|decal|printed/i);
    assert.match(c.faceDecal, /printed/i, `${roleKey}'s face is a decal`);
    assert.ok(['r6', 'r15', 'rthro', 'animal'].includes(c.rig), `${roleKey} names a real rig`);
    // The vocabulary that produced Pixar characters.
    const blob = `${c.head} ${c.faceDecal} ${c.hair} ${c.outfit}`.toLowerCase();
    for (const banned of ['smile lines', 'freckles', 'pores', 'strand of hair', 'soft jaw']) {
      assert.ok(!blob.includes(banned), `${roleKey} avoids "${banned}"`);
    }
  }
});

test('every concept is staged somewhere that exists in a Roblox world', () => {
  for (const p of PILLARS) {
    for (const s of p.seeds) {
      assert.match(s.setting,
        /roblox|obby|animal hospital|baseplate|hide-and-seek|spawn|lobby/i,
        `${s.id} is staged in a Roblox place`);
      assert.ok(s.props.length >= 2, `${s.id} names props that can be built from parts`);
    }
  }
});

/* ---------- game characters ---------- */

test('the game-character library records what the character actually does', () => {
  const harlow = gameCharacterById('dr-harlow');
  assert.ok(harlow, 'Dr. Harlow is in the library');
  assert.equal(harlow.gameLabel, 'Animal Hospital');
  for (const needle of ['head doctor', 'mentor', 'supervisor', 'lobby', 'Supplies Shop',
    'performance report', 'emergencies']) {
    assert.ok(harlow.lore.toLowerCase().includes(needle.toLowerCase()),
      `the lore records "${needle}"`);
  }
  assert.ok(harlow.beats.length >= 3, 'the library suggests beats he can carry');
  for (const c of GAME_CHARACTERS) {
    assert.ok(c.usageNote.length > 40, `${c.id} says how it may be used`);
    assert.ok(c.game && c.gameLabel, `${c.id} names the game it belongs to`);
  }
});

test('casting a game character replaces its role rather than duplicating it', () => {
  const plain = buildDayPlan(week[0], prefs);
  const cast = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });

  assert.equal(cast.cast[0].name, 'Dr. Harlow', 'the guest leads the cast');
  assert.equal(cast.cast.filter((c) => c.roleKey === 'vet').length, 1, 'one head doctor, not two');
  assert.equal(cast.cast.length, plain.cast.length, 'the cast does not grow');
  assert.ok(!cast.cast.some((c) => c.name === 'Dr. Wren'), 'the generated vet steps aside');
});

test('a cast game character is prompted as a fan interpretation, with a full identity lock', () => {
  const plan = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  const harlow = plan.cast[0];

  // A supplied lock is used verbatim rather than rebuilt from summary fields.
  assert.equal(harlow.identityLock, gameCharacterById('dr-harlow').identityLock);
  assert.match(harlow.identityLock, /PERMANENT IDENTITY LOCK — Dr\. Harlow/);
  for (const element of ['deer head shape', 'orange facial markings', 'grey antler silhouette',
    'circular forehead reflector', 'electric-blue surgical mask', 'red tie', 'stethoscope',
    'royal-blue trousers', 'golden-orange hands', 'TOP SECRET briefcase held in his right hand']) {
    assert.ok(harlow.identityLock.includes(element), `the lock names the ${element}`);
  }
  assert.match(harlow.identityLock, /Do not replace, age, humanize, beautify, restyle, recolor or redesign/);

  const prompt = plan.scenes[0].imagePrompt;
  assert.match(prompt, /A fan interpretation of a character from the Roblox game Animal Hospital/);
  assert.match(prompt, /rather than copying any official asset/);
});

test('a character with a build sheet prints the whole sheet in every scene prompt', () => {
  const plan = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  const sheet = gameCharacterById('dr-harlow').spec;
  assert.ok(sheet.length >= 8, 'the sheet is sectioned');

  for (const scene of plan.scenes) {
    for (const [title, lines] of sheet) {
      assert.ok(scene.imagePrompt.includes(`${title.toUpperCase()}:`),
        `scene ${scene.n} prints the "${title}" section`);
      for (const line of lines) {
        assert.ok(scene.imagePrompt.includes(line.replace(/\.$/, '')),
          `scene ${scene.n} carries "${line.slice(0, 40)}…"`);
      }
    }
    assert.ok(scene.imagePrompt.includes(plan.cast[0].identityLock),
      `scene ${scene.n} repeats the permanent lock verbatim`);
  }
});

test('a character’s own negatives ride along in every prompt it appears in', () => {
  const plain = buildDayPlan(week[0], prefs);
  const withHarlow = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  const specific = ['no visible mouth', 'no missing antlers', 'no suitcase in the wrong hand',
    'no ordinary brown suitcase', 'no altered briefcase label', 'no miner’s lamp'];

  for (const needle of specific) {
    assert.ok(withHarlow.scenes[0].imagePrompt.includes(needle), `image prompt carries "${needle}"`);
    assert.ok(withHarlow.scenes[0].videoPrompt.includes(needle), `video prompt carries "${needle}"`);
    assert.ok(!plain.scenes[0].imagePrompt.includes(needle),
      `"${needle}" only appears when he is in frame`);
  }
  // The shared negatives are still there underneath, and nothing is listed twice.
  const list = withHarlow.scenes[0].imagePrompt.match(/NEGATIVE PROMPT: (.+)\.$/m)[1].split(', ');
  assert.ok(list.includes('not Pixar style'));
  assert.equal(new Set(list).size, list.length, 'no negative is repeated');
});

test('the reference sheet is a full-body front-on render, not a scene', () => {
  const sheet = referenceSheetPrompt(gameCharacterById('dr-harlow'));
  assert.match(sheet, /character reference sheet for Dr\. Harlow/);
  assert.match(sheet, /inside the video game Roblox/);
  assert.match(sheet, /HEAD AND FACE\n/);
  assert.match(sheet, /COLOUR LOCK\n/);
  assert.match(sheet, /Full-body character visible from antler tips to shoes/);
  assert.match(sheet, /Clean dark navy background/);
  assert.match(sheet, /PERMANENT IDENTITY LOCK/);
  // Framing rules that only make sense for a sheet, and must not leak into scenes.
  for (const needle of ['no cropped feet', 'no side view', 'no action pose', 'no environment clutter']) {
    assert.ok(sheet.includes(needle), `the sheet rules out "${needle}"`);
  }
  const plan = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  assert.ok(!plan.scenes[0].imagePrompt.includes('no action pose'),
    'a scene prompt is not constrained to a neutral pose');
});

test('a game character carries every field the character bible renders', () => {
  const generated = buildCharacter('vet', 'x');
  const guest = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] }).cast[0];
  // The bible renders one card for either kind, so a guest missing a field is a
  // thrown TypeError in the workspace rather than a blank line.
  for (const field of Object.keys(generated)) {
    assert.ok(field in guest, `a game character carries "${field}"`);
  }
  for (const field of ['mustNotChange', 'mayChange', 'negatives']) {
    assert.ok(Array.isArray(guest[field]) && guest[field].length > 0,
      `${field} is a populated list`);
  }
});

test('game characters persist per day, not across the whole week', () => {
  let state = loadState(memoryStorage());
  state = setDay(state, '2026-08-29', { gameCharacters: ['dr-harlow'] });
  assert.deepEqual(dayRecord(state, '2026-08-29').gameCharacters, ['dr-harlow']);
  assert.deepEqual(dayRecord(state, '2026-08-30').gameCharacters, [],
    'another day is unaffected');
});

test('every game world names real locations and buildable props', () => {
  for (const w of GAME_WORLDS) {
    assert.ok(w.locations.length >= 3, `${w.id} names somewhere to stage a scene`);
    assert.ok(w.props.length >= 3, `${w.id} names props`);
    assert.ok(['r6', 'r15', 'rthro', 'animal'].includes(w.rig), `${w.id} names a real rig`);
  }
  assert.equal(worldById('animal-hospital').rig, 'animal');
});

test('exports carry the Roblox character fields, never an undefined', () => {
  const plan = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  for (const text of [castMarkdown(plan), dayMarkdown(plan), weekMarkdown([plan], WEEK)]) {
    assert.ok(!text.includes('undefined'), 'no field renders as undefined');
    assert.match(text, /Printed face/);
    assert.match(text, /Headwear/);
  }
  assert.match(castMarkdown(plan), /Dr\. Harlow/);
  assert.ok(!weekJson([plan], WEEK, prefs).includes('"face"'),
    'the old human-face field is gone from the JSON too');
});

test('displacing a character removes them from everyone else’s height notes', () => {
  const plain = buildDayPlan(week[0], prefs);
  const displaced = plain.cast.find((c) => c.roleKey === 'vet').name;

  const withGuest = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  assert.ok(!withGuest.cast.some((c) => c.name === displaced),
    `${displaced} is no longer in the cast`);

  for (const c of withGuest.cast) {
    assert.ok(c.heightNote, `${c.name} has a relative height`);
    assert.ok(!c.heightNote.includes(displaced),
      `${c.name} is not measured against ${displaced}, who is not in the video`);
    const others = withGuest.cast.filter((o) => o.name !== c.name).map((o) => o.name);
    assert.ok(others.some((n) => c.heightNote.includes(n)),
      `${c.name} is measured against someone who is actually in frame`);
  }

  // The guest is the senior vet, so the cast reads tallest-last as before.
  assert.match(withGuest.cast.find((c) => c.name === 'Dr. Harlow').heightNote, /Tallest of the cast/);
});

/* ---------- a cast guest reaches the whole plan ---------- */

test('casting a game character changes the story, not just the pictures', () => {
  const plain = buildDayPlan(week[0], prefs);
  const guested = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  const beat = gameCharacterById('dr-harlow').storyBeat;

  const target = guested.scenes.filter((s) => s.beat === beat.beat).pop();
  assert.ok(target, 'the beat he owns exists in the storyboard');
  assert.ok(target.action.includes('performance report'),
    'his beat is written into the action');
  assert.equal(target.dialogue, beat.line, 'he speaks his own line');
  assert.equal(target.onScreenText, beat.caption, 'and carries his own caption');

  const plainTarget = plain.scenes.filter((s) => s.beat === beat.beat).pop();
  assert.ok(!plainTarget.action.includes('performance report'),
    'none of that happens when he is not cast');
});

test('a seed that already has him arriving does not have him arrive twice', () => {
  const guested = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  const payoff = guested.scenes[guested.scenes.length - 1];
  const arrivals = (payoff.action.match(/arrives/g) ?? []).length;
  assert.ok(arrivals <= 1, `the payoff has him arrive once, not ${arrivals} times`);
  assert.ok(payoff.action.includes('performance report'), 'and still delivers his beat');
});

test('the story names the cast instead of saying "the vet"', () => {
  const plan = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  const prose = plan.scenes.map((s) => s.action).join(' ');
  for (const generic of ['the vet ', 'The vet ', 'the intern ', 'The intern ']) {
    assert.ok(!prose.includes(generic), `the storyboard does not say "${generic.trim()}"`);
  }
  assert.ok(plan.scenes.some((s) => s.action.includes('Dr. Harlow')),
    'it names him instead');
});

test('publishing leads with the recognisable character and stays publishable', () => {
  const plan = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  const pub = plan.publishing;

  assert.ok(pub.recommendedTitle.startsWith('Dr. Harlow'), 'he leads the recommended title');
  assert.ok(pub.recommendedTitle.length <= 80, 'and it fits');
  assert.ok(!pub.recommendedTitle.includes('…'), 'a recommended title is never truncated');
  assert.ok(pub.hashtags.includes('#drharlow') && pub.hashtags.includes('#animalhospital'));
  assert.match(pub.longCaption, /Dr\. Harlow from Animal Hospital/);

  // Across the whole week, guest or not, a title is chosen to fit rather than
  // trimmed — a truncated title is not one anyone can publish, and a trimmed
  // "— until…" promises a second half that is not there.
  for (const guests of [[], ['dr-harlow']]) {
    for (const rec of week) {
      for (const t of buildDayPlan(rec, prefs, { gameCharacters: guests }).publishing.titles) {
        assert.ok(t.text.length <= 80, `${rec.date} ${t.style} fits: ${t.text}`);
        assert.ok(!t.text.includes('…'), `${rec.date} ${t.style} is not truncated: ${t.text}`);
      }
    }
  }
  // The article bug: "Part of a animal hospital series".
  assert.ok(!buildDayPlan(week[0], prefs).publishing.longCaption.includes('a animal'));
});

test('the video prompt carries the same build sheet the image prompt does', () => {
  const plan = buildDayPlan(week[0], prefs, { gameCharacters: ['dr-harlow'] });
  for (const s of plan.scenes) {
    for (const [title] of gameCharacterById('dr-harlow').spec) {
      assert.ok(s.videoPrompt.includes(`${title.toUpperCase()}:`),
        `scene ${s.n}'s video prompt carries "${title}"`);
    }
  }
});
