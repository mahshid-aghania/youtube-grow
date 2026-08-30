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
    build: 'Standard Roblox rig, upright and still; the head is oversized relative to the body',
    head: 'A moulded deer head accessory in tan and orange, with a lighter muzzle and two large '
      + 'grey antlers curving up and back as one rigid piece',
    faceDecal: 'A printed cartoon face: large angular black eyes with a single white highlight '
      + 'in each, set wide and slanted slightly inward',
    hat: 'A round silver head mirror on a black headband, worn centred on the forehead',
    hair: 'None — the moulded head is bare',
    outfit: 'An open white lab coat with two front pockets over a white shirt and dark red tie, '
      + 'and bright blue trousers',
    shoes: 'Flat dark navy shoes',
    accessories: 'A blue surgical mask covering the muzzle, a stethoscope around the neck, '
      + 'and a black case carried in one hand',
    colors: 'Tan and orange, white, bright blue, dark red',
    marks: 'The silver head mirror and the blue surgical mask — present in every appearance',
    expressions: 'Steady and level; the mask covers the mouth, so the eyes carry everything',
    body: 'Stands squarely and gestures with one hand while the other holds the case',
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
    negatives: [
      'no redesign between scenes', 'no outfit swap', 'no sculpted facial features',
      'no humanised proportions', 'no duplicate of this character in frame',
      'no extra limbs', 'no cropped face',
    ],
    identityLock: '',
  };
}
