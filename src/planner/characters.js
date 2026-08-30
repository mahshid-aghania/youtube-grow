/**
 * Character bibles.
 *
 * Generates original Roblox characters from role archetypes and produces the
 * identity lock paragraph that every image and video prompt repeats verbatim —
 * that repetition is the only mechanism keeping a character recognisable across
 * separately generated scenes.
 *
 * Every description is written in Roblox terms, because that is what a generator
 * needs to build a Roblox avatar. A character here has a moulded head accessory
 * and a printed face decal, not "a soft jaw and hazel eyes"; a hair accessory,
 * not strands; a printed shirt or a layered solid, not draping cloth. Describing
 * an avatar in human terms is what makes an image generator produce a Pixar
 * character wearing the right colours.
 *
 * These characters are this project's own inventions. Characters that already
 * exist in a Roblox game live in games.js and are cast deliberately.
 */

import { hashString, makeRandom } from './recommend.js';
import { ROLES } from './pillars.js';

/** Pools the generator draws from. Original, and described the way Roblox builds. */
const POOL = {
  vet: {
    names: ['Dr. Wren', 'Dr. Solen', 'Dr. Marlo', 'Dr. Ashby'],
    age: 'Adult',
    rig: 'animal',
    personality: 'Unhurried, watchful, speaks less than everyone around them',
    build: 'Standard Roblox rig, upright and still, with an oversized head on a narrow body',
    head: 'A moulded grey-blue cat head accessory with a pale muzzle and small upright ears',
    faceDecal: 'A printed face: narrow half-closed eyes and a short flat line of a mouth',
    hat: 'A soft sage-green surgical cap covering the top of the head',
    hair: 'None — the moulded head is bare',
    outfit: 'Sage-green scrub top and trousers printed flat onto the torso and legs',
    shoes: 'Plain white clinic shoes',
    accessories: 'A stethoscope layered around the neck, ID card clipped at the hip',
    colors: 'Sage green, grey-blue, white',
    marks: 'A single notch cut into the left ear of the moulded head',
    expressions: 'The printed face stays neutral; the head tilts instead',
    body: 'Moves in deliberate straight lines, crouches from the hip',
  },
  intern: {
    names: ['Poppy', 'Tam', 'Juno', 'Wilder'],
    age: 'Young adult',
    rig: 'r15',
    personality: 'Earnest, over-prepared, apologises before being blamed',
    build: 'A short R15 rig with a slightly oversized head',
    head: 'Standard Roblox block head in a light tan',
    faceDecal: 'A printed face: very large round eyes with a big white highlight in each, '
      + 'and a small open oval mouth',
    hat: 'None',
    hair: 'A moulded dark curly hair accessory sitting close to the head like a cap',
    outfit: 'An oversized pale-blue scrub top printed on the torso, navy trousers printed on the legs',
    shoes: 'Bright orange trainers, obviously new',
    accessories: 'A small notebook held in one hand, three pens layered in the chest pocket',
    colors: 'Pale blue, navy, orange',
    marks: 'One of the three pens is always a different colour from the other two',
    expressions: 'The printed face swaps between wide alarm and a flat determined line',
    body: 'Quick and slightly jerky, glances over the shoulder',
  },
  patient: {
    names: ['Pip', 'Bramble', 'Nub', 'Sorrel'],
    age: 'Very young',
    rig: 'animal',
    personality: 'Wary at first, completely trusting once won over',
    build: 'A very small Roblox rig, head nearly as wide as the torso',
    head: 'A moulded round rabbit head accessory in sand and cream, with one ear folded '
      + 'forward as part of the mould',
    faceDecal: 'A printed face: huge dark oval eyes with one bright highlight each, and a '
      + 'tiny curved mouth',
    hat: 'None',
    hair: 'None',
    outfit: 'No clothing printed on the body; a white bandage accessory wrapped around one arm',
    shoes: 'None',
    accessories: 'A frayed red cloth tag layered at the neck',
    colors: 'Sand, cream, faded red',
    marks: 'The permanently folded left ear',
    expressions: 'The printed eyes narrow when afraid and open wide when curious',
    body: 'Stays low, moves in short bursts then freezes',
  },
  rival: {
    names: ['Cassian', 'Brix', 'Vero', 'Halden'],
    age: 'Teen',
    rig: 'r15',
    personality: 'Loud, certain, performs confidence they do not have',
    build: 'A broad R15 rig, shoulders squared, taking up space',
    head: 'Standard Roblox block head in a pale colour',
    faceDecal: 'A printed face: narrow slanted eyes and a wide one-sided smirk',
    hat: 'A black cap worn backwards',
    hair: 'A moulded bleached-blond hair accessory with dark roots, spiked at the front',
    outfit: 'A black bomber jacket layered over a white printed tee, dark jeans printed on the legs',
    shoes: 'Chunky black high-tops',
    accessories: 'An oversized watch layered on one wrist',
    colors: 'Black, white, cold silver',
    marks: 'The cap is always backwards, never turned round',
    expressions: 'Printed smirk at rest; swaps to wide-eyed shock in a single frame',
    body: 'Wide gestures, leans back, arms often crossed',
  },
  parent: {
    names: ['Rosalind', 'Denny', 'Marta', 'Osric'],
    age: 'Adult',
    rig: 'r15',
    personality: 'Patient to a precise limit, then immovable',
    build: 'A sturdy, square-set R15 rig that stands still',
    head: 'Standard Roblox block head in a warm tan',
    faceDecal: 'A printed face: level half-lidded eyes and a flat straight mouth',
    hat: 'None',
    hair: 'A moulded grey hair accessory pulled back into a low bun',
    outfit: 'A mustard cardigan layered over a grey printed tee, dark trousers printed on the legs',
    shoes: 'Soft brown house slippers',
    accessories: 'Reading glasses pushed up onto the hair, a tea towel layered over one shoulder',
    colors: 'Mustard, grey, warm brown',
    marks: 'The tea towel sits over the same shoulder every time',
    expressions: 'The printed face barely changes; a slow blink ends the conversation',
    body: 'Stands still and lets everyone else move around them',
  },
  kid: {
    names: ['Bea', 'Toko', 'Nell', 'Ridge'],
    age: 'Child',
    rig: 'r6',
    personality: 'Total commitment to whatever the current idea is',
    build: 'A short R6 rig — blocky, wide, never fully still',
    head: 'Standard Roblox block head in a light colour',
    faceDecal: 'A printed face: big round eyes and an enormous open grin',
    hat: 'A cardboard crown, worn at all times',
    hair: 'A moulded sandy hair accessory sticking up at the crown',
    outfit: 'A red-and-white striped long sleeve printed on the torso and arms, denim shorts '
      + 'printed on the legs',
    shoes: 'Mismatched socks and light-up trainers',
    accessories: 'Nothing beyond the crown',
    colors: 'Red, white, denim blue',
    marks: 'The crown always sits slightly crooked',
    expressions: 'Printed grin or printed outrage, nothing in between',
    body: 'Bounces, spins, climbs on anything in reach',
  },
  noob: {
    names: ['Ollie', 'Sprig', 'Dex', 'Fen'],
    age: 'Teen',
    rig: 'r6',
    personality: 'Hopeful, undeterred by evidence, tries everything twice',
    build: 'A standard R6 rig — default blocky proportions, nothing customised',
    head: 'The classic yellow Roblox block head',
    faceDecal: 'The classic printed smile: two small black oval eyes and a wide simple grin',
    hat: 'None',
    hair: 'None',
    outfit: 'A plain green printed shirt and blue printed trousers — the default starter look',
    shoes: 'None; the legs end flat',
    accessories: 'A backpack layered on both shoulders',
    colors: 'Yellow, green, blue',
    marks: 'Entirely unaccessorised apart from the backpack — the plainness is the joke',
    expressions: 'The printed grin never changes, whatever is happening',
    body: 'Leans in far too close to whatever they are doing',
  },
  pro: {
    names: ['Ines', 'Kade', 'Roux', 'Silas'],
    age: 'Young adult',
    rig: 'r15',
    personality: 'Economical, unimpressed, never explains twice',
    build: 'A compact, balanced R15 rig with a low centre of gravity',
    head: 'Standard Roblox block head in a deep tan',
    faceDecal: 'A printed face: flat narrow eyes and a small straight mouth',
    hat: 'A plain black headset layered over the head',
    hair: 'A moulded black hair accessory scraped into a short tail',
    outfit: 'A fitted dark-teal jacket layered over the torso, black leggings printed on the legs',
    shoes: 'Low black trainers',
    accessories: 'A single plain cord bracelet',
    colors: 'Dark teal, black',
    marks: 'Tape layered around two fingers of the left hand',
    expressions: 'The printed face never changes; the body does all the reacting',
    body: 'Completely still until they move, then very fast',
  },
  helper: {
    names: ['Marlow', 'Sena', 'Quill', 'Bo'],
    age: 'Young adult',
    rig: 'r15',
    personality: 'Notices what others miss, acts before being asked',
    build: 'An average R15 rig with the shoulders slightly forward',
    head: 'Standard Roblox block head in a mid tan',
    faceDecal: 'A printed face: watchful oval eyes and a small closed smile',
    hat: 'None',
    hair: 'A moulded auburn bob accessory tucked behind one ear',
    outfit: 'A rust-orange work shirt layered over a cream printed tee, canvas trousers printed '
      + 'on the legs',
    shoes: 'Brown lace-up boots',
    accessories: 'A canvas satchel layered across the body, a pencil behind one ear',
    colors: 'Rust orange, cream, canvas brown',
    marks: 'The pencil behind the right ear, always',
    expressions: 'The printed face holds one quiet attentive look',
    body: 'Approaches slowly and keeps both hands visible',
  },
};

/** Never-change details, phrased for a prompt. */
export function identityLock(character) {
  return `IDENTITY LOCK — ${character.name}: preserve exactly the same head (${character.head}), `
    + `printed face decal (${character.faceDecal}), headwear (${character.hat}), `
    + `hair accessory (${character.hair}), avatar build (${character.build}), `
    + `outfit (${character.outfit}), footwear (${character.shoes}), `
    + `accessories (${character.accessories}) and signature colours (${character.colors}) in every scene. `
    + `Do not redesign, replace, age, humanise, beautify or restyle this character in any way, `
    + `and do not give the face sculpted features — it stays a printed decal. `
    + `Keep the ${character.marks} visible.`;
}

/**
 * Build one character from a role key.
 *
 * @param {string} roleKey  a key of ROLES
 * @param {string} seedStr  anything stable — the same string yields the same character
 */
export function buildCharacter(roleKey, seedStr) {
  const pool = POOL[roleKey] ?? POOL.helper;
  const meta = ROLES[roleKey] ?? ROLES.helper;
  const rand = makeRandom(hashString(`${seedStr}|${roleKey}`));
  const name = pool.names[Math.floor(rand() * pool.names.length) % pool.names.length];

  const character = {
    id: `${roleKey}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    roleKey,
    name,
    storyRole: meta.role,
    archetype: meta.archetype,
    ageCategory: pool.age,
    personality: pool.personality,
    build: pool.build,
    rig: pool.rig,
    head: pool.head,
    faceDecal: pool.faceDecal,
    hat: pool.hat,
    hair: pool.hair,
    outfit: pool.outfit,
    shoes: pool.shoes,
    accessories: pool.accessories,
    colors: pool.colors,
    marks: pool.marks,
    expressions: pool.expressions,
    body: pool.body,
    material: 'Flat matte Roblox plastic surfacing on every part; fur, fabric and detail are '
      + 'printed textures, never modelled geometry',
    heightNote: '',
    mustNotChange: [
      'Head part or moulded head accessory', 'Printed face decal', 'Headwear',
      'Hair accessory', 'Outfit design and colours', 'Footwear', 'Accessories',
      'Apparent age', 'Avatar rig and proportions',
    ],
    mayChange: [
      'Facial expression', 'Pose and gesture', 'Camera angle and distance',
      'Lighting on the character', 'Background behind them',
    ],
    negatives: [
      'no redesign between scenes', 'no outfit swap', 'no hair accessory change',
      'no age change', 'no sculpted facial features', 'no humanised proportions',
      'no duplicate of this character in frame', 'no extra limbs', 'no cropped face',
    ],
  };

  character.identityLock = identityLock(character);
  return character;
}

/** Relative heights, so a cast reads consistently across scenes. */
const HEIGHT_ORDER = ['patient', 'kid', 'intern', 'noob', 'helper', 'pro', 'rival', 'parent', 'vet'];

/**
 * Build the full cast a seed calls for, with relative heights resolved.
 *
 * `saved` lets a user's stored character take over its role, so a recurring
 * character keeps its established identity across every plan that uses it.
 */
export function buildCast(seed, seedStr, saved = {}) {
  const cast = seed.roles.map((roleKey) => saved[roleKey]
    ? { ...saved[roleKey], roleKey, reused: true }
    : buildCharacter(roleKey, seedStr));

  const ordered = [...cast].sort(
    (a, b) => HEIGHT_ORDER.indexOf(a.roleKey) - HEIGHT_ORDER.indexOf(b.roleKey));

  ordered.forEach((c, i) => {
    if (ordered.length === 1) { c.heightNote = 'Only character on screen; frame at mid-body.'; return; }
    if (i === 0) c.heightNote = `Shortest of the cast — clearly below ${ordered[i + 1].name}.`;
    else if (i === ordered.length - 1) c.heightNote = `Tallest of the cast — clearly above ${ordered[i - 1].name}.`;
    else c.heightNote = `Taller than ${ordered[i - 1].name}, shorter than ${ordered[i + 1].name}.`;
  });

  return cast;
}
