import { styleBlock } from './humanstyle.js';

/**
 * Recurring story worlds and their known guest characters.
 *
 * Two different things live here, and the difference matters.
 *
 * GAME_WORLDS give a plan somewhere real to be set. A Short about a clinic should
 * be staged in the clinic — its reception, its treatment rooms, its supply room —
 * not in "a bright examination room". Naming the actual locations and props is
 * what makes a generated scene feel like a real, specific place.
 *
 * GAME_CHARACTERS are recurring guest characters a series can cast because the
 * audience recognises them across videos. They are real people, described for
 * prompting so they stay consistent from Short to Short.
 *
 * The generated cast in characters.js stays entirely original. These are opted
 * into per day, by choosing one.
 */

/** Locations and props that give each recurring setting a real, specific place. */
export const GAME_WORLDS = [
  {
    id: 'animal-hospital',
    label: 'Community clinic',
    pillar: 'animal-hospital',
    premise: 'Staff work shifts at a busy community clinic, treating people who arrive in need '
      + 'and being mentored by a senior doctor.',
    locations: [
      'the clinic reception desk, with a queue of patients behind it',
      'a treatment room with two beds side by side and a wall-mounted chart',
      'the staff room between shifts, where the team gathers',
      'the supply room, shelves stacked with labelled boxes',
      'the ward corridor with numbered doors',
      'the emergency bay, lit by a pulsing alert light',
    ],
    props: ['patient chart clipboard', 'stethoscope', 'medical trolley', 'supply crate',
      'wall clock', 'shift report card', 'treatment bed'],
    look: 'natural',
  },
  {
    id: 'obby',
    label: 'Obstacle challenge',
    pillar: 'challenge',
    premise: 'People take on a physical obstacle course toward a finish line, starting over when '
      + 'they fall.',
    locations: [
      'a run of obstacles across an outdoor course',
      'a checkpoint marked at the end of a difficult section',
      'a spinning obstacle stretched across a narrow beam',
      'the finish line with a leaderboard beside it',
    ],
    props: ['checkpoint marker', 'spinning obstacle', 'timer display', 'finish banner'],
    look: 'natural',
  },
  {
    id: 'roleplay-town',
    label: 'Everyday town',
    pillar: 'family-comedy',
    premise: 'Ordinary everyday scenes — home, school, work — play out across a small town.',
    locations: [
      'a suburban living room with a sofa facing a television',
      'a school classroom with rows of desks',
      'a kitchen with a counter island and stools',
      'a front driveway with a car parked on it',
    ],
    props: ['sofa', 'school desk', 'lunch tray', 'car', 'backpack'],
    look: 'natural',
  },
  {
    id: 'hide-seek',
    label: 'Hide and seek',
    pillar: 'hide-and-seek',
    premise: 'One person counts while the rest hide across a location, until time runs out.',
    locations: [
      'a cluttered attic stacked with crates',
      'a wide-open yard with almost no cover, mid-count',
      'a corridor of identical lockers',
      'behind a stack of boxes in a storeroom',
    ],
    props: ['crate', 'locker', 'countdown timer', 'seeker marker'],
    look: 'natural',
  },
  {
    id: 'survival',
    label: 'Night survival',
    pillar: 'mystery',
    premise: 'A group gets through a run of nights, managing light and supplies while something '
      + 'moves outside.',
    locations: [
      'a small cabin interior lit by one lamp, night pressing at the windows',
      'a supply cache at the edge of a dark treeline',
      'a campfire clearing with the fire burning low',
    ],
    props: ['lantern', 'supply crate', 'campfire', 'night counter display'],
    look: 'natural',
  },
];

export const worldById = (id) => GAME_WORLDS.find((w) => w.id === id) ?? null;

/**
 * Worlds that suit a pillar.
 *
 * Returns nothing when no world claims the pillar, rather than falling back to
 * the whole list — a caller reading `[0]` for a default would otherwise get the
 * wrong setting for a pillar it does not belong to.
 */
export function worldsForPillar(pillarId) {
  return GAME_WORLDS.filter((w) => w.pillar === pillarId);
}

/**
 * Recurring guest characters a series would cast.
 *
 * `lore` is what the character does across the series. `appearance` is a
 * described real-human look for prompting, so they hold steady between videos.
 */
export const GAME_CHARACTERS = [
  {
    id: 'dr-harlow',
    name: 'Dr. Harlow',
    game: 'animal-hospital',
    gameLabel: 'the clinic series',
    storyRole: 'Head doctor and supervisor',
    archetype: 'mentor and assessor',
    // Casting him fills the story's senior-doctor slot rather than adding a
    // second doctor beside a generated one.
    replacesRole: 'vet',
    lore: 'The head doctor of the clinic, and the newcomer’s mentor and supervisor. He appears at '
      + 'the end of each of the first six shifts to explain what went wrong and to hand over a new '
      + 'responsibility. After those, he can be found in the staff room and the supply room, where '
      + 'the team can talk to him. He grades each shift with a performance report, and steps in '
      + 'during emergencies.',
    appearsIn: ['the staff room', 'the supply room', 'the end of a shift', 'an emergency call'],
    beats: [
      'delivers the performance grade at the end of a shift',
      'explains what the newcomer just got wrong',
      'hands over a new responsibility and walks them into it',
      'arrives mid-emergency and takes charge',
    ],
    /**
     * The moment he is known for, folded into the beat it belongs to.
     *
     * He arrives at the end of a shift and grades it, so his beat is the payoff —
     * casting him should give the video the scene the audience already associates
     * with him, not a generic close with his face on it.
     */
    storyBeat: {
      beat: 'payoff',
      // Used when the beat does not already have him in it.
      action: '{name} arrives at the end of the shift, looks over what happened, '
        + 'and hands across the performance report.',
      // Used when it does — several seeds already end on the senior doctor
      // arriving, and appending the full sentence would have him arrive twice.
      continuation: 'He looks over what happened and hands across the performance report.',
      line: 'Shift report. You did better than you think.',
      caption: 'SHIFT REPORT',
    },
    look: 'polished',
    ageCategory: 'Adult',
    personality: 'Calm, exacting, encouraging without softening the grade',

    // Summary fields, for the character bible card and anywhere a short line is
    // wanted. The authoritative description is `spec` below — these must stay
    // consistent with it, never contradict it.
    build: 'A tall, composed man in his early sixties with an upright, unhurried posture and the '
      + 'steady stillness of someone who has done this for decades',
    face: 'A weathered, kindly face with deep smile lines, a strong jaw shadowed with grey stubble, '
      + 'warm olive skin and a calm, level set to the features',
    eyes: 'Sharp, attentive grey eyes behind thin silver-rimmed glasses, framed by heavy greying brows',
    hair: 'Neatly combed steel-grey hair, receding a little at the temples',
    headwear: 'A silver-white circular head mirror worn on a black band across the forehead, a small '
      + 'golden hub at its centre',
    outfit: 'A clean pale-grey doctor’s lab coat to the thigh over a white shirt and a narrow red '
      + 'necktie, with royal-blue trousers',
    shoes: 'Plain polished black shoes',
    accessories: 'A vivid electric-blue surgical mask usually pulled down under the chin, a dark '
      + 'stethoscope around the neck, and a matte-black hard-shell briefcase with a small distressed '
      + 'red TOP SECRET label, carried in his right hand',
    colors: 'Pale grey and white (coat), electric blue (mask), deep red (tie and briefcase label), '
      + 'royal blue (trousers), silver (glasses and head mirror), matte black (briefcase and shoes)',
    marks: 'The circular forehead head mirror, the electric-blue mask and the black TOP SECRET '
      + 'briefcase in his right hand — present in every appearance',
    expressions: 'Steady and level; warmth shows in the eyes and the smile lines rather than big '
      + 'movement',
    body: 'Stands upright and square, facing forward. The free hand hangs naturally beside the body '
      + 'while the right hand holds the briefcase',

    /**
     * The authoritative build sheet, section by section.
     *
     * Supplied by the creator against a reference image, so it is reproduced as
     * given rather than paraphrased — the point of a character sheet is that it
     * does not drift, and a summary of a lock is not a lock. Every image prompt
     * that has him in frame prints this whole block.
     */
    spec: [
      ['Face and head', [
        'A real man in his early sixties with warm olive skin',
        'Weathered, kindly face with deep smile lines and forehead creases',
        'Strong jaw shadowed with short grey stubble',
        'Sharp attentive grey eyes behind thin silver-rimmed glasses',
        'Heavy greying eyebrows',
        'Neatly combed steel-grey hair, receding slightly at the temples',
        'Preserve the exact face, eye colour, glasses and calm level expression',
      ]],
      ['Head mirror', [
        'A silver-white circular doctor’s head mirror worn on a black band across the forehead',
        'A small golden-orange hub at the exact centre of the mirror',
        'Sits squarely above the eyes',
      ]],
      ['Surgical mask', [
        'A vivid electric-blue surgical mask',
        'Usually pulled down and resting under the chin so the face stays visible',
        'Pale grey-white ear straps',
        'Keeps the same size, shape and saturated blue colour',
      ]],
      ['Build and posture', [
        'Tall, composed man with an upright, unhurried posture',
        'Real, natural adult human proportions',
        'Steady and still; stands facing forward',
      ]],
      ['Medical outfit', [
        'Clean pale-grey doctor’s lab coat extending to the thigh',
        'Narrow notched lapels with subtle grey seams',
        'Small dark-grey buttons down the centre',
        'Two lower pockets',
        'White shirt beneath the coat',
        'Narrow red necktie centred beneath the collar',
        'Royal-blue trousers',
        'Plain polished black shoes',
        'Preserve the precise garment colours and cut',
      ]],
      ['Stethoscope', [
        'A dark grey and black stethoscope resting around the neck',
        'Small metallic chest piece hanging on his right side',
        'Black flexible tubing curving across the chest',
        'Placed without hiding the tie or coat details',
      ]],
      ['Hands and briefcase', [
        'Real, natural adult hands',
        'A large rectangular matte-black hard-shell briefcase held in his right hand, appearing on the viewer’s left',
        'The briefcase hangs beside the leg, angled slightly outward',
        'Thick black handle',
        'A small distressed red label on the front reading exactly: TOP SECRET',
        'Do not place the briefcase in the opposite hand',
        'The free hand hangs naturally beside the body',
      ]],
      ['Skin and rendering', [
        'Fully photoreal real human',
        'Real skin with pores, fine lines and natural texture',
        'Real hair made of individual strands',
        'Real fabric that folds and creases',
        'No cartoon, no 3D-render look, no plastic or waxy skin',
        'Preserve the calm, reassuring, slightly mysterious veteran-doctor presence',
      ]],
      ['Colour lock', [
        'Pale grey and white: lab coat and head mirror',
        'Electric blue: surgical mask',
        'Deep red: necktie and briefcase label',
        'Royal blue: trousers',
        'Silver: glasses and head-mirror rim',
        'Matte black: briefcase and shoes',
      ]],
    ],

    /**
     * The permanent identity lock, used verbatim in place of the generated one.
     *
     * A generated lock is assembled from summary fields; this was written against
     * the reference image, so it wins.
     */
    identityLock: 'PERMANENT IDENTITY LOCK — Dr. Harlow: in every image and every scene, preserve '
      + 'his exact face — a real man in his early sixties with warm olive skin, grey stubble, '
      + 'silver-rimmed glasses, grey eyes and combed steel-grey hair — along with the silver '
      + 'circular forehead head mirror on its black band, the electric-blue surgical mask under his '
      + 'chin, the pale-grey lab coat, red tie, stethoscope, royal-blue trousers, black shoes, and '
      + 'the black TOP SECRET briefcase held in his right hand. Do not recast, age further, '
      + 'restyle, beautify, recolour, cartoonify or redesign Dr. Harlow. Do not change his clothing, '
      + 'accessories, features or equipment between scenes, and keep him a real, photoreal human.',

    /** Carried into the negative list of any prompt he appears in. */
    negatives: [
      'no cartoon or animated look', 'no 3D-render or game-avatar look', 'no plastic or waxy skin',
      'no antlers', 'no animal head', 'no deer features', 'no fur',
      'no missing glasses', 'no missing head mirror', 'no miner’s lamp', 'no headlamp',
      'no different mask colour', 'no missing mask', 'no hat', 'no eyebrows removed',
      'no scrubs', 'no trouser colour change', 'no coat colour change', 'no missing tie', 'no bow tie',
      'no missing stethoscope', 'no extra medical tools', 'no backpack', 'no weapon',
      'no briefcase in the wrong hand', 'no ordinary brown briefcase', 'no altered briefcase label',
      'no extra fingers', 'no extra limbs', 'no duplicate character',
      'no anime style', 'no flat 2D illustration',
      'no text outside the briefcase label', 'no facial identity drift', 'no character redesign',
    ],

    /**
     * The reference-sheet render.
     *
     * A character sheet is generated once and then supplied alongside every scene
     * prompt, which is what actually holds a character steady across separately
     * generated images. Its framing rules are the opposite of a scene's — full
     * body, dead-on, neutral pose, empty background — so they are kept apart
     * rather than folded into the scene prompt.
     */
    reference: {
      presentation: [
        'Full-body character visible from head to shoes',
        'Direct front-facing view',
        'Neutral standing pose',
        'Character centred in the frame',
        'Clean dark navy background',
        'Soft frontal studio lighting',
        'Gentle rim light around the head and coat',
        'Sharp readable silhouette',
        'High-resolution photorealistic render',
        'Keep every important element inside the central safe area',
      ],
      negatives: ['no cropped feet', 'no side view', 'no action pose', 'no environment clutter',
        'no logo', 'no watermark', 'no signature'],
      closing: 'Deliver exactly one complete, front-facing photorealistic full-body portrait of '
        + 'Dr. Harlow, suitable as an exact character reference sheet for future scenes.',
    },

    usageNote: 'A recurring guest character in the clinic series, cast here as a real person. '
      + 'Describe him as a consistent real human across every video.',
  },
];

export const gameCharacterById = (id) => GAME_CHARACTERS.find((c) => c.id === id) ?? null;

/** Guest characters that belong to a pillar's world. */
export function gameCharactersForPillar(pillarId) {
  const worlds = GAME_WORLDS.filter((w) => w.pillar === pillarId).map((w) => w.id);
  return GAME_CHARACTERS.filter((c) => worlds.includes(c.game));
}

/**
 * Turn a library entry into a cast member the rest of the planner understands.
 *
 * The shape matches a generated character exactly, so a guest character can be
 * dropped into a cast, locked, exported and prompted with no special cases
 * anywhere downstream.
 */
export function toCastMember(entry) {
  return {
    id: entry.id,
    // Taking the role key it replaces lets a guest character be saved, locked
    // and height-ordered exactly like a generated one.
    roleKey: entry.replacesRole ?? 'game',
    replacesRole: entry.replacesRole ?? null,
    name: entry.name,
    storyRole: entry.storyRole,
    archetype: entry.archetype,
    ageCategory: entry.ageCategory,
    personality: entry.personality,
    build: entry.build,
    face: entry.face,
    eyes: entry.eyes,
    hair: entry.hair,
    headwear: entry.headwear,
    outfit: entry.outfit,
    shoes: entry.shoes,
    accessories: entry.accessories,
    colors: entry.colors,
    marks: entry.marks,
    expressions: entry.expressions,
    body: entry.body,
    look: entry.look,
    heightNote: '',
    fromGame: entry.gameLabel,
    lore: entry.lore,
    usageNote: entry.usageNote,
    mustNotChange: [
      'Face and features', 'Eyes', 'Hair', 'Headwear', 'Outfit design and colours',
      'Footwear', 'Accessories', 'Build and proportions',
    ],
    mayChange: [
      'Facial expression', 'Pose and gesture', 'Camera angle and distance',
      'Lighting on the character', 'Background behind them',
    ],
    // A character sheet's own negatives replace the generic ones — they are
    // specific to this character and far stricter.
    negatives: entry.negatives ?? [
      'no recast between scenes', 'no outfit swap', 'no cartoon or stylised face',
      'no plastic or doll-like skin', 'no duplicate of this character in frame',
      'no extra limbs', 'no cropped face',
    ],
    // The full build sheet, printed in every prompt he appears in.
    spec: entry.spec ?? null,
    reference: entry.reference ?? null,
    beats: entry.beats ?? [],
    storyBeat: entry.storyBeat ?? null,
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
    styleBlock({ look: entry.look, render }),
    '',
    `CHARACTER IDENTITY — ${entry.name.toUpperCase()}`,
    `${entry.name} is a ${entry.ageCategory.toLowerCase()} recurring character in ${entry.gameLabel}. `
      + 'Build him as a consistent real human from the description below.',
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
