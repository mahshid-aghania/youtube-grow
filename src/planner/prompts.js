/**
 * Image and image-to-video prompts.
 *
 * Every prompt is standalone: it repeats the full identity lock, the outfit,
 * the environment and the framing, because generators have no memory between
 * calls and a prompt that says "same character as before" produces a different
 * character. The repetition is the mechanism, not redundancy.
 */

const DEFAULT_STYLE = 'Premium cinematic 3D game-inspired animation, polished stylised characters, '
  + 'expressive faces, detailed environments, soft global illumination, cinematic depth, '
  + 'family-friendly visual storytelling, crisp high-resolution rendering';

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

/** The negative list every image prompt carries. */
const IMAGE_NEGATIVES = [
  'no watermark', 'no logo', 'no signature', 'no rendered text or captions',
  'no duplicate of the same character in frame', 'no extra fingers', 'no extra limbs',
  'no outfit change', 'no hairstyle change', 'no facial identity drift',
  'no unexplained props', 'no horizontal or square composition', 'no cropped face',
  'no blurred subject', 'no inconsistency with the previous scene',
];

/** The negative list every video prompt carries. */
const VIDEO_NEGATIVES = [
  'no repeated speech', 'no duplicated dialogue', 'no echo', 'no added words',
  'no new characters entering frame', 'no character morphing', 'no facial changes',
  'no outfit changes', 'no uncontrolled camera movement', 'no excessive motion',
  'no warped or melting hands', 'no disappearing objects', 'no random background changes',
  'no added text or captions', 'no automatic scene transition or cut', 'no unintended zoom',
  'no lip movement while the character is silent',
];

/**
 * One standalone image prompt for a scene.
 *
 * @param {object} scene
 * @param {object[]} cast
 * @param {object} opts { platform, style, aspect }
 */
export function imagePrompt(scene, cast, opts = {}) {
  const platform = IMAGE_PLATFORMS[opts.platform] ?? IMAGE_PLATFORMS.generic;
  const style = opts.style || DEFAULT_STYLE;
  const aspect = opts.aspect || '9:16';
  const present = cast.filter((c) => scene.characters.includes(c.name));
  const inFrame = present.length ? present : cast;

  const characterBlocks = inFrame.map((c) => [
    `${c.name} — ${c.storyRole}, ${c.ageCategory.toLowerCase()}.`,
    `Build: ${c.build}. Face: ${c.face}. Eyes: ${c.eyes}. Eyebrows: ${c.brows}. Hair: ${c.hair}.`,
    `Wearing: ${c.outfit}. Footwear: ${c.shoes}. Accessories: ${c.accessories}.`,
    `Signature colours: ${c.colors}. Distinguishing feature: ${c.marks}. ${c.heightNote}`,
    `Surfacing: ${c.material}.`,
    c.identityLock,
  ].join(' ')).join('\n\n');

  const body = [
    platform.preface,
    '',
    `SCENE ${scene.n} of the sequence — ${scene.beatLabel}. Duration in the edit: ${scene.durationSec}s.`,
    '',
    'CHARACTERS IN FRAME:',
    characterBlocks,
    '',
    `ENVIRONMENT: ${scene.location}. ${scene.backgroundAction}.`,
    `ACTION AT THIS INSTANT: ${scene.action}`,
    `EXPRESSION: ${scene.expression}`,
    `PLACEMENT: ${scene.position}`,
    '',
    `CAMERA: ${scene.framing}, ${scene.angle.toLowerCase()}. Composition built for ${aspect} vertical, `
      + 'with the subject inside the central safe area and clear headroom — nothing important in the '
      + 'outer 12% of the frame, which the player UI can cover.',
    `LIGHTING AND MOOD: ${scene.lighting}.`,
    '',
    `VISUAL STYLE: ${style}.`,
    `CONTINUITY: ${scene.continuity}`,
    '',
    `QUALITY: high resolution, ${aspect} vertical, sharp focus on the subject, clean readable silhouette `
      + 'at small phone size.',
    '',
    platform.negativeAsParam
      ? `--no ${IMAGE_NEGATIVES.map((n) => n.replace(/^no /, '')).join(', ')}`
      : `NEGATIVE PROMPT: ${IMAGE_NEGATIVES.join(', ')}.`,
    '',
    scene.onScreenText && scene.onScreenText !== '—'
      ? `ON-SCREEN TEXT: do not render any text in this image. Add "${scene.onScreenText}" during editing, `
        + 'where the typeface and placement can be controlled.'
      : '',
    platform.tail,
  ].filter(Boolean).join('\n');

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
    'FACIAL MOVEMENT: natural micro-expression only — brows and mouth. Eyes track the action, one or two '
      + 'blinks across the whole clip.',
    'HAND AND BODY MOVEMENT: purposeful and slow enough to stay clean; hands remain fully visible and '
      + 'correctly formed throughout.',
    `ENVIRONMENT MOTION: ${scene.backgroundAction.toLowerCase()}. Keep it subtle — the background must not `
      + 'compete with the subject.',
    `CAMERA: ${scene.movement}. Nothing beyond this move.`,
    'MOTION INTENSITY: low to moderate. Prefer too little movement over too much.',
    '',
    speaks
      ? `DIALOGUE: the character says "${scene.dialogue}" — deliver the dialogue exactly once, with `
        + 'synchronised lip movement. Do not repeat, restart, paraphrase, echo or add any words. '
        + `Fit the line comfortably inside ${d} seconds; leave the mouth closed and still before and after it.`
      : 'DIALOGUE: none. The character does not speak — keep the mouth closed and still for the entire clip. '
        + 'Do not generate any lip movement.',
    '',
    `ENDING FRAME: ${scene.transition}. Leave the subject positioned so the next scene can cut cleanly.`,
    '',
    `NEGATIVE: ${VIDEO_NEGATIVES.join(', ')}.`,
  ].filter(Boolean).join('\n');
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

export { DEFAULT_STYLE };
