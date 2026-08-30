import { styleBlock } from './robloxstyle.js';

/**
 * Roblox game worlds and their known characters.
 *
 * Two different things live here, and the difference matters.
 *
 * GAME_WORLDS give a plan somewhere real to be set. A Short about Animal
 * Hospital should be staged in the Animal Hospital — its lobby, its treatment
 * rooms, its supplies shop — not in "a bright examination room". Naming the
 * actual locations and props is what makes a generated scene look like the game
 * the audience already knows.
 *
 * GAME_CHARACTERS are existing characters from those games, the kind a fan
 * video casts because the audience recognises them. They are not this project's
 * inventions and are not presented as such: each entry records the game it
 * belongs to, what the character actually does there, and a described
 * appearance for prompting. Prompts built from these say plainly that they are
 * a fan interpretation of an existing game character rather than a reproduction
 * of the official asset — which no image generator can produce anyway.
 *
 * The generated cast in characters.js stays entirely original. These are opted
 * into per day, by choosing one.
 */

/** Locations and props that actually exist in each game. */
export const GAME_WORLDS = [
  {
    id: 'animal-hospital',
    label: 'Animal Hospital',
    pillar: 'animal-hospital',
    premise: 'Players work shifts as veterinary staff, treating animal patients under a '
      + 'supervising doctor and being graded on the shift.',
    locations: [
      'the hospital reception desk, with the patient queue behind it',
      'a treatment room with two beds side by side and a wall-mounted chart',
      'the lobby between shifts, where staff gather',
      'the Supplies Shop, shelves stacked with labelled boxes',
      'the ward corridor with numbered doors',
      'the emergency bay, lit by a pulsing alert light',
    ],
    props: ['patient chart clipboard', 'stethoscope', 'medical trolley', 'supply crate',
      'wall clock', 'shift grade report card', 'treatment bed'],
    rig: 'animal',
  },
  {
    id: 'obby',
    label: 'Obby / parkour',
    pillar: 'challenge',
    premise: 'Players run an obstacle course of floating platforms toward a finish line, '
      + 'restarting at checkpoints when they fall.',
    locations: [
      'a run of floating coloured platforms over an empty void',
      'a checkpoint pad glowing at the end of a difficult section',
      'a spinning-blade obstacle stretched across a narrow walkway',
      'the finish arch with a leaderboard beside it',
    ],
    props: ['checkpoint pad', 'spinning obstacle', 'timer display', 'finish arch'],
    rig: 'r15',
  },
  {
    id: 'roleplay-town',
    label: 'Roleplay town',
    pillar: 'family-comedy',
    premise: 'Players live out everyday scenes — home, school, work — in a suburban Roblox town.',
    locations: [
      'a suburban living room with a sofa facing a blocky television',
      'a school classroom with rows of desks',
      'a kitchen with a counter island and stools',
      'a front driveway with a car parked on it',
    ],
    props: ['sofa', 'school desk', 'lunch tray', 'car', 'backpack'],
    rig: 'r15',
  },
  {
    id: 'hide-seek',
    label: 'Hide and seek',
    pillar: 'hide-and-seek',
    premise: 'One player counts while the rest hide across a themed map, until time runs out.',
    locations: [
      'a cluttered attic room stacked with crates',
      'a wide-open map with almost no cover, mid-count',
      'a corridor of identical lockers',
      'behind a stack of oversized props on a themed map',
    ],
    props: ['crate', 'locker', 'countdown timer', 'seeker marker'],
    rig: 'r15',
  },
  {
    id: 'survival',
    label: 'Night survival',
    pillar: 'mystery',
    premise: 'Players survive a run of nights, managing light and supplies while something '
      + 'moves outside.',
    locations: [
      'a small shelter interior lit by one lamp, night pressing at the windows',
      'a supply cache at the edge of a dark treeline',
      'a campfire clearing with the fire burning low',
    ],
    props: ['lantern', 'supply crate', 'campfire', 'night counter display'],
    rig: 'r15',
  },
];

export const worldById = (id) => GAME_WORLDS.find((w) => w.id === id) ?? null;

/**
 * Worlds that suit a pillar.
 *
 * Returns nothing when no world claims the pillar, rather than falling back to
 * the whole list — a caller reading `[0]` for a default would otherwise get
 * Animal Hospital's animal rig for an obby video.
 */
export function worldsForPillar(pillarId) {
  return GAME_WORLDS.filter((w) => w.pillar === pillarId);
}

/**
 * Characters from those games that a fan video would cast.
 *
 * `lore` is what the character does in the game. `appearance` is a described
 * look for prompting — a fan interpretation, not the official asset.
 */
export const GAME_CHARACTERS = [
  {
    id: 'dr-harlow',
    name: 'Dr. Harlow',
    game: 'animal-hospital',
    gameLabel: 'Animal Hospital',
    storyRole: 'Head doctor and supervisor',
    archetype: 'mentor and assessor',
    // Casting him fills the story's senior-vet slot rather than adding a second
    // doctor beside a generated one.
    replacesRole: 'vet',
    lore: 'The head doctor of the Animal Hospital, and the player’s mentor and supervisor. '
      + 'He appears at the end of each of the first six shifts to explain a mechanic and unlock '
      + 'a new area of the hospital. After those, he can be found in the lobby and the Supplies '
      + 'Shop, where players can talk to him. He grades each shift with a performance report, '
      + 'and brings bonuses during emergencies.',
    appearsIn: ['the lobby', 'the Supplies Shop', 'the end of a shift', 'an emergency call'],
    beats: [
      'delivers the performance grade at the end of a shift',
      'explains a mechanic the player just got wrong',
      'unlocks a new area and walks the player into it',
      'arrives mid-emergency with a bonus',
    ],
    rig: 'animal',
    ageCategory: 'Adult',
    personality: 'Calm, exacting, encouraging without softening the grade',

    // Summary fields, for the character bible card and anywhere a short line is
    // wanted. The authoritative description is `spec` below — these must stay
    // consistent with it, never contradict it.
    build: 'Classic stylized Roblox game-character construction: oversized head, short compact '
      + 'torso, slim cylindrical arms, short cylindrical legs, rounded mitten-like hands with no '
      + 'individually modelled fingers, small feet. Friendly toy-like proportions, not realistic '
      + 'human anatomy',
    head: 'Oversized angular deer head in warm golden-orange fur, with darker burnt-orange outer '
      + 'ears extending horizontally from both sides, small rounded inner ear forms, and bright '
      + 'orange vertical markings running symmetrically down the forehead and the bridge of the nose',
    faceDecal: 'Extremely large, sharply angled cartoon eyes with solid glossy black interiors, '
      + 'white outer sections, and one tiny white triangular highlight near the inner bottom '
      + 'corner of each eye. No visible eyebrows. No visible mouth — it is completely covered by '
      + 'the surgical mask',
    hat: 'Two tall symmetrical grey deer antlers curving upward and slightly outward in a '
      + 'simplified pointed low-poly silhouette, with a wide black medical headband wrapped '
      + 'horizontally around the forehead and a large circular silver-white doctor’s reflector '
      + 'centred precisely above the eyes, a small circular golden-orange hub at its exact centre, '
      + 'sitting in front of the lower antler area',
    hair: 'None — no hair of any kind; the moulded deer head is bare',
    outfit: 'A clean pale-grey/white doctor’s lab coat to the upper thighs with narrow notched '
      + 'lapels outlined in subtle grey seams, small dark-grey buttons running vertically down '
      + 'the centre and two outlined rectangular lower pockets with rounded bottoms; a white shirt '
      + 'beneath, a narrow red necktie centred under the collar, and bright royal-blue trousers',
    shoes: 'Small plain black shoes',
    accessories: 'A large vivid electric-blue surgical mask covering the entire muzzle, rounded '
      + 'and slightly projected with subtle horizontal folded ridges and pale grey-white straps to '
      + 'both sides of the face; a dark grey and black stethoscope around the neck with a small '
      + 'metallic-grey chest piece on his right side, black tubing curving across the chest and '
      + 'silver-grey earpieces; and a large rectangular matte-black hard-shell medical briefcase '
      + 'with a thick black handle and a small distressed red TOP SECRET label, held in his right '
      + 'hand — on the viewer’s left — hanging beside the leg and angled slightly outward',
    colors: 'Golden orange (face, inner head, hands), burnt orange (ears and darker facial '
      + 'regions), bright orange (forehead and nose markings), black and white (eyes), electric '
      + 'blue (mask and trousers), pale grey-white (lab coat and reflector), medium grey (antlers '
      + 'and medical components), deep red (necktie and briefcase label), matte black (headband, '
      + 'shoes, tubing and briefcase)',
    marks: 'The circular forehead reflector, the electric-blue surgical mask and the black '
      + 'TOP SECRET briefcase in his right hand — present in every appearance',
    expressions: 'Steady and level. The mask covers the mouth, so the eyes carry everything; the '
      + 'eye shape, spacing and expression never change',
    body: 'Stands upright and square, facing forward. The free hand hangs naturally beside the '
      + 'body while the right hand holds the briefcase',
    material: 'Polished Roblox-compatible 3D game character: smooth matte surfaces, simple '
      + 'low-poly geometry with clean bevelled edges, soft fabric-like lab-coat shading, and '
      + 'slight glossy highlights on the eyes, mask, reflector and stethoscope. No realistic fur '
      + 'strands, no skin pores, no photorealistic anatomy, no excessive texture detail',

    /**
     * The authoritative build sheet, section by section.
     *
     * Supplied by the creator against a reference image, so it is reproduced
     * as given rather than paraphrased — the point of a character sheet is that
     * it does not drift, and a summary of a lock is not a lock. Every image
     * prompt that has him in frame prints this whole block.
     */
    spec: [
      ['Head and face', [
        'Oversized angular deer head with warm golden-orange fur',
        'Darker burnt-orange outer ears extending horizontally from both sides',
        'Small rounded inner ear forms',
        'Bright orange vertical markings running symmetrically down the forehead and bridge of the nose',
        'Extremely large, sharply angled cartoon eyes',
        'Solid glossy black eye interiors',
        'White outer eye sections',
        'One tiny white triangular highlight near the inner bottom corner of each eye',
        'No visible eyebrows',
        'No visible mouth because it is completely covered by the surgical mask',
        'Preserve the exact eye shape, spacing, expression, markings, and head proportions',
      ]],
      ['Antlers and medical head mirror', [
        'Two tall, symmetrical grey deer antlers',
        'Each antler curves upward and slightly outward',
        'Simplified, pointed, low-poly antler silhouette',
        'Wide black medical headband wrapped horizontally around the forehead',
        'Large circular silver-white doctor’s reflector centred precisely above the eyes',
        'Small circular golden-orange hub in the exact centre of the reflector',
        'The reflector sits in front of the lower antler area',
      ]],
      ['Surgical mask', [
        'Large vivid electric-blue surgical mask covering the entire muzzle',
        'Rounded, slightly projected mask shape',
        'Subtle horizontal folded ridges across the mask',
        'Pale grey-white straps extending toward both sides of the face',
        'The mask keeps the same size, position, shape and saturated blue colour',
        'Do not expose the nose or mouth',
      ]],
      ['Body and proportions', [
        'Classic stylized Roblox game-character construction',
        'Oversized head relative to the body',
        'Short, compact torso',
        'Slim cylindrical arms',
        'Short cylindrical legs',
        'Rounded mitten-like hands with no individually modelled fingers',
        'Small feet',
        'Friendly toy-like proportions, not realistic human anatomy',
        'Standing upright and facing directly forward',
      ]],
      ['Medical outfit', [
        'Clean pale-grey/white doctor’s lab coat extending to the upper thighs',
        'Narrow notched lapels outlined with subtle grey seams',
        'Small dark-grey buttons running vertically down the centre',
        'Two outlined rectangular lower pockets with rounded bottoms',
        'White shirt beneath the coat',
        'Narrow red necktie centred beneath the collar',
        'Bright royal-blue trousers',
        'Small plain black shoes',
        'Preserve the precise garment lengths, colours and simple Roblox-style construction',
      ]],
      ['Stethoscope', [
        'Dark grey and black stethoscope resting around the neck',
        'Small metallic-grey chest piece hanging on Dr. Harlow’s right side',
        'Black flexible tubing curving across the chest',
        'Silver-grey earpieces and connecting components',
        'Placed without hiding the tie or coat details',
      ]],
      ['Hands and briefcase', [
        'Rounded golden-orange hands matching the face',
        'A large rectangular black medical briefcase held in his right hand, appearing on the viewer’s left',
        'The briefcase hangs beside the leg and is angled slightly outward',
        'Thick black handle',
        'Dark matte-black hard-shell construction',
        'A small distressed red label on the front reading exactly: TOP SECRET',
        'Do not place the briefcase in the opposite hand',
        'The free hand hangs naturally beside the body',
      ]],
      ['Materials and surfacing', [
        'Polished Roblox-compatible 3D game character',
        'Smooth matte surfaces',
        'Simple low-poly geometry with clean bevelled edges',
        'Soft fabric-like lab-coat shading',
        'Slight glossy highlights on the eyes, mask, reflector and stethoscope',
        'No realistic fur strands',
        'No skin pores',
        'No photorealistic anatomy',
        'No excessive texture detail',
        'Preserve the charming, slightly mysterious cartoon-doctor appearance',
      ]],
      ['Colour lock', [
        'Golden orange: face, inner head and hands',
        'Burnt orange: ears and darker facial regions',
        'Bright orange: forehead and nose markings',
        'Black and white: oversized eyes',
        'Electric blue: surgical mask and trousers',
        'Pale grey-white: lab coat and reflector',
        'Medium grey: antlers and medical components',
        'Deep red: necktie and briefcase label',
        'Matte black: headband, shoes, tubing and briefcase',
      ]],
    ],

    /**
     * The permanent identity lock, used verbatim in place of the generated one.
     *
     * A generated lock is assembled from summary fields; this was written
     * against the reference image, so it wins.
     */
    identityLock: 'PERMANENT IDENTITY LOCK — Dr. Harlow: in every image and every scene, preserve '
      + 'his exact deer head shape and oversized proportions, orange facial markings, eye design '
      + 'and expression, ear shape and placement, grey antler silhouette, black medical headband, '
      + 'circular forehead reflector, electric-blue surgical mask, pale-grey lab coat, red tie, '
      + 'stethoscope, royal-blue trousers, black shoes, golden-orange hands, and the black '
      + 'TOP SECRET briefcase held in his right hand. Do not replace, age, humanize, beautify, '
      + 'restyle, recolor or redesign Dr. Harlow. Do not change his clothing, accessories, '
      + 'proportions, facial markings or medical equipment between scenes.',

    /** Carried into the negative list of any prompt he appears in. */
    negatives: [
      'no human face', 'no realistic human body', 'no realistic deer anatomy', 'no realistic fur',
      'no brown eyes', 'no round ordinary eyes', 'no visible mouth', 'no visible nose',
      'no uncovered muzzle', 'no missing mask', 'no different mask color', 'no missing antlers',
      'no additional antlers', 'no asymmetrical antlers', 'no missing head mirror',
      'no miner’s lamp', 'no headlamp', 'no hat', 'no hair', 'no eyebrows', 'no extra clothing',
      'no scrubs', 'no pants color change', 'no coat color change', 'no missing tie', 'no bow tie',
      'no missing stethoscope', 'no extra medical tools', 'no backpack', 'no weapon',
      'no suitcase in the wrong hand', 'no ordinary brown suitcase', 'no altered briefcase label',
      'no extra fingers', 'no realistic fingers', 'no extra limbs', 'no duplicate character',
      'no cropped antlers', 'no anime style', 'no flat 2D illustration',
      'no text outside the briefcase label', 'no facial identity drift', 'no character redesign',
    ],

    /**
     * The reference-sheet render.
     *
     * A character sheet is generated once and then supplied alongside every
     * scene prompt, which is what actually holds a character steady across
     * separately generated images. Its framing rules are the opposite of a
     * scene's — full body, dead-on, neutral pose, empty background — so they
     * are kept apart rather than folded into the scene prompt.
     */
    reference: {
      presentation: [
        'Full-body character visible from antler tips to shoes',
        'Direct front-facing view',
        'Neutral standing pose',
        'Character centred in the frame',
        'Clean dark navy background',
        'Soft frontal studio lighting',
        'Gentle rim light around the antlers, ears and coat',
        'Sharp readable silhouette',
        'High-resolution 3D render',
        'Keep every important element inside the central safe area',
      ],
      negatives: ['no cropped feet', 'no side view', 'no action pose', 'no environment clutter',
        'no logo', 'no watermark', 'no signature'],
      closing: 'Deliver exactly one complete, front-facing Roblox-style 3D character render of '
        + 'Dr. Harlow, suitable as an exact character reference sheet for future Roblox scenes.',
    },

    usageNote: 'A recurring character from the Roblox game Animal Hospital, cast here the way '
      + 'a fan video casts one. Describe him as a fan interpretation — do not present generated '
      + 'images as the official in-game asset.',
  },
];

export const gameCharacterById = (id) => GAME_CHARACTERS.find((c) => c.id === id) ?? null;

/** Game characters that belong to a pillar's world. */
export function gameCharactersForPillar(pillarId) {
  const worlds = GAME_WORLDS.filter((w) => w.pillar === pillarId).map((w) => w.id);
  return GAME_CHARACTERS.filter((c) => worlds.includes(c.game));
}

/**
 * Turn a library entry into a cast member the rest of the planner understands.
 *
 * The shape matches a generated character exactly, so a game character can be
 * dropped into a cast, locked, exported and prompted with no special cases
 * anywhere downstream.
 */
export function toCastMember(entry) {
  return {
    id: entry.id,
    // Taking the role key it replaces lets a game character be saved, locked
    // and height-ordered exactly like a generated one.
    roleKey: entry.replacesRole ?? 'game',
    replacesRole: entry.replacesRole ?? null,
    name: entry.name,
    storyRole: entry.storyRole,
    archetype: entry.archetype,
    ageCategory: entry.ageCategory,
    personality: entry.personality,
    build: entry.build,
    head: entry.head,
    faceDecal: entry.faceDecal,
    hat: entry.hat,
    hair: entry.hair,
    outfit: entry.outfit,
    shoes: entry.shoes,
    accessories: entry.accessories,
    colors: entry.colors,
    marks: entry.marks,
    expressions: entry.expressions,
    body: entry.body,
    rig: entry.rig,
    material: 'Flat matte Roblox plastic surfacing on every part; fur and fabric are printed '
      + 'textures, never modelled',
    heightNote: '',
    fromGame: entry.gameLabel,
    lore: entry.lore,
    usageNote: entry.usageNote,
    mustNotChange: [
      'Head shape and markings', 'Printed face decal', 'Headwear', 'Outfit design and colours',
      'Footwear', 'Accessories', 'Avatar proportions',
    ],
    mayChange: [
      'Facial expression on the decal', 'Pose and gesture', 'Camera angle and distance',
      'Lighting on the character', 'Background behind them',
    ],
    // A character sheet's own negatives replace the generic ones — they are
    // specific to this character and far stricter.
    negatives: entry.negatives ?? [
      'no redesign between scenes', 'no outfit swap', 'no sculpted facial features',
      'no humanised proportions', 'no duplicate of this character in frame',
      'no extra limbs', 'no cropped face',
    ],
    // The full build sheet, printed in every prompt he appears in.
    spec: entry.spec ?? null,
    reference: entry.reference ?? null,
    // A supplied lock wins over a generated one: it was written against the
    // reference image, and a summary of a lock is not a lock.
    identityLock: entry.identityLock ?? '',
  };
}

/**
 * The one-off character reference sheet.
 *
 * Generate this once, then supply the resulting image alongside every scene
 * prompt — that is what actually holds a character steady across separately
 * generated frames. Its framing is the opposite of a scene's (full body,
 * dead-on, neutral pose, empty background), so it is built here rather than
 * bent out of the scene prompt.
 */
export function referenceSheetPrompt(entry, { render = 'cinematic' } = {}) {
  if (!entry) return '';
  const sections = (entry.spec ?? []).map(([title, lines]) =>
    `${title.toUpperCase()}\n${lines.map((l) => `  • ${l}`).join('\n')}`).join('\n\n');

  return [
    `Create one character reference sheet for ${entry.name}.`,
    '',
    styleBlock({ rig: entry.rig, render }),
    '',
    `CHARACTER IDENTITY — ${entry.name.toUpperCase()}`,
    `${entry.name} is a ${entry.ageCategory.toLowerCase()} character from the Roblox game `
      + `${entry.gameLabel}. This is a fan interpretation built from the description below, `
      + 'not a copy of any official asset.',
    '',
    sections,
    '',
    'PRESENTATION',
    (entry.reference?.presentation ?? []).map((l) => `  • ${l}`).join('\n'),
    '',
    entry.identityLock,
    '',
    `NEGATIVE PROMPT: ${[...(entry.negatives ?? []), ...(entry.reference?.negatives ?? [])]
      .join(', ')}.`,
    '',
    entry.reference?.closing ?? '',
  ].filter((line) => line != null && line !== false).join('\n').trim();
}
