/**
 * How a realistic, live-action frame is actually built.
 *
 * This module exists because of a specific failure: a prompt that just says
 * "a woman in a diner" gives a generator no defence against drifting into a
 * cartoon, a 3D-animated render, or a plastic, doll-like look. This niche —
 * faceless life-lessons and inspiring-story Shorts — is real people in real
 * places, so every constraint that keeps a frame photoreal is written out.
 *
 * The wording is deliberately concrete: "real skin with visible pores", "hair
 * made of individual strands", "fabric that folds and creases". Adjectives like
 * "realistic" or "cinematic" are too weak on their own — a generator reads them
 * as a grade on top of a stylised base rather than as a construction rule.
 */

/**
 * Casting "looks" — the overall grade of realism a creator picks between.
 * These replace the old avatar rigs: everyone in frame is a real human, and this
 * only sets how the footage reads, not how the people are built.
 */
export const LOOKS = {
  natural: {
    id: 'natural',
    label: 'Natural realism',
    note: 'Everyday real people, unposed. The safest match to real story Shorts.',
    body: 'Real human beings with completely natural anatomy and proportions, ordinary '
      + 'believable faces and body types, real skin with visible pores and fine texture, '
      + 'and real hair made of individual strands. Nobody is idealised, airbrushed or '
      + 'model-perfect — they look like real people you would pass on the street.',
    proportions: 'True-to-life human proportions and body variety across the cast.',
  },
  polished: {
    id: 'polished',
    label: 'Polished realism',
    note: 'Real people, a little more styled and better-lit — the recreation-drama look.',
    body: 'Real human beings, still fully photoreal with natural skin texture and real hair, '
      + 'but slightly more styled and groomed, as in a well-produced dramatised recreation. '
      + 'Faces stay ordinary and believable — never plastic, never doll-like, never CGI.',
    proportions: 'Natural human proportions; grooming and wardrobe are the only lift.',
  },
  gritty: {
    id: 'gritty',
    label: 'Gritty realism',
    note: 'Documentary, handheld, unglamorous — raw and immediate.',
    body: 'Real human beings shot with a raw, unglamorous, documentary honesty: real skin '
      + 'with every imperfection, real hair, worn everyday clothing, no beautification. '
      + 'The people look lived-in and completely real.',
    proportions: 'Real, varied, unidealised human proportions.',
  },
};

export const LOOK_OPTIONS = Object.values(LOOKS).map((r) => ({ id: r.id, label: r.label, note: r.note }));

/**
 * The rules that apply to any realistic frame, whatever the look.
 *
 * Written as a checklist because that is how generators follow it. Each line is
 * one thing that is otherwise gotten wrong — usually by drifting toward a
 * cartoon, a game render, or plastic skin.
 */
export const CONSTRUCTION = [
  'Every person is a real human with a real, sculpted face — actual eyes, nose, brows, lips '
    + 'and teeth, with real skin showing pores, fine lines and natural blemishes. Faces are '
    + 'never flat, printed, painted, plastic or doll-like.',
  'Hair is real hair made of countless individual strands, with natural flyaways and movement — '
    + 'never a solid rigid helmet, never a single moulded shape.',
  'Skin is real skin: subsurface warmth, subtle oil and texture, natural colour variation. '
    + 'No wax, no airbrushing, no plastic sheen.',
  'Clothing is real fabric that folds, creases, drapes and catches light, with visible weave '
    + 'and seams — never a flat printed texture or a rigid moulded shell.',
  'The environment is a real, believable location with real materials, depth, clutter and '
    + 'imperfection — never a flat, gridded or obviously synthetic set.',
  'Lighting and colour are photographic and natural, with real shadows, bounce and falloff.',
  'Everything in frame reads as genuine live-action footage. Nothing is cartoon, animated, '
    + 'low-poly or game-engine rendered.',
];

/** Render treatments — how the finished frame should look. */
export const RENDER_STYLES = {
  candid: {
    id: 'candid',
    label: 'Candid phone footage',
    note: 'Looks caught on a phone in the moment. The safest match to real story Shorts.',
    text: 'Rendered like real footage caught on a modern phone: natural available light, '
      + 'true-to-life colour, a slightly wide phone-camera field of view, faint handheld '
      + 'imperfection, no film grain overlay, no heavy grade, no post-processing gloss.',
  },
  cinematic: {
    id: 'cinematic',
    label: 'Cinematic recreation',
    note: 'A real scene lit like a film. Still fully photoreal — only the lighting is elevated.',
    text: 'A real live-action scene lit cinematically: a clear key light, gentle rim light and '
      + 'soft ambient fill, shallow depth of field with a softly defocused background. The '
      + 'people, skin, hair and materials stay completely photoreal — only the lighting is '
      + 'elevated. Do not stylise, smooth or cartoonify anything.',
  },
  documentary: {
    id: 'documentary',
    label: 'Documentary / observational',
    note: 'Natural, handheld, unglamorous — the honest-footage look.',
    text: 'The look of honest observational documentary footage: natural light, a handheld '
      + 'feel, realistic contrast and unglamorous colour. Fully photoreal throughout — this is '
      + 'a lighting and framing treatment, not a stylisation.',
  },
};

export const RENDER_OPTIONS = Object.values(RENDER_STYLES)
  .map((s) => ({ id: s.id, label: s.label, note: s.note }));

/**
 * The complete style block that leads every image prompt.
 *
 * It comes first, before the scene, because a generator weights the opening of
 * a prompt most heavily — and getting the medium wrong (cartoon instead of real
 * footage) makes every other instruction irrelevant.
 *
 * `look` accepts a casting look; a legacy `rig` value is tolerated and ignored,
 * so older callers do not break.
 */
export function styleBlock({ look = 'natural', render = 'candid' } = {}) {
  const r = LOOKS[look] ?? LOOKS.natural;
  const s = RENDER_STYLES[render] ?? RENDER_STYLES.candid;

  return [
    'MEDIUM: a real, live-action short filmed with real people in a real place. Genuine '
      + 'photographic footage — not animation, not a cartoon, not a game render.',
    '',
    `CASTING: ${r.body} ${r.proportions}`,
    '',
    'REALISM RULES — all of these apply:',
    ...CONSTRUCTION.map((line) => `  • ${line}`),
    '',
    `RENDER: ${s.text}`,
  ].join('\n');
}

/** The negatives that stop a generator drifting toward cartoon or game renders. */
export const HUMAN_NEGATIVES = [
  'not a cartoon', 'not 3D animation', 'not Pixar or Disney style', 'not anime',
  'not Roblox or any video-game avatar', 'no blocky, low-poly or voxel geometry',
  'no flat, printed or decal face', 'no plastic, waxy or doll-like skin',
  'no airbrushed or over-smoothed skin', 'no exaggerated cartoon proportions',
  'no rigid helmet-like hair', 'no CGI or rendered-3D look', 'no uncanny or lifeless faces',
  'no extra or distorted fingers', 'no warped hands', 'no mannequin stillness',
];

/** A one-line summary for the interface. */
export const styleSummary = ({ look = 'natural', render = 'candid' } = {}) =>
  `${(LOOKS[look] ?? LOOKS.natural).label} · ${(RENDER_STYLES[render] ?? RENDER_STYLES.candid).label}`;
