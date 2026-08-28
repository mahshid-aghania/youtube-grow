/**
 * Data-informed recommendation engine.
 *
 * Rule-based and deterministic: the same week start, preferences and variant
 * always produce the same plan, so a reload never silently rewrites the user's
 * week. There is no model here and the interface must not call it AI — it is
 * pattern matching against the loaded dataset plus a template library.
 *
 * Every recommendation carries an explicit support level:
 *   data-supported   the format is measurably present in the tracked window
 *   pattern-inspired the format appears, but too thinly to lean on
 *   experimental     nothing in the data speaks to it; it is a deliberate test
 */

import { PILLARS, pillarById } from './pillars.js';

/** Deterministic 32-bit hash of a string, for seeding. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Small deterministic PRNG. Same seed, same sequence, every time. */
export function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * The seven strategic roles a balanced week fills.
 *
 * Ordered deliberately: the week opens on the strongest evidence and closes on
 * the experiment, so a format test never occupies the highest-attention slot.
 */
export const WEEK_SLOTS = [
  { id: 'proven-theme', label: 'Proven theme', intent: 'Lead with the format most present in the data.' },
  { id: 'comparison', label: 'Comparison', intent: 'A contrast structure that reads in the first second.' },
  { id: 'recurring', label: 'Recurring character', intent: 'Build the character viewers come back for.' },
  { id: 'comedy', label: 'Comedy', intent: 'A lighter beat to vary the week\'s emotional register.' },
  { id: 'emotional', label: 'Emotional story', intent: 'Trade laughs for a payoff that earns a follow.' },
  { id: 'proven-format', label: 'Proven format, new story', intent: 'Re-use a working shape with an original premise.' },
  { id: 'experimental', label: 'Experimental', intent: 'A deliberate test placed where a miss costs least.' },
];

/** Which pillars can fill each slot, in order of preference. */
const SLOT_PILLARS = {
  'proven-theme': ['animal-hospital', 'challenge', 'family-comedy'],
  comparison: ['comparison'],
  recurring: ['animal-hospital', 'mystery', 'transformation'],
  comedy: ['troll-prank', 'family-comedy', 'hide-and-seek'],
  emotional: ['tiny-rescue', 'transformation', 'animal-hospital'],
  'proven-format': ['challenge', 'hide-and-seek', 'mystery', 'transformation'],
  experimental: ['experimental'],
};

/**
 * Rank pillars by how strongly the tracked window supports them.
 *
 * A pillar scores on presence in the whole window and, weighted higher, on
 * presence among the fastest-moving quarter — that is the closest the data
 * gets to "working right now".
 */
export function rankPillars(signals) {
  const overall = new Map(signals.themes.map((t) => [t.id, t]));
  const momentum = new Map(signals.momentumThemes.map((t) => [t.id, t]));

  return PILLARS.map((pillar) => {
    const all = overall.get(pillar.id);
    const fast = momentum.get(pillar.id);
    return {
      id: pillar.id,
      label: pillar.label,
      count: all?.count ?? 0,
      share: all?.share ?? 0,
      momentumCount: fast?.count ?? 0,
      examples: (fast?.examples?.length ? fast.examples : all?.examples) ?? [],
      score: (all?.count ?? 0) + (fast?.count ?? 0) * 2,
    };
  }).sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

/**
 * Classify how well the data backs a pillar, and say so in words the interface
 * can print verbatim.
 */
export function supportFor(pillar, signals) {
  const ranked = rankPillars(signals).find((r) => r.id === pillar.id);
  const total = signals.sampleSize || 0;

  if (!ranked || ranked.count === 0) {
    return {
      level: 'experimental',
      label: 'Experimental',
      evidence: 'Nothing in the tracked window matches this format. Treat it as a deliberate test.',
    };
  }

  const pct = total > 0 ? Math.round((ranked.count / total) * 100) : 0;
  const example = ranked.examples[0];

  if (ranked.count >= 3 && ranked.momentumCount >= 1) {
    return {
      level: 'data-supported',
      label: 'Data-supported',
      evidence: `${ranked.label} matches ${ranked.count} of ${total} tracked Shorts (${pct}%), `
        + `including ${ranked.momentumCount} among the fastest-moving quarter by views per hour.`,
      example,
    };
  }

  return {
    level: 'pattern-inspired',
    label: 'Pattern-inspired',
    evidence: `${ranked.label} matches ${ranked.count} of ${total} tracked Shorts (${pct}%) — `
      + 'present, but too thin a sample to lean on.',
    example,
  };
}

/** Duration in seconds for a day, from preferences or the observed data. */
export function targetDuration(prefs, signals) {
  if (prefs?.durationMode === 'fixed' && Number.isFinite(prefs.durationSec)) {
    return {
      seconds: Math.max(6, Math.min(60, Math.round(prefs.durationSec))),
      basis: 'Set in your strategy preferences.',
    };
  }
  const band = signals.momentumBand ?? signals.leadingBand;
  if (band) {
    const mid = Math.round((band.min + band.max) / 2);
    return {
      seconds: Math.max(8, Math.min(45, mid)),
      basis: `${band.count} of ${signals.sampleSize} tracked Shorts fall in the ${band.label} band.`,
    };
  }
  return { seconds: 22, basis: 'No duration signal available; using a mid-range Shorts default.' };
}

/** Date arithmetic in UTC, so a plan does not shift across timezones. */
export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The publishing dates for a week, honouring the preferred posting days. */
export function weekDates(weekStart, prefs) {
  const dates = [];
  for (let i = 0; i < 7; i += 1) {
    const iso = addDays(weekStart, i);
    const dayName = DAY_NAMES[new Date(`${iso}T00:00:00Z`).getUTCDay()];
    if (prefs?.postingDays?.length && !prefs.postingDays.includes(dayName)) continue;
    dates.push({ iso, dayName });
  }
  return dates;
}

/**
 * Choose the pillar for a slot, avoiding pillars already used this week.
 *
 * Falls back through the slot's candidate list, then to the best-supported
 * unused pillar, so a week never repeats a format just because the preferred
 * one was taken.
 */
function pickPillar(slotId, ranked, used, prefs) {
  const allowed = (id) => {
    if (used.has(id)) return false;
    if (prefs?.pillars?.length && !prefs.pillars.includes(id)) return false;
    return true;
  };

  for (const id of SLOT_PILLARS[slotId] ?? []) {
    if (allowed(id)) return pillarById(id);
  }
  const fallback = ranked.find((r) => allowed(r.id));
  if (fallback) return pillarById(fallback.id);

  // Every pillar is used or excluded: reuse the slot's first choice rather
  // than leaving the day empty.
  const first = (SLOT_PILLARS[slotId] ?? [])[0] ?? ranked[0]?.id;
  return pillarById(first) ?? PILLARS[0];
}

/**
 * Build the week's recommendations.
 *
 * @param {object} signals  from buildSignals()
 * @param {object} prefs    user preferences
 * @param {object} opts     { weekStart: 'YYYY-MM-DD', variants: { [iso]: number } }
 */
export function recommendWeek(signals, prefs, { weekStart, variants = {} } = {}) {
  const ranked = rankPillars(signals);
  const dates = weekDates(weekStart, prefs);
  const used = new Set();

  return dates.map((date, index) => {
    const slot = WEEK_SLOTS[index % WEEK_SLOTS.length];
    const pillar = pickPillar(slot.id, ranked, used, prefs);
    used.add(pillar.id);

    // The variant offsets the seed rather than reseeding the generator: with a
    // handful of seeds per pillar, reseeding could land on the same concept and
    // make "Regenerate" do nothing. Offsetting guarantees a different concept
    // every time and cycles back to the original after a full round.
    const variant = variants[date.iso] ?? 0;
    const rand = makeRandom(hashString(`${weekStart}|${date.iso}|${pillar.id}`));
    const base = Math.floor(rand() * pillar.seeds.length);
    const seed = pillar.seeds[(base + variant) % pillar.seeds.length];

    const support = supportFor(pillar, signals);
    const duration = targetDuration(prefs, signals);
    const sceneCount = sceneCountFor(duration.seconds, signals);

    return {
      date: date.iso,
      dayName: date.dayName,
      slot,
      pillarId: pillar.id,
      pillarLabel: pillar.label,
      emotion: pillar.emotion,
      audience: prefs?.audience || pillar.audience,
      difficulty: pillar.difficulty,
      seedId: seed.id,
      seed,
      support,
      duration,
      sceneCount,
      variant,
      productionMinutes: estimateProductionMinutes(sceneCount, pillar.difficulty),
      rationale: `${slot.intent} ${support.evidence}`,
    };
  });
}

/**
 * How many scenes a runtime should carry.
 *
 * Prefers the median scene length actually observed in the shot lists; falls
 * back to a 3.5-second average when no shot list has been recorded.
 */
export function sceneCountFor(seconds, signals) {
  const perScene = signals?.scenes?.available && signals.scenes.medianSceneSec > 0
    ? signals.scenes.medianSceneSec
    : 3.5;
  return Math.max(3, Math.min(9, Math.round(seconds / perScene)));
}

/** A rough production estimate, stated as a range in the interface. */
export function estimateProductionMinutes(sceneCount, difficulty) {
  const perScene = { Easy: 8, Moderate: 12, Advanced: 18 }[difficulty] ?? 12;
  return sceneCount * perScene + 20;
}
