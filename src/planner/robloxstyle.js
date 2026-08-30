/**
 * How a Roblox frame is actually built.
 *
 * This module exists because of a specific failure: a prompt that says
 * "premium cinematic 3D animation, expressive faces, detailed environments"
 * produces a Pixar-looking render, not a Roblox scene. Image generators have no
 * idea what Roblox looks like unless the geometry is spelled out — that avatars
 * are assembled from primitives, that the face is a flat decal printed on the
 * head rather than sculpted features, that limbs have no elbows or knees, that
 * hair is a rigid accessory sitting on the head like a helmet.
 *
 * So every constraint is written out. The wording is deliberately mechanical:
 * "cylinder", "rectangular block", "flat matte plastic". Adjectives like
 * "stylised" or "blocky" are too weak on their own — generators read them as a
 * softening of realism rather than as a construction rule.
 */

/** The avatar rigs a creator actually picks between. */
export const RIGS = {
  r6: {
    id: 'r6',
    label: 'R6 classic',
    note: 'The blocky original. Six parts, no joints mid-limb. Reads as Roblox instantly.',
    body: 'Classic R6 avatar construction: one rectangular block torso, one block head, '
      + 'two straight rectangular arms and two straight rectangular legs. Six parts in total. '
      + 'The arms and legs are unjointed straight blocks — no elbows, no knees, no wrists, '
      + 'no separate hands or feet, no fingers. Limbs attach directly to the torso with a '
      + 'visible seam and rotate at the shoulder and hip only.',
    proportions: 'Head roughly one third the width of the torso. Arms and legs the same '
      + 'length as the torso. Short, wide, stocky silhouette.',
  },
  r15: {
    id: 'r15',
    label: 'R15',
    note: 'Segmented limbs and simple hands. The default for most modern Roblox games.',
    body: 'R15 avatar construction: a segmented rig with an upper and lower torso, upper arm, '
      + 'lower arm and a simple rounded hand per side, and upper leg, lower leg and a simple '
      + 'blocky foot per side. Segments are smooth rounded blocks that bend at the joint '
      + 'without deforming — each piece stays a rigid solid. Hands are simple mitten-like '
      + 'shapes; fingers are not modelled separately.',
    proportions: 'Slightly taller and better proportioned than R6, still unmistakably built '
      + 'from separate solid parts with visible joint gaps.',
  },
  rthro: {
    id: 'rthro',
    label: 'Rthro',
    note: 'Taller, more humanlike proportions. Still assembled from rigid parts.',
    body: 'Rthro avatar construction: a taller, more human-proportioned Roblox rig, still '
      + 'assembled from separate rigid segments with visible joint gaps. Limbs are smooth '
      + 'tapered solids. Hands are simple and rounded with minimal finger definition.',
    proportions: 'Roughly seven heads tall, narrow waist, long limbs — but never anatomically '
      + 'detailed, and never a realistic human body.',
  },
  animal: {
    id: 'animal',
    label: 'Animal / creature rig',
    note: 'A Roblox body with an animal head accessory — the Animal Hospital look.',
    body: 'A Roblox avatar rig wearing a large moulded animal head that replaces the standard '
      + 'head entirely: a smooth solid muzzle, moulded ears and any horns or antlers as one '
      + 'rigid piece. The body underneath stays a standard Roblox rig of separate solid parts. '
      + 'The head is a hard surface, not fur geometry — any fur is a printed texture on it.',
    proportions: 'Oversized head relative to the body, which is what makes the character read '
      + 'as cute at phone size.',
  },
};

export const RIG_OPTIONS = Object.values(RIGS).map((r) => ({ id: r.id, label: r.label, note: r.note }));

/**
 * The rules that apply to any Roblox frame, whatever the rig.
 *
 * Written as a checklist because that is how generators follow it. Each line is
 * one thing that is otherwise gotten wrong.
 */
export const CONSTRUCTION = [
  'The face is a flat 2D decal printed on the front surface of the head — not sculpted. '
    + 'Two simple shapes for eyes and one for the mouth, drawn as if stickered on. '
    + 'There is no modelled nose, no modelled eyebrows, no lips, no teeth geometry, '
    + 'no skin pores, no wrinkles and no facial muscle detail of any kind.',
  'Hair is a single rigid moulded accessory sitting on the head like a helmet, with a hard '
    + 'silhouette. It is never individual strands, never soft, never physics-simulated.',
  'Every surface is flat matte plastic with almost no specular highlight. Hard edges, no '
    + 'bevels, no subsurface scattering, no fabric weave, no skin translucency.',
  'Clothing is either a texture printed flat onto the body parts, or a separate moulded solid '
    + 'layered over them. Cloth never folds, drapes, creases or simulates.',
  'The environment is built from rectangular and cylindrical parts snapped together on a grid, '
    + 'with flat single-colour surfaces and simple textures. Walls meet at hard right angles.',
  'Colours are saturated and flat. Lighting is even and bright with soft, simple shadows.',
  'Proportions stay chunky and readable at phone size. Nothing in frame is photorealistic.',
];

/** Render treatments — how the finished frame should look. */
export const RENDER_STYLES = {
  ingame: {
    id: 'ingame',
    label: 'In-game screenshot',
    note: 'Looks like a frame captured from Roblox itself. The safest match to real Shorts.',
    text: 'Rendered exactly like a screenshot taken inside the Roblox engine: default Roblox '
      + 'lighting, flat even illumination, simple soft shadows, slightly washed highlights, '
      + 'no depth of field, no motion blur, no film grain, no post-processing.',
  },
  cinematic: {
    id: 'cinematic',
    label: 'Roblox cinematic render',
    note: 'A Roblox scene lit like a film. Still blocky geometry — only the lighting changes.',
    text: 'A Roblox scene rendered with cinematic lighting: a clear key light, gentle rim '
      + 'light and soft ambient fill, with shallow depth of field on the background only. '
      + 'The geometry, materials and avatar construction stay exactly as Roblox builds them — '
      + 'only the lighting is elevated. Do not smooth, round or re-proportion anything.',
  },
  animation: {
    id: 'animation',
    label: 'Roblox animated short',
    note: 'The look of a Roblox animation channel — cleaner lighting, punchier colour.',
    text: 'The look of a polished Roblox animated short: clean bright lighting, punchy '
      + 'saturated colour, crisp edges and high contrast between subject and background. '
      + 'Avatar construction and blocky environment geometry remain exactly as Roblox builds '
      + 'them — this is a grading and lighting treatment, not a redesign.',
  },
};

export const RENDER_OPTIONS = Object.values(RENDER_STYLES)
  .map((s) => ({ id: s.id, label: s.label, note: s.note }));

/**
 * The complete style block that leads every image prompt.
 *
 * It comes first, before the scene, because a generator weights the opening of
 * a prompt most heavily — and getting the world wrong makes every other
 * instruction irrelevant.
 */
export function styleBlock({ rig = 'r15', render = 'ingame' } = {}) {
  const r = RIGS[rig] ?? RIGS.r15;
  const s = RENDER_STYLES[render] ?? RENDER_STYLES.ingame;

  return [
    'WORLD: a scene inside the video game Roblox. Every character and every object is built '
      + 'the way Roblox builds them, from simple solid parts.',
    '',
    `AVATAR CONSTRUCTION: ${r.body} ${r.proportions}`,
    '',
    'ROBLOX RULES — all of these apply:',
    ...CONSTRUCTION.map((line) => `  • ${line}`),
    '',
    `RENDER: ${s.text}`,
  ].join('\n');
}

/** The negatives that stop a generator drifting back to generic 3D animation. */
export const ROBLOX_NEGATIVES = [
  'not Pixar style', 'not Disney style', 'not a realistic human',
  'no sculpted facial features', 'no modelled nose', 'no modelled eyebrows',
  'no individual hair strands', 'no soft or flowing hair', 'no skin texture or pores',
  'no fabric folds or draping cloth', 'no rounded organic body shapes',
  'no anatomically detailed hands', 'no separate fingers on a classic avatar',
  'no photorealistic rendering', 'no clay or plasticine look', 'no Minecraft voxel blocks',
  'no LEGO minifigure shapes or studs on the body',
];

/** A one-line summary for the interface. */
export const styleSummary = ({ rig = 'r15', render = 'ingame' } = {}) =>
  `${(RIGS[rig] ?? RIGS.r15).label} · ${(RENDER_STYLES[render] ?? RENDER_STYLES.ingame).label}`;
