/**
 * Image and image-to-video prompts.
 *
 * Every prompt is standalone: it repeats the full Roblox construction spec, the
 * identity lock, the outfit, the environment and the framing, because
 * generators have no memory between calls and a prompt that says "same
 * character as before" produces a different character. The repetition is the
 * mechanism, not redundancy.
 *
 * The construction spec leads, before the scene. A generator weights the
 * opening of a prompt most heavily, and if it does not know it is building a
 * Roblox scene, nothing after that matters — it returns a polished 3D character
 * that happens to be wearing the right colours.
 */

import { ROBLOX_NEGATIVES, styleBlock } from './robloxstyle.js';

/** Per-platform phrasing. The scene and identity content never varies. */
const IMAGE_PLATFORMS = {
  chatgpt: {
    label: 'ChatGPT Image Generation',
    preface: 'Create a single vertical 9:16 illustration.',
    tail: 'Render the frame exactly as described. Do not add any text, captions, logos or watermarks.',
  },
  midjourney: {
    label: 'Midjourney',
    preface: '',
    tail: '--ar 9:16 --style raw --quality 2',
    negativeAsParam: true,
  },
  imagen: {
    label: 'Google Imagen',
    preface: 'Generate a vertical 9:16 image.',
    tail: 'Photorealistic lighting on stylised geometry. No text rendered in image.',
  },
  leonardo: {
    label: 'Leonardo',
    preface: 'Vertical 9:16 cinematic still.',
    tail: 'Alchemy on, high contrast, character-consistent rendering.',
  },
  generic: {
    label: 'General-purpose prompt',
    preface: 'Vertical 9:16 image.',
    tail: 'Deliver one frame matching every detail above.',
  },
};

const VIDEO_PLATFORMS = {
  veo: { label: 'Google Veo', preface: 'Animate this image into a single continuous shot.' },
  kling: { label: 'Kling', preface: 'Image-to-video. Animate the supplied frame.' },
  runway: { label: 'Runway', preface: 'Gen image-to-video. Use the supplied frame as frame one.' },
  pika: { label: 'Pika', preface: 'Animate the supplied image.' },
  generic: { label: 'General-purpose prompt', preface: 'Animate the supplied still image.' },
};

export const IMAGE_PLATFORM_OPTIONS = Object.entries(IMAGE_PLATFORMS)
  .map(([id, p]) => ({ id, label: p.label }));
export const VIDEO_PLATFORM_OPTIONS = Object.entries(VIDEO_PLATFORMS)
  .map(([id, p]) => ({ id, label: p.label }));

/**
 * The negative list every image prompt carries.
 *
 * The Roblox negatives come first and matter most: left to itself a generator
 * drifts straight back to smooth cinematic 3D, which is the single most common
 * way one of these prompts fails.
 */
const IMAGE_NEGATIVES = [
  ...ROBLOX_NEGATIVES,
  'no watermark', 'no logo', 'no signature', 'no rendered text or captions',
  'no duplicate of the same character in frame', 'no extra limbs',
  'no outfit change', 'no hair accessory change', 'no facial identity drift',
  'no unexplained props', 'no horizontal or square composition', 'no cropped face',
  'no blurred subject', 'no inconsistency with the previous scene',
];

/** The negative list every video prompt carries. */
const VIDEO_NEGATIVES = [
  ...ROBLOX_NEGATIVES,
  'no repeated speech', 'no duplicated dialogue', 'no echo', 'no added words',
  'no new characters entering frame', 'no character morphing', 'no facial changes',
  'no outfit changes', 'no uncontrolled camera movement', 'no excessive motion',
  'no warped or melting hands', 'no disappearing objects', 'no random background changes',
  'no added text or captions', 'no automatic scene transition or cut', 'no unintended zoom',
  'no lip movement while the character is silent',
];

/**
 * One character's block inside a prompt.
 *
 * A character with a full build sheet prints the sheet, section by section,
 * rather than the summary fields — the sheet is the thing that was written
 * against a reference image, and paraphrasing it is how a character drifts.
 * Everyone else prints the summary, which is all they have.
 */
function characterBlock(c) {
  const head = [
    `${c.name} — ${c.storyRole}, ${String(c.ageCategory).toLowerCase()}.`,
    c.fromGame
      ? `A fan interpretation of a character from the Roblox game ${c.fromGame}. `
        + 'Build the character from the description below rather than copying any official asset.'
      : null,
  ].filter(Boolean).join(' ');

  if (c.spec) {
    return [
      head,
      ...c.spec.map(([title, lines]) =>
        `${title.toUpperCase()}: ${lines.map((l) => l.replace(/\.$/, '')).join('; ')}.`),
      c.heightNote,
      c.identityLock,
    ].filter(Boolean).join('\n');
  }

  return [
    head,
    `Avatar build: ${c.build}.`,
    `Head: ${c.head}.`,
    `Printed face decal: ${c.faceDecal}.`,
    `Headwear: ${c.hat}. Hair accessory: ${c.hair}.`,
    `Wearing: ${c.outfit}. Footwear: ${c.shoes}. Accessories: ${c.accessories}.`,
    `Signature colours: ${c.colors}. Distinguishing feature: ${c.marks}. ${c.heightNote}`,
    `Surfacing: ${c.material}.`,
    c.identityLock,
  ].filter(Boolean).join(' ');
}

/**
 * One standalone image prompt for a scene.
 *
 * @param {object} scene
 * @param {object[]} cast
 * @param {object} opts { platform, rig, render, aspect }
 */
export function imagePrompt(scene, cast, opts = {}) {
  const platform = IMAGE_PLATFORMS[opts.platform] ?? IMAGE_PLATFORMS.generic;
  const aspect = opts.aspect || '9:16';
  const present = cast.filter((c) => scene.characters.includes(c.name));
  const inFrame = present.length ? present : cast;

  // A cast can mix rigs — an animal-headed vet beside a blocky R6 kid. The
  // scene-level rig sets the world; a character carrying its own rig overrides
  // it in that character's own block.
  const rig = opts.rig || inFrame[0]?.rig || 'r15';

  const characterBlocks = inFrame.map(characterBlock).join('\n\n');

  // A character carrying its own negative list is far stricter than the shared
  // one; both are printed, its own first.
  const negatives = [
    ...inFrame.flatMap((c) => (c.spec ? c.negatives ?? [] : [])),
    ...IMAGE_NEGATIVES,
  ];
  const uniqueNegatives = [...new Set(negatives)];

  const body = [
    platform.preface,
    '',
    styleBlock({ rig, render: opts.render }),
    '',
    `SCENE ${scene.n} of the sequence — ${scene.beatLabel}. Duration in the edit: ${scene.durationSec}s.`,
    '',
    'CHARACTERS IN FRAME — each built as described, and no one else:',
    characterBlocks,
    '',
    `ENVIRONMENT: ${scene.location}. ${scene.backgroundAction}. `
      + 'Built from Roblox parts: flat-coloured surfaces, hard right-angled corners, simple '
      + 'repeating textures, props sitting squarely on the grid.',
    `ACTION AT THIS INSTANT: ${scene.action}`,
    `EXPRESSION: ${scene.expression} Convey this through the printed face decal, the head `
      + 'angle and the body pose — the face is a flat decal and cannot deform.',
    `PLACEMENT: ${scene.position}`,
    '',
    `CAMERA: ${scene.framing}, ${scene.angle.toLowerCase()}. Composition built for ${aspect} vertical, `
      + 'with the subject inside the central safe area and clear headroom — nothing important in the '
      + 'outer 12% of the frame, which the player UI can cover.',
    `LIGHTING AND MOOD: ${scene.lighting}.`,
    '',
    `CONTINUITY: ${scene.continuity}`,
    '',
    `QUALITY: high resolution, ${aspect} vertical, sharp focus on the subject, clean readable silhouette `
      + 'at small phone size.',
    '',
    platform.negativeAsParam
      ? `--no ${uniqueNegatives.map((n) => n.replace(/^(no|not) /, '')).join(', ')}`
      : `NEGATIVE PROMPT: ${uniqueNegatives.join(', ')}.`,
    '',
    scene.onScreenText && scene.onScreenText !== '—'
      ? `ON-SCREEN TEXT: do not render any text in this image. Add "${scene.onScreenText}" during editing, `
        + 'where the typeface and placement can be controlled.'
      : null,
    platform.tail,
  ].filter((line) => line != null && line !== false).join('\n');

  return body.trim();
}

/**
 * One standalone image-to-video prompt for a scene.
 *
 * Includes an explicit motion schedule, because a duration alone gives the
 * generator no guidance on when anything should happen.
 */
export function videoPrompt(scene, cast, opts = {}) {
  const platform = VIDEO_PLATFORMS[opts.platform] ?? VIDEO_PLATFORMS.generic;
  const present = cast.filter((c) => scene.characters.includes(c.name));
  const inFrame = present.length ? present : cast;
  const lead = inFrame[0];
  const d = scene.durationSec;

  // Three motion phases scaled to the scene's real length.
  const p1 = Math.max(0.2, Math.round(d * 0.25 * 10) / 10);
  const p2 = Math.max(p1 + 0.2, Math.round(d * 0.65 * 10) / 10);

  const speaks = scene.dialogue && scene.dialogue !== '—';

  return [
    platform.preface,
    '',
    'WORLD: this is a scene inside the video game Roblox. Every character stays built from '
      + 'separate rigid Roblox parts, and every face stays a flat printed decal. Animate the '
      + 'parts — never soften, round, humanise or re-proportion anything.',
    '',
    `DURATION: exactly ${d} seconds. One continuous shot. Do not cut.`,
    '',
    `STARTING FRAME: the supplied image — ${scene.framing.toLowerCase()}, ${scene.angle.toLowerCase()}, `
      + `${scene.position}. Treat it as frame one and preserve its composition.`,
    '',
    'IDENTITY — must hold for every frame:',
    inFrame.map((c) => c.identityLock).join('\n'),
    '',
    'MOTION SCHEDULE:',
    `  0.0–${p1}s — ${scene.expression.split('.')[0]}. Subtle head settle, one natural blink.`,
    `  ${p1}–${p2}s — ${scene.action}`,
    `  ${p2}–${d}s — reaction holds; ${scene.transition.toLowerCase()} prepared on the final frame.`,
    '',
    `CHARACTER MOTION: ${lead.body}. Movement stays inside the frame; no character exits or enters.`,
    'FACIAL MOVEMENT: the face is a printed decal, so it changes by swapping between drawn '
      + 'expressions, not by deforming. One or two blinks across the whole clip, each a quick '
      + 'swap rather than a soft close. Do not sculpt, morph or add muscle movement to the face.',
    'BODY MOVEMENT: rigid parts rotating at their joints, purposeful and slow enough to stay '
      + 'clean. Limbs keep their shape throughout and never bend where a Roblox limb cannot.',
    `ENVIRONMENT MOTION: ${scene.backgroundAction.toLowerCase()}. Keep it subtle — the background must not `
      + 'compete with the subject.',
    `CAMERA: ${scene.movement}. Nothing beyond this move.`,
    'MOTION INTENSITY: low to moderate. Prefer too little movement over too much.',
    '',
    speaks
      ? `DIALOGUE: the character says "${scene.dialogue}" — deliver the dialogue exactly once. `
        + 'Mouth movement is the printed decal swapping between open and closed shapes in time '
        + 'with the words, not a modelled jaw. Do not repeat, restart, paraphrase, echo or add '
        + `any words. Fit the line comfortably inside ${d} seconds; leave the printed mouth closed `
        + 'and still before and after it.'
      : 'DIALOGUE: none. The character does not speak — the printed mouth stays closed and '
        + 'unchanged for the entire clip. Do not generate any mouth movement.',
    '',
    `ENDING FRAME: ${scene.transition}. Leave the subject positioned so the next scene can cut cleanly.`,
    '',
    `NEGATIVE: ${[...new Set([
      ...inFrame.flatMap((c) => (c.spec ? c.negatives ?? [] : [])),
      ...VIDEO_NEGATIVES,
    ])].join(', ')}.`,
  ].filter((line) => line != null && line !== false).join('\n');
}

/** All image prompts for a plan, as one copyable block. */
export function allImagePrompts(scenes, cast, opts) {
  return scenes.map((s) => `=== SCENE ${s.n} — IMAGE PROMPT ===\n\n${imagePrompt(s, cast, opts)}`)
    .join('\n\n\n');
}

/** All video prompts for a plan, as one copyable block. */
export function allVideoPrompts(scenes, cast, opts) {
  return scenes.map((s) => `=== SCENE ${s.n} — IMAGE-TO-VIDEO PROMPT ===\n\n${videoPrompt(s, cast, opts)}`)
    .join('\n\n\n');
}

