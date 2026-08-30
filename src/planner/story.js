/**
 * Story structure and scene breakdown.
 *
 * Turns a concept seed plus a cast into a beat timeline and numbered scenes.
 * The timings are computed, not written by hand, so they always sum exactly to
 * the target runtime — a storyboard whose parts do not add up is unusable.
 */

/** Beat weights across a Short. The hook is short by design; the payoff lands last. */
const BEATS = [
  { id: 'hook', label: 'Hook', weight: 0.12, purpose: 'Show the situation with no setup at all.' },
  { id: 'setup', label: 'Setup', weight: 0.20, purpose: 'Establish who wants what, in one image.' },
  { id: 'escalation', label: 'Escalation', weight: 0.30, purpose: 'Make the problem worse in a visible way.' },
  { id: 'turn', label: 'Turn', weight: 0.20, purpose: 'Break the expectation the video has built.' },
  { id: 'payoff', label: 'Payoff', weight: 0.18, purpose: 'Resolve, and set up the replay.' },
];

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Assign each scene to a beat, then give it a duration.
 *
 * Scenes are distributed across beats proportionally to beat weight, with
 * every beat guaranteed at least one scene when there are enough scenes to go
 * round. The final scene absorbs any rounding remainder so the timeline ends
 * exactly on the target runtime.
 *
 * @param {number} seconds     total runtime
 * @param {number} sceneCount  how many scenes to produce
 */
export function buildTimeline(seconds, sceneCount) {
  if (!Number.isFinite(seconds) || seconds <= 0) throw new RangeError('seconds must be positive');
  if (!Number.isInteger(sceneCount) || sceneCount < 1) throw new RangeError('sceneCount must be a positive integer');

  // How many scenes each beat gets. Largest-remainder, with a floor of one
  // scene per beat while scenes remain.
  const counts = BEATS.map(() => 0);
  if (sceneCount >= BEATS.length) {
    counts.fill(1);
    let left = sceneCount - BEATS.length;
    const remainders = BEATS.map((b, i) => ({ i, r: b.weight }));
    remainders.sort((a, b) => b.r - a.r);
    let k = 0;
    while (left > 0) { counts[remainders[k % remainders.length].i] += 1; left -= 1; k += 1; }
  } else {
    // Too few scenes for one per beat: give them to the heaviest beats.
    const order = BEATS.map((b, i) => ({ i, w: b.weight })).sort((a, b) => b.w - a.w);
    for (let i = 0; i < sceneCount; i += 1) counts[order[i].i] += 1;
  }

  // Per-scene weight, then seconds.
  const scenes = [];
  BEATS.forEach((beat, bi) => {
    for (let s = 0; s < counts[bi]; s += 1) {
      scenes.push({ beat, weight: beat.weight / counts[bi] });
    }
  });

  const totalWeight = scenes.reduce((t, s) => t + s.weight, 0);
  let cursor = 0;
  const out = scenes.map((s, i) => {
    const isLast = i === scenes.length - 1;
    const raw = (s.weight / totalWeight) * seconds;
    // Keep the hook tight: never let the opening scene run past 3 seconds.
    const capped = s.beat.id === 'hook' ? Math.min(raw, 3) : raw;
    const start = round1(cursor);
    const end = isLast ? seconds : round1(Math.min(seconds, cursor + Math.max(0.6, capped)));
    cursor = end;
    return {
      n: i + 1,
      beat: s.beat.id,
      beatLabel: s.beat.label,
      purpose: s.beat.purpose,
      startSec: start,
      endSec: end,
      durationSec: round1(end - start),
    };
  });

  // The cap on the hook can leave time unspent; hand it to the payoff rather
  // than letting the timeline finish short.
  const consumed = out[out.length - 1].endSec;
  if (consumed < seconds) {
    out[out.length - 1].endSec = seconds;
    out[out.length - 1].durationSec = round1(seconds - out[out.length - 1].startSec);
  }
  return out;
}

/** Camera language, varied by beat so the cutting has shape. */
const CAMERA = {
  hook: { framing: 'Medium close-up', angle: 'Eye level', movement: 'Static — no move on the first frame' },
  setup: { framing: 'Wide', angle: 'Slightly low', movement: 'Slow push in, 10% over the scene' },
  escalation: { framing: 'Medium', angle: 'Eye level', movement: 'Handheld drift, very slight' },
  turn: { framing: 'Close-up', angle: 'Eye level', movement: 'Fast push in on the reaction' },
  payoff: { framing: 'Medium wide', angle: 'Slightly high', movement: 'Slow pull back to reveal' },
};

/**
 * Second and later scenes inside the same beat.
 *
 * A beat that runs across two scenes must not cut to an identical frame — that
 * reads as a glitch rather than an edit. Each repeat gets a different size and
 * a different move, so the cut has somewhere to go.
 */
const CAMERA_REPEAT = [
  { framing: 'Close-up', angle: 'Eye level', movement: 'Hold, no move' },
  { framing: 'Wide', angle: 'Slightly high', movement: 'Slow drift right' },
  { framing: 'Medium', angle: 'Low', movement: 'Short push in' },
];

/** How a repeated step advances the same beat, in one clause. */
const STEP_PROGRESS = [
  'the same problem one degree worse',
  'the same problem again, faster and with less room',
  'the same problem for the last time, with nothing left to try',
];

const LIGHTING = {
  hook: 'Bright key from the front, clean and readable at thumbnail size',
  setup: 'Soft global illumination, gentle falloff to the background',
  escalation: 'Slightly harder key, shadows deepening on one side',
  turn: 'Key drops, single strong rim on the subject',
  payoff: 'Warm wash, brightest frame of the video',
};

const TRANSITION = {
  hook: 'Hard cut on movement',
  setup: 'Hard cut',
  escalation: 'Whip cut on a gesture',
  turn: 'Hard cut with a one-frame hold before it',
  payoff: 'Cut to the loop frame',
};

/**
 * Assemble the scene list.
 *
 * @param {object} seed  the concept seed
 * @param {object[]} cast
 * @param {object[]} timeline  from buildTimeline()
 * @param {object} opts  { dialogue: boolean, language: string }
 */
export function buildScenes(seed, cast, timeline, opts = {}) {
  const useDialogue = opts.dialogue !== false;
  const lead = cast[0];
  const second = cast[1] ?? cast[0];
  const third = cast[2] ?? second;

  // What each beat is doing, in this seed's terms.
  //
  // `action` is the stage direction; `line` is what a character actually says
  // out loud and `text` is what gets burned into the frame. They are three
  // different things and must never carry the same string — a video prompt
  // that asks a character to narrate their own stage direction produces
  // exactly that.
  const beatContent = {
    hook: { action: seed.conflict, who: lead, ...script(seed, 'hook', useDialogue) },
    setup: { action: seed.premise, who: lead, ...script(seed, 'setup', useDialogue) },
    escalation: { action: seed.escalation, who: second, ...script(seed, 'escalation', useDialogue) },
    turn: { action: seed.turn, who: lead, ...script(seed, 'turn', useDialogue) },
    payoff: { action: seed.payoff, who: third, ...script(seed, 'payoff', useDialogue) },
  };

  // Number the scenes within each beat so repeated beats read as a progression.
  const beatIndex = {};

  return timeline.map((t, i) => {
    beatIndex[t.beat] = (beatIndex[t.beat] ?? 0) + 1;
    const total = timeline.filter((x) => x.beat === t.beat).length;
    const content = beatContent[t.beat];
    const stepNo = beatIndex[t.beat];
    const cam = stepNo === 1
      ? CAMERA[t.beat]
      : CAMERA_REPEAT[(stepNo - 2) % CAMERA_REPEAT.length];
    const isLast = i === timeline.length - 1;
    const step = total > 1 ? ` (step ${stepNo} of ${total})` : '';
    const progress = stepNo > 1
      ? ` Play ${STEP_PROGRESS[(stepNo - 2) % STEP_PROGRESS.length]}.`
      : '';

    return {
      n: t.n,
      beat: t.beat,
      beatLabel: t.beatLabel,
      startSec: t.startSec,
      endSec: t.endSec,
      durationSec: t.durationSec,
      purpose: `${t.purpose}${step}`,
      location: seed.setting,
      characters: cast.map((c) => c.name),
      position: positionFor(t.beat, cast),
      action: `${content.action}${step}${progress}`,
      expression: expressionFor(t.beat, content.who),
      backgroundAction: backgroundFor(t.beat, seed),
      // A beat that spans several scenes speaks and captions once, on its
      // first scene. The later steps play the same beat in silence, which
      // keeps the edit clean and is what the QC checklist means by "no
      // dialogue line is repeated".
      dialogue: stepNo === 1 ? content.line : '—',
      onScreenText: stepNo === 1 ? content.text : '—',
      framing: cam.framing,
      angle: cam.angle,
      movement: cam.movement,
      lighting: LIGHTING[t.beat],
      sfx: sfxFor(t.beat),
      music: musicFor(t.beat),
      transition: isLast ? 'Freeze on the final frame, then loop to scene 1' : TRANSITION[t.beat],
      continuity: `Same ${place(seed.setting)}. Props present: ${seed.props.join(', ')}. `
        + `Every character keeps the exact appearance defined in the character bible.`,
      retention: retentionFor(t.beat),
    };
  });
}

/**
 * Pull one beat's spoken line and on-screen text off the seed.
 *
 * An empty line is a deliberate silence, so it becomes the em dash the
 * interface and the prompt builders both read as "this character does not
 * speak here". A seed with no script table at all falls back to silence rather
 * than to the stage direction — printing the direction as dialogue is the bug
 * this replaced.
 */
function script(seed, beat, useDialogue) {
  const line = useDialogue ? String(seed.lines?.[beat] ?? '').trim() : '';
  const text = String(seed.captions?.[beat] ?? '').trim();
  return { line: line || '—', text: text || '—' };
}

/** A setting phrased so it reads after "Same" — "A bright room" becomes "bright room". */
function place(setting) {
  return String(setting).replace(/^(a|an|the)\s+/i, '').toLowerCase();
}

function positionFor(beat, cast) {
  const names = cast.map((c) => c.name);
  switch (beat) {
    case 'hook': return `${names[0]} centre frame, filling the middle third`;
    case 'setup': return names.length > 1
      ? `${names[0]} left of centre, ${names[1]} right of centre, both facing in`
      : `${names[0]} centre, full body visible`;
    case 'escalation': return names.length > 1
      ? `${names[1]} advancing toward ${names[0]}, closing the gap`
      : `${names[0]} moving across frame left to right`;
    case 'turn': return `${names[0]} centred, everything else falling out of focus`;
    default: return names.length > 1
      ? `${names[0]} and ${names[names.length - 1]} sharing the frame, equal weight`
      : `${names[0]} centred, pulling back to reveal the space`;
  }
}

function expressionFor(beat, who) {
  // The pool phrases end without a stop; the prompt runs another sentence
  // straight after this one, so add one here rather than in every pool entry.
  const raw = who?.expressions ?? 'Readable, exaggerated slightly for small screens';
  const base = /[.!?]$/.test(raw) ? raw : `${raw}.`;
  switch (beat) {
    case 'hook': return `Alert and unguarded. ${base}`;
    case 'setup': return `Settled, focused on the task. ${base}`;
    case 'escalation': return `Strain showing — jaw set, brows drawn. ${base}`;
    case 'turn': return `The moment of change, held one beat longer than comfortable. ${base}`;
    default: return `Released — the tension leaves the face. ${base}`;
  }
}

function backgroundFor(beat, seed) {
  switch (beat) {
    case 'hook': return 'Background still and uncluttered so the subject reads instantly';
    case 'setup': return `Environment detail visible: ${seed.props.join(', ')}`;
    case 'escalation': return 'Background movement increases — something shifts at the edge of frame';
    case 'turn': return 'Background falls quiet and out of focus';
    default: return 'Background settles; the space reads as calm again';
  }
}

function sfxFor(beat) {
  switch (beat) {
    case 'hook': return 'One sharp diegetic sound on the first frame — no musical sting';
    case 'setup': return 'Room tone, light footsteps, prop handling';
    case 'escalation': return 'Layered sounds building, each slightly louder than the last';
    case 'turn': return 'Everything drops out for roughly half a second';
    default: return 'Single warm resolving sound, then room tone';
  }
}

function musicFor(beat) {
  switch (beat) {
    case 'hook': return 'No music, or a single sustained note under the sound effect';
    case 'setup': return 'Light rhythmic bed enters, low in the mix';
    case 'escalation': return 'Same bed, tempo and layers increasing';
    case 'turn': return 'Cut the music entirely for the beat of the turn';
    default: return 'Music returns warm and resolved, fading under the last frame';
  }
}

function retentionFor(beat) {
  switch (beat) {
    case 'hook': return 'Earns the first second — the viewer must understand the situation without narration';
    case 'setup': return 'Gives the viewer a question to hold';
    case 'escalation': return 'Raises the cost so leaving now feels like missing the answer';
    case 'turn': return 'Pays the question with something the viewer did not predict';
    default: return 'Closes cleanly and points back at the opening frame for a replay';
  }
}

/** The timeline summary the strategy tab prints. */
export function timelineSummary(scenes) {
  const byBeat = new Map();
  for (const s of scenes) {
    const entry = byBeat.get(s.beat) ?? { beat: s.beat, label: s.beatLabel, start: s.startSec, end: s.endSec };
    entry.end = Math.max(entry.end, s.endSec);
    entry.start = Math.min(entry.start, s.startSec);
    byBeat.set(s.beat, entry);
  }
  return [...byBeat.values()].sort((a, b) => a.start - b.start);
}
