/**
 * Plan assembly and the schema everything else agrees on.
 *
 * A DayPlan is the complete production package for one day: strategy, story,
 * cast, scenes, prompts, audio and publishing. It is derived, not stored — the
 * only things persisted are preferences, user edits, locks and status, so a
 * template improvement reaches every existing plan.
 */

import { buildCast } from './characters.js';
import { buildTimeline, buildScenes, timelineSummary } from './story.js';
import { imagePrompt, videoPrompt } from './prompts.js';
import { audioPlan, publishingPackage } from './publishing.js';
import { pillarById } from './pillars.js';
import { gameCharacterById, toCastMember, worldsForPillar } from './games.js';
import { identityLock } from './characters.js';

/** A cast member needs its lock compiled before any prompt repeats it. */
const withIdentityLock = (c) => ({ ...c, identityLock: identityLock(c) });

export const PRODUCTION_STATUSES = [
  { id: 'idea', label: 'Idea' },
  { id: 'drafted', label: 'Drafted' },
  { id: 'generating', label: 'Generating' },
  { id: 'editing', label: 'Editing' },
  { id: 'ready', label: 'Ready' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
];

/**
 * Fields a user can lock so regeneration leaves them alone.
 *
 * Only fields regeneration actually changes appear here — a lock for something
 * that cannot move would be a control that does nothing. Regeneration keeps the
 * day's pillar and re-rolls the concept, so the pillar needs no lock.
 */
export const LOCKABLE = ['story', 'cast', 'title', 'caption', 'hashtags'];

/**
 * Build the complete production package for one recommendation.
 *
 * @param {object} rec       one entry from recommendWeek()
 * @param {object} prefs     user preferences
 * @param {object} overrides { edits, locks, status, savedCharacters, sceneMarks }
 */
export function buildDayPlan(rec, prefs, overrides = {}) {
  const { edits = {}, savedCharacters = {} } = overrides;
  const pillar = pillarById(rec.pillarId);
  const seed = edits.seed ?? rec.seed;

  const seconds = edits.durationSec ?? rec.duration.seconds;
  const sceneCount = edits.sceneCount ?? rec.sceneCount;

  // A locked cast is restored verbatim; otherwise it is rebuilt, with saved
  // characters winning over generated ones so a recurring character keeps the
  // identity the user established.
  const generatedCast = Array.isArray(edits.cast) && edits.cast.length
    ? edits.cast
    : buildCast(seed, `${rec.date}|${seed.id}|${rec.variant}`, savedCharacters);

  // Game characters cast for this day lead the list: they are the recognisable
  // face of the video, and the first cast member is who the framing and the
  // publishing package build around.
  const guests = (overrides.gameCharacters ?? [])
    .map((id) => gameCharacterById(id))
    .filter(Boolean)
    .map((entry) => withIdentityLock(toCastMember(entry)));

  // A guest that fills a story role displaces the generated character in it, so
  // casting Dr. Harlow gives you one head doctor rather than two.
  const taken = new Set(guests.map((g) => g.replacesRole).filter(Boolean));
  const cast = guests.length
    ? [...guests, ...generatedCast.filter((c) => !taken.has(c.roleKey)
        && !guests.some((g) => g.name === c.name))]
    : generatedCast;

  const timeline = buildTimeline(seconds, sceneCount);
  const scenes = buildScenes(seed, cast, timeline, {
    dialogue: prefs.dialogue !== false,
    language: prefs.language,
  });

  // The scene's rig comes from the game world this pillar is set in — the world
  // sets the visual baseline, not whoever happens to be first in the cast. A
  // character carrying its own rig still describes it in its own block, so an
  // animal-headed vet can share an R15 frame with a blocky kid. A pinned
  // preference beats both.
  const world = worldsForPillar(rec.pillarId)[0];
  const rig = prefs.avatarRig && prefs.avatarRig !== 'auto'
    ? prefs.avatarRig
    : (world?.rig ?? cast[0]?.rig ?? 'r15');

  const promptOpts = {
    platform: prefs.imagePlatform,
    rig,
    render: prefs.renderStyle,
    aspect: prefs.aspect,
  };
  const videoOpts = { platform: prefs.videoPlatform };

  const scenesWithPrompts = scenes.map((s) => ({
    ...s,
    imagePrompt: imagePrompt(s, cast, promptOpts),
    videoPrompt: videoPrompt(s, cast, videoOpts),
    generated: overrides.sceneMarks?.[s.n]?.generated ?? false,
    animated: overrides.sceneMarks?.[s.n]?.animated ?? false,
  }));

  const publishing = publishingPackage(rec, seed, cast, prefs);

  return {
    id: `${rec.date}`,
    date: rec.date,
    dayName: rec.dayName,
    status: overrides.status ?? 'idea',
    locks: overrides.locks ?? [],

    strategy: {
      pillarId: rec.pillarId,
      pillarLabel: rec.pillarLabel,
      slot: rec.slot,
      objective: rec.slot.intent,
      audience: prefs.audience || rec.audience,
      emotion: edits.emotion ?? rec.emotion,
      durationSec: seconds,
      durationBasis: rec.duration.basis,
      sceneCount,
      difficulty: rec.difficulty,
      productionMinutes: rec.productionMinutes,
      support: rec.support,
      hookType: 'Situation-first — the problem is visible in frame one, before any exposition',
      retention: 'Each scene raises the cost of leaving; the turn pays the question the hook asked',
      midpoint: seed.escalation,
      payoff: seed.payoff,
      loop: seed.loop,
      whyThisDay: `${rec.dayName} is the week's ${rec.slot.label.toLowerCase()} slot. ${rec.slot.intent}`,
      whyItHolds: 'The opening frame states the situation without narration, the middle raises a visible '
        + 'cost, and the turn resolves the exact question the first second asked. Attention is held by '
        + 'structure — execution, audience fit, timing and platform distribution all still decide the result.',
    },

    story: {
      premise: seed.premise,
      conflict: seed.conflict,
      escalation: seed.escalation,
      turn: seed.turn,
      payoff: seed.payoff,
      loop: seed.loop,
      setting: seed.setting,
      props: seed.props,
      timeline: timelineSummary(scenes),
    },

    cast,
    scenes: scenesWithPrompts,
    audio: audioPlan(scenes, seed, { dialogue: prefs.dialogue !== false }),
    publishing: {
      ...publishing,
      recommendedTitle: edits.title ?? publishing.recommendedTitle,
      shortCaption: edits.caption ?? publishing.shortCaption,
      hashtags: edits.hashtags ?? publishing.hashtags,
      publishTime: { ...publishing.publishTime, value: edits.publishTime ?? '' },
    },

    meta: {
      pillar: pillar?.label ?? rec.pillarLabel,
      seedId: seed.id,
      variant: rec.variant,
      generatedBy: 'data-informed recommendation engine (rule-based, no model)',
    },
  };
}

/** Total runtime check — the last scene must land exactly on the target. */
export function planRuntime(plan) {
  return plan.scenes.length ? plan.scenes[plan.scenes.length - 1].endSec : 0;
}
