/**
 * Character bibles.
 *
 * Generates original characters from role archetypes and produces the identity
 * lock paragraph that every image and video prompt repeats verbatim — that
 * repetition is the only mechanism keeping a character recognisable across
 * separately generated scenes.
 *
 * Nothing here references a real creator, a real avatar, or any branded or
 * copyrighted design.
 */

import { hashString, makeRandom } from './recommend.js';
import { ROLES } from './pillars.js';

/** Pools the generator draws from. Deliberately generic and original. */
const POOL = {
  vet: {
    names: ['Dr. Wren', 'Dr. Solen', 'Dr. Marlo', 'Dr. Ashby'],
    age: 'Adult',
    personality: 'Unhurried, watchful, speaks less than everyone around them',
    build: 'Tall and narrow, slightly stooped from leaning over tables',
    face: 'Long oval face, soft jaw, faint smile lines',
    eyes: 'Narrow hazel eyes, heavy upper lids',
    brows: 'Straight, dark, slightly uneven',
    hair: 'Short dark hair pushed back, one strand always loose at the temple',
    outfit: 'Sage-green scrub top, sleeves pushed to the forearm, charcoal trousers',
    shoes: 'Scuffed white clinic shoes',
    accessories: 'Steel-rimmed glasses worn low, ID card clipped at the hip',
    colors: 'Sage green, charcoal, warm steel',
    marks: 'A small pale scar across the left thumb knuckle',
    expressions: 'Neutral concentration; a brief closed-mouth smile when relieved',
    body: 'Moves deliberately, crouches rather than bends',
  },
  intern: {
    names: ['Poppy', 'Tam', 'Juno', 'Wilder'],
    age: 'Young adult',
    personality: 'Earnest, over-prepared, apologises before being blamed',
    build: 'Short and compact, shoulders slightly raised',
    face: 'Round face, full cheeks, small chin',
    eyes: 'Wide round brown eyes, high shine',
    brows: 'Thick and expressive, constantly moving',
    hair: 'Tight dark curls held back with a plain band',
    outfit: 'Oversized pale-blue scrub top, sleeves rolled twice, navy trousers',
    shoes: 'Bright orange trainers, obviously new',
    accessories: 'Pocket notebook, three pens clipped in a row',
    colors: 'Pale blue, navy, orange',
    marks: 'A folded corner on every page of the notebook',
    expressions: 'Alarm, then determination; rarely anything in between',
    body: 'Fast, slightly clumsy, checks over the shoulder often',
  },
  patient: {
    names: ['Pip', 'Bramble', 'Nub', 'Sorrel'],
    age: 'Very young',
    personality: 'Wary at first, completely trusting once won over',
    build: 'Small and round, oversized head relative to body',
    face: 'Blunt muzzle, wide-set features',
    eyes: 'Very large dark eyes with a single bright highlight',
    brows: 'None; brow ridge conveys expression',
    hair: 'Short mottled fur, tuft standing up between the ears',
    outfit: 'None; a loose bandage on one forelimb',
    shoes: 'None',
    accessories: 'A frayed cloth tag tied at the neck',
    colors: 'Sand, cream, faded red tag',
    marks: 'One ear permanently folded forward',
    expressions: 'Flattened ears when afraid, ears forward when curious',
    body: 'Low to the ground, moves in short bursts then freezes',
  },
  rival: {
    names: ['Cassian', 'Brix', 'Vero', 'Halden'],
    age: 'Teen',
    personality: 'Loud, certain, performs confidence they do not have',
    build: 'Broad shoulders, upright, takes up space',
    face: 'Square jaw, high cheekbones',
    eyes: 'Sharp pale-blue eyes, narrow',
    brows: 'High and angular, one habitually raised',
    hair: 'Bleached crop with dark roots, deliberately messy',
    outfit: 'Black bomber jacket over a white tee, cuffed dark jeans',
    shoes: 'Chunky black high-tops, laces loose',
    accessories: 'Oversized wristwatch worn face-in',
    colors: 'Black, white, cold silver',
    marks: 'A chipped front tooth visible only when grinning',
    expressions: 'Smirk at rest; genuine surprise breaks it completely',
    body: 'Gestures widely, leans back, arms often crossed',
  },
  parent: {
    names: ['Rosalind', 'Denny', 'Marta', 'Osric'],
    age: 'Adult',
    personality: 'Patient to a precise limit, then immovable',
    build: 'Sturdy, square-set, slightly rounded shoulders',
    face: 'Broad face, deep smile lines around the mouth',
    eyes: 'Deep-set brown eyes, tired',
    brows: 'Heavy and level',
    hair: 'Greying hair tied back loosely, strands escaping',
    outfit: 'Mustard cardigan over a plain grey tee, soft dark trousers',
    shoes: 'Worn house slippers',
    accessories: 'Reading glasses pushed up on the head, tea towel over shoulder',
    colors: 'Mustard, grey, warm brown',
    marks: 'A wooden ring on the right hand',
    expressions: 'Flat disbelief; a slow blink that means the conversation is over',
    body: 'Stands still and lets others move around them',
  },
  kid: {
    names: ['Bea', 'Toko', 'Nell', 'Ridge'],
    age: 'Child',
    personality: 'Total commitment to whatever the current idea is',
    build: 'Small, springy, never fully still',
    face: 'Round face, gap-toothed grin',
    eyes: 'Bright green eyes, very mobile',
    brows: 'Thin and high',
    hair: 'Sandy hair sticking up at the crown, obviously self-cut fringe',
    outfit: 'Striped red-and-white long sleeve, denim shorts',
    shoes: 'Mismatched socks, light-up trainers',
    accessories: 'A cardboard crown worn at all times',
    colors: 'Red, white, denim blue',
    marks: 'A plaster on one knee that is never the same knee twice',
    expressions: 'Delight and outrage, nothing in between',
    body: 'Bounces, spins, climbs on furniture',
  },
  noob: {
    names: ['Ollie', 'Sprig', 'Dex', 'Fen'],
    age: 'Teen',
    personality: 'Hopeful, undeterred by evidence, tries everything twice',
    build: 'Lanky, slightly too long in the arms',
    face: 'Narrow face, prominent ears',
    eyes: 'Light brown eyes, eyebrows always slightly hopeful',
    brows: 'Thin, angled up at the inner edge',
    hair: 'Flat mousy hair with an obvious cowlick',
    outfit: 'Plain yellow tee one size too big, grey joggers',
    shoes: 'Generic white trainers, grass-stained',
    accessories: 'A backpack always worn on both shoulders',
    colors: 'Yellow, grey, grass green',
    marks: 'One sock permanently lower than the other',
    expressions: 'Open-mouthed concentration; delighted disbelief at success',
    body: 'Leans in too close to whatever they are doing',
  },
  pro: {
    names: ['Ines', 'Kade', 'Roux', 'Silas'],
    age: 'Young adult',
    personality: 'Economical, unimpressed, never explains twice',
    build: 'Compact and balanced, low centre of gravity',
    face: 'Angular face, flat expression',
    eyes: 'Dark eyes, steady, rarely widen',
    brows: 'Straight and low',
    hair: 'Black hair scraped into a short tail',
    outfit: 'Fitted dark-teal jacket, black leggings',
    shoes: 'Low black trainers, well worn',
    accessories: 'A single plain cord bracelet',
    colors: 'Dark teal, black',
    marks: 'Tape wrapped around two fingers of the left hand',
    expressions: 'Almost none; a single raised brow is a strong reaction',
    body: 'Still until they move, then very fast',
  },
  helper: {
    names: ['Marlow', 'Sena', 'Quill', 'Bo'],
    age: 'Young adult',
    personality: 'Notices what others miss, acts before being asked',
    build: 'Average height, slightly hunched at the shoulders',
    face: 'Soft square face, freckles across the nose',
    eyes: 'Grey-green eyes, watchful',
    brows: 'Light and slightly furrowed',
    hair: 'Chin-length auburn hair tucked behind one ear',
    outfit: 'Rust-orange work shirt over a cream tee, canvas trousers',
    shoes: 'Brown lace-up boots',
    accessories: 'A canvas satchel worn across the body',
    colors: 'Rust orange, cream, canvas brown',
    marks: 'A pencil permanently behind the right ear',
    expressions: 'Quiet attention; a small nod instead of speaking',
    body: 'Approaches slowly, keeps hands visible',
  },
};

/** Never-change details, phrased for a prompt. */
export function identityLock(character) {
  return `IDENTITY LOCK — ${character.name}: preserve exactly the same face shape (${character.face}), `
    + `eyes (${character.eyes}), eyebrows (${character.brows}), hair (${character.hair}), `
    + `body proportions (${character.build}), outfit (${character.outfit}), footwear (${character.shoes}), `
    + `accessories (${character.accessories}) and signature colours (${character.colors}) in every scene. `
    + `Do not redesign, replace, age, beautify, restyle or alter this character in any way. `
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
    face: pool.face,
    eyes: pool.eyes,
    brows: pool.brows,
    hair: pool.hair,
    outfit: pool.outfit,
    shoes: pool.shoes,
    accessories: pool.accessories,
    colors: pool.colors,
    marks: pool.marks,
    expressions: pool.expressions,
    body: pool.body,
    material: 'Stylised game-character surfacing: smooth matte skin, soft fabric shading, no photoreal pores',
    heightNote: '',
    mustNotChange: [
      'Face shape and proportions', 'Eye shape and colour', 'Hairstyle and hairline',
      'Outfit design and colours', 'Footwear', 'Accessories', 'Apparent age', 'Body proportions',
    ],
    mayChange: [
      'Facial expression', 'Pose and gesture', 'Camera angle and distance',
      'Lighting on the character', 'Background behind them',
    ],
    negatives: [
      'no redesign between scenes', 'no outfit swap', 'no hairstyle change',
      'no age change', 'no added tattoos, makeup or jewellery', 'no duplicate of this character in frame',
      'no extra fingers or limbs', 'no cropped face',
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
