/**
 * Audio, editing and publishing packages.
 *
 * Titles and captions are built from the concept, not from a claim about
 * performance. Nothing here predicts views, promises reach, or names a
 * copyrighted track — music is described as a style brief instead.
 */

import { hashString, makeRandom } from './recommend.js';

/** The editing guide, derived from the scene list. */
export function audioPlan(scenes, seed, opts = {}) {
  const spoken = scenes.filter((s) => s.dialogue && s.dialogue !== '—');
  const turn = scenes.find((s) => s.beat === 'turn') ?? scenes[Math.floor(scenes.length / 2)];
  const last = scenes[scenes.length - 1];

  return {
    voiceover: opts.dialogue === false
      ? 'No voiceover. The story is carried by action and on-screen text — every beat must read with '
        + 'the sound off.'
      : 'One voice, conversational, recorded close. No introduction, no sign-off, no channel name.',
    dialogue: spoken.map((s) => ({
      scene: s.n,
      at: `${s.startSec}s`,
      window: `${s.durationSec}s`,
      line: s.dialogue,
      note: `Must finish inside ${s.durationSec}s with room to breathe. Trim the line before rushing it.`,
    })),
    // Only scenes that actually carry burned-in text. A silent frame is a
    // choice, and listing it as an empty caption would invite someone to fill
    // it in.
    captions: scenes.filter((s) => s.onScreenText && s.onScreenText !== '—').map((s) => ({
      scene: s.n,
      at: `${s.startSec}s`,
      text: s.onScreenText,
      emphasis: emphasisWord(s.onScreenText),
    })),
    captionStyle: 'Two lines maximum, large weight, centred in the middle third. Keep captions clear of '
      + 'the bottom 15% where the platform UI sits.',
    soundEffects: scenes.map((s) => ({ scene: s.n, at: `${s.startSec}s`, cue: s.sfx })),
    musicMood: musicBrief(seed),
    musicVolume: 'Music sits 12–15 dB under dialogue. Drop it to silence for the turn, then bring it '
      + 'back for the payoff.',
    transitions: scenes.map((s) => ({ scene: s.n, at: `${s.endSec}s`, cut: s.transition })),
    punchIns: [
      { at: `${turn.startSec}s`, note: 'Punch in 8–12% on the turn — a scale change, not a camera move.' },
    ],
    patternInterrupts: scenes
      .filter((s) => s.beat === 'escalation')
      .map((s) => ({ at: `${s.startSec}s`, note: 'Change framing or sound here so the eye resets.' })),
    finalFrame: `Hold the last frame for ${Math.min(0.8, last.durationSec / 2)}s after the action settles.`,
    loop: `${seed.loop} Cut the final frame so it matches scene 1 in framing and brightness — the join `
      + 'should be hard to spot on replay.',
  };
}

function emphasisWord(text) {
  const words = String(text ?? '').split(/\s+/).filter((w) => w.length > 3);
  return words.length ? words[words.length - 1].replace(/[^\p{L}\p{N}]/gu, '') : '';
}

function musicBrief(seed) {
  const emotion = String(seed.premise ?? '').toLowerCase();
  if (/rescue|stuck|alone|lost/.test(emotion)) {
    return 'Sparse piano or soft plucked strings, slow pulse, no percussion until the payoff. '
      + 'Warm and unhurried — describe this brief to your library rather than using a charting track.';
  }
  if (/prank|copy|troll|swap/.test(emotion)) {
    return 'Light comedic bed — plucked bass, woodblock or hand percussion, playful and fast. '
      + 'Describe this brief to your library rather than using a charting track.';
  }
  return 'Neutral rhythmic bed with a clear pulse, building one layer per beat. '
    + 'Describe this brief to your library rather than using a charting track.';
}

/**
 * Titles, captions, hashtags and the pre-publish checklist.
 *
 * Title patterns are structural — question, contrast, reveal — rather than
 * copies of any observed title.
 */
/** "a" or "an", so a generated caption does not read "a animal hospital series". */
const article = (word) => (/^[aeiou]/i.test(String(word).trim()) ? 'an' : 'a');

export function publishingPackage(rec, seed, cast, opts = {}) {
  const rand = makeRandom(hashString(`${rec.date}|${seed.id}|pub|${rec.variant}`));
  const lead = cast[0]?.name ?? 'the lead';
  // A recognisable character is the strongest thing a title has, so it leads.
  const guest = cast.find((c) => c.fromGame);

  const titles = [
    { style: 'Question', text: titleCase(`${firstClause(seed.conflict)}?`) },
    { style: 'Contrast', text: titleCase(contrastTitle(seed, 80)) },
    { style: 'Character', text: titleCase(`${lead} — ${firstClause(seed.conflict)}`) },
    // A title carrying a recognisable name has less room for the premise, so it
    // takes the shortest clause that still fits rather than being trimmed.
    ...(guest ? [{
      style: 'Recognisable character',
      text: titleCase(`${guest.name} — ${
        fittingClause(guest.name, [seed.turn, seed.conflict, seed.premise], 80)}`),
    }] : []),
  ].map((t) => ({ ...t, text: trimTo(t.text, 80) }));

  // A title naming a character the audience already knows outperforms one that
  // does not, so it is the recommendation whenever there is one.
  const recommended = guest
    ? titles[titles.length - 1]
    : titles[Math.floor(rand() * titles.length) % titles.length];

  const base = ['roblox', 'robloxshorts', 'shorts'];
  const guestTags = guest
    ? [guest.fromGame.toLowerCase().replace(/[^a-z0-9]/g, ''),
      guest.name.toLowerCase().replace(/[^a-z0-9]/g, '')]
    : [];
  const pillarTags = {
    'animal-hospital': ['animalhospital', 'robloxanimation', 'robloxroleplay'],
    'tiny-rescue': ['rescuestory', 'robloxanimation', 'wholesome'],
    comparison: ['comparison', 'robloxmemes', 'relatable'],
    'troll-prank': ['robloxtroll', 'robloxfunny', 'prank'],
    'family-comedy': ['robloxfamily', 'relatable', 'robloxfunny'],
    transformation: ['transformation', 'beforeandafter', 'robloxbuild'],
    'hide-and-seek': ['hideandseek', 'robloxgames', 'robloxfunny'],
    challenge: ['robloxchallenge', 'obby', 'speedrun'],
    mystery: ['robloxmystery', 'plottwist', 'robloxstory'],
    experimental: ['robloxstory', 'animation'],
  }[rec.pillarId] ?? ['robloxstory'];

  return {
    titles,
    recommendedTitle: recommended.text,
    shortCaption: trimTo(`${firstClause(seed.premise)}.`, 120),
    longCaption: [
      `${firstClause(seed.premise)}.`,
      '',
      `${firstClause(seed.conflict)} — and it does not go the way anyone expects.`,
      '',
      guest
        ? `${guest.name} from ${guest.fromGame}. Part of an ${rec.pillarLabel.toLowerCase()} series.`
        : `Part of ${article(rec.pillarLabel)} ${rec.pillarLabel.toLowerCase()} series.`,
    ].join('\n'),
    hashtags: [...new Set([...base, ...guestTags, ...pillarTags])].slice(0, 8).map((h) => `#${h}`),
    thumbnailFrame: `Pull the thumbnail from the turn at roughly ${
      (rec.duration.seconds * 0.6).toFixed(0)}s — the frame where ${lead}'s expression changes.`,
    thumbnailText: thumbnailText(seed),
    publishTime: {
      value: '',
      note: 'This plan has no audience-level analytics, so there is no supportable "best time" here. '
        + 'Set the time you know your own audience is active — this field is a planning choice, not a '
        + 'recommendation.',
    },
    checklist: [
      'First frame is readable with the sound off',
      'Hook lands before the 3-second mark, with no title card ahead of it',
      'Every character matches the character bible in every scene',
      'No dialogue line is repeated, echoed or cut off',
      'Captions clear the bottom 15% of the frame',
      'Music sits under the dialogue and drops out on the turn',
      'The final frame matches scene 1 closely enough to loop',
      'Exported vertical, full resolution, no letterboxing',
      'No watermark, logo or stray generated text anywhere in frame',
      'Title, caption and hashtags entered before publishing',
    ],
  };
}

const firstClause = (text) => String(text ?? '').split(/[;.]/)[0].trim();
/**
 * Trim to a length, at a word boundary.
 *
 * A title cut mid-word is not a title anyone can publish, so the cut lands on
 * the last space rather than the last character.
 */
const trimTo = (text, n) => {
  if (text.length <= n) return text;
  const cut = text.slice(0, n - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > n * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
};

/**
 * "Premise — until turn", or just the turn when the pair will not fit.
 *
 * Trimming the pair leaves a dangling "— until…", which is worse than a shorter
 * title: the connective promises a second half that is not there.
 */
function contrastTitle(seed, limit) {
  const pair = `${firstClause(seed.premise)} — until ${firstClause(seed.turn).toLowerCase()}`;
  if (pair.length <= limit) return pair;
  const short = `${firstClause(seed.conflict)} — until ${firstClause(seed.turn).toLowerCase()}`;
  return short.length <= limit ? short : firstClause(seed.turn);
}

/** The first of these clauses that fits the limit once the name is on it. */
const fittingClause = (name, candidates, limit) => {
  for (const c of candidates) {
    const clause = firstClause(c);
    if (clause && `${name} — ${clause}`.length <= limit) return clause;
  }
  return firstClause(candidates[candidates.length - 1]);
};
const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);

function thumbnailText(seed) {
  const words = firstClause(seed.turn).split(/\s+/).filter((w) => w.length > 2);
  return words.slice(0, 4).join(' ').replace(/[^\p{L}\p{N}\s]/gu, '').toUpperCase();
}
