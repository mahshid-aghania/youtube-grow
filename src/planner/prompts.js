/**
 * Image and image-to-video prompts.
 *
 * Every prompt is standalone: it repeats the full realism spec, the identity
 * lock, the outfit, the environment and the framing, because generators have no
 * memory between calls and a prompt that says "same character as before"
 * produces a different person. The repetition is the mechanism, not redundancy.
 *
 * The realism spec leads, before the scene. A generator weights the opening of a
 * prompt most heavily, and if it does not know it is producing real live-action
 * footage, nothing after that matters — it returns a cartoon or a 3D render that
 * happens to be wearing the right colours.
 */

import { HUMAN_NEGATIVES, styleBlock } from './humanstyle.js';

/** Per-platform phrasing. The scene and identity content never varies. */
const IMAGE_PLATFORMS = {
  chatgpt: {
    label: 'ChatGPT Image Generation',
    preface: 'Create a single vertical 9:16 photorealistic image.',
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
    preface: 'Generate a vertical 9:16 photorealistic image.',
    tail: 'Photographic lighting on real people and real materials. No text rendered in image.',
  },
  leonardo: {
    label: 'Leonardo',
    preface: 'Vertical 9:16 cinematic photoreal still.',
    tail: 'Alchemy on, high contrast, character-consistent rendering.',
  },
  generic: {
    label: 'General-purpose prompt',
    preface: 'Vertical 9:16 photorealistic image.',
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
 * The realism negatives come first and matter most: left to itself a generator
 * drifts toward cartoon or smooth 3D, which is the single most common way one of
 * these prompts fails.
 */
const IMAGE_NEGATIVES = [
  ...HUMAN_NEGATIVES,
  'no watermark', 'no logo', 'no signature', 'no rendered text or captions',
  'no duplicate of the same character in frame', 'no extra limbs',
  'no outfit change', 'no hair change', 'no facial identity drift',
  'no unexplained props', 'no horizontal or square composition', 'no cropped face',
  'no blurred subject', 'no inconsistency with the previous scene',
];

/** The negative list every video prompt carries. */
const VIDEO_NEGATIVES = [
  ...HUMAN_NEGATIVES,
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
      ? `A fan interpretation of a character from ${c.fromGame}. `
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
    `Build: ${c.build}.`,
    `Face: ${c.face}.`,
    `Eyes: ${c.eyes}.`,
    `Hair: ${c.hair}. Headwear: ${c.headwear}.`,
    `Wearing: ${c.outfit}. Footwear: ${c.shoes}. Accessories: ${c.accessories}.`,
    `Signature colours: ${c.colors}. Distinguishing feature: ${c.marks}. ${c.heightNote}`,
    'A real, believable human being throughout — real skin texture, real hair, a real face.',
    c.identityLock,
  ].filter(Boolean).join(' ');
}

/**
 * One standalone image prompt for a scene.
 *
 * @param {object} scene
 * @param {object[]} cast
 * @param {object} opts { platform, look, render, aspect }
 */
export function imagePrompt(scene, cast, opts = {}) {
  const platform = IMAGE_PLATFORMS[opts.platform] ?? IMAGE_PLATFORMS.generic;
  const aspect = opts.aspect || '9:16';
  const present = cast.filter((c) => scene.characters.includes(c.name));
  const inFrame = present.length ? present : cast;

  // The scene-level look sets the overall realism grade; a character carrying its
  // own look overrides it in that character's own block.
  const look = opts.look || inFrame[0]?.look || 'natural';

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
    styleBlock({ look, render: opts.render }),
    '',
    `SCENE ${scene.n} of the sequence — ${scene.beatLabel}. Duration in the edit: ${scene.durationSec}s.`,
    '',
    'PEOPLE IN FRAME — each a real human as described, and no one else:',
    characterBlocks,
    '',
    `ENVIRONMENT: ${scene.location}. ${scene.backgroundAction}. `
      + 'A real, believable location with real materials, natural depth, lived-in clutter and '
      + 'imperfection — not a synthetic or gridded set.',
    `ACTION AT THIS INSTANT: ${scene.action}`,
    `EXPRESSION: ${scene.expression} Convey it through a genuine human facial expression — the `
      + 'eyes, brows and mouth, the head angle and the body — on a real, natural face.',
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
    'WORLD: this is real live-action footage of real people in a real place. Everyone stays a '
      + 'believable human with a real face and real skin. Animate them naturally — never stylise, '
      + 'cartoonify, flatten, plasticise or re-proportion anyone.',
    '',
    `DURATION: exactly ${d} seconds. One continuous shot. Do not cut.`,
    '',
    `STARTING FRAME: the supplied image — ${scene.framing.toLowerCase()}, ${scene.angle.toLowerCase()}, `
      + `${scene.position}. Treat it as frame one and preserve its composition.`,
    '',
    // The same build sheet the still was generated from. Handing the animator a
    // one-paragraph summary of a character it is supposed to hold frame-for-frame
    // is how a character drifts between the image and the clip.
    'IDENTITY — must hold for every frame:',
    inFrame.map(characterBlock).join('\n\n'),
    '',
    'MOTION SCHEDULE:',
    `  0.0–${p1}s — ${scene.expression.split('.')[0]}. A subtle head settle and one natural blink.`,
    `  ${p1}–${p2}s — ${scene.action}`,
    `  ${p2}–${d}s — reaction holds; ${scene.transition.toLowerCase()} prepared on the final frame.`,
    '',
    `CHARACTER MOTION: ${lead.body}. Movement stays inside the frame; no character exits or enters.`,
    'FACIAL MOVEMENT: natural human micro-expressions — real blinks, small brow, eye and mouth '
      + 'movements that match the emotion. Keep the same face and features throughout; do not morph, '
      + 'swap, smooth or distort the face.',
    'BODY MOVEMENT: natural, believable human motion with real weight, balance and joint movement. '
      + 'Limbs and hands stay anatomically correct throughout — no warping, no melting, no extra fingers.',
    `ENVIRONMENT MOTION: ${scene.backgroundAction.toLowerCase()}. Keep it subtle — the background must not `
      + 'compete with the subject.',
    `CAMERA: ${scene.movement}. Nothing beyond this move.`,
    'MOTION INTENSITY: low to moderate. Prefer too little movement over too much.',
    '',
    speaks
      ? `DIALOGUE: the character says "${scene.dialogue}" — deliver the dialogue exactly once. `
        + 'The mouth and jaw move naturally with the words, with accurate lip-sync. Do not repeat, '
        + 'restart, paraphrase, echo or add any words. Fit the line comfortably inside '
        + `${d} seconds; keep the mouth closed and still before and after it.`
      : 'DIALOGUE: none. The character does not speak — the mouth stays closed and still for the '
        + 'entire clip. Do not generate any mouth or lip movement.',
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
