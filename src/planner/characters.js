/**
 * Character bibles.
 *
 * Generates original, real human characters from role archetypes and produces
 * the identity lock paragraph that every image and video prompt repeats verbatim —
 * that repetition is the only mechanism keeping a character recognisable across
 * separately generated scenes.
 *
 * Every description is written the way a real person actually looks, because this
 * niche is faceless live-action story Shorts: real people in real places. A
 * character here has a real face with real features, real hair made of strands,
 * and real clothing that folds — never a printed decal, a moulded accessory or a
 * plastic shell. Describing a person in game-avatar terms is what makes an image
 * generator produce a cartoon or a game render instead of a believable human.
 *
 * These characters are this project's own inventions. Characters that already
 * exist elsewhere live in games.js and are cast deliberately.
 */

import { hashString, makeRandom } from './recommend.js';
import { ROLES } from './pillars.js';

/** Pools the generator draws from. Original, and described as real people look. */
const POOL = {
  vet: {
    names: ['Dr. Wren', 'Dr. Solen', 'Dr. Marlo', 'Dr. Ashby'],
    age: 'Adult',
    look: 'polished',
    personality: 'Unhurried, watchful, speaks less than everyone around them',
    build: 'Middle height, calm and upright, an unhurried physical stillness',
    face: 'A lined, weathered adult face with a strong jaw, warm mid-brown skin and faint '
      + 'crow\'s feet from years of squinting under clinic lights',
    eyes: 'Deep-set dark brown eyes, steady and half-lidded, that rarely widen',
    hair: 'Short salt-and-pepper hair, neatly combed, greying at the temples',
    headwear: 'A soft sage-green surgical cap pushed back off the forehead',
    outfit: 'Sage-green scrubs, sleeves pushed to the elbow, slightly creased from a long shift',
    shoes: 'Scuffed white clinic clogs',
    accessories: 'A stethoscope resting around the neck, an ID badge clipped at the hip',
    colors: 'Sage green, grey, white',
    marks: 'A thin old scar through the left eyebrow',
    expressions: 'Reads as calm; the only tell is a slow blink and a slight head tilt',
    body: 'Moves in deliberate, economical lines; crouches from the knees, not the back',
  },
  intern: {
    names: ['Poppy', 'Tam', 'Juno', 'Wilder'],
    age: 'Young adult',
    look: 'natural',
    personality: 'Earnest, over-prepared, apologises before being blamed',
    build: 'Slight and slightly hunched, always a half-step too close',
    face: 'A young, open, faintly freckled face with light tan skin and softly rounded cheeks',
    eyes: 'Large, quick, anxious hazel eyes that dart to whoever is in charge',
    hair: 'Dark curly hair cropped close, a little flattened on one side',
    headwear: 'None',
    outfit: 'An oversized pale-blue scrub top that never quite fits, navy trousers rolled at the ankle',
    shoes: 'Bright orange trainers, obviously brand new',
    accessories: 'A dog-eared notebook clutched in one hand, three pens crammed in the chest pocket',
    colors: 'Pale blue, navy, orange',
    marks: 'One of the three pens is always a different colour from the other two',
    expressions: 'Flickers between wide-eyed alarm and a tight, determined line',
    body: 'Quick and slightly jerky; keeps glancing over one shoulder',
  },
  patient: {
    names: ['Pip', 'Bram', 'Nia', 'Sorrel'],
    age: 'Child',
    look: 'natural',
    personality: 'Wary at first, completely trusting once won over',
    build: 'A small, thin child who makes themselves smaller when frightened',
    face: 'A round, soft child\'s face with pale skin, a small nose and a slightly trembling lip',
    eyes: 'Huge dark eyes, watery at the edges, that go wide with fear then wonder',
    hair: 'Fine sandy hair, a bit tangled, falling into the eyes',
    headwear: 'None',
    outfit: 'A worn, slightly-too-big jumper with frayed cuffs and faded jeans',
    shoes: 'Scuffed light-up trainers, one lace undone',
    accessories: 'A small plaster on one forearm, a frayed red friendship bracelet',
    colors: 'Sand, cream, faded red',
    marks: 'The frayed red bracelet, never removed',
    expressions: 'Eyes narrow when afraid, open wide and bright once they trust someone',
    body: 'Stays low and close to walls; moves in short bursts, then freezes',
  },
  rival: {
    names: ['Cass', 'Brix', 'Vero', 'Halden'],
    age: 'Teen',
    look: 'polished',
    personality: 'Loud, certain, performs a confidence they do not really feel',
    build: 'Tall and broad-shouldered, squares up to take space',
    face: 'A sharp-featured teen face, pale with a faint flush high on the cheeks, jaw set',
    eyes: 'Narrow, cool grey eyes and a habitual one-sided smirk',
    hair: 'Bleached-blond hair with dark roots, spiked up at the front',
    headwear: 'A black cap worn backwards, never turned round',
    outfit: 'A black bomber jacket over a plain white tee, dark slim jeans',
    shoes: 'Chunky black high-tops, deliberately box-fresh',
    accessories: 'An oversized watch on one wrist',
    colors: 'Black, white, cold silver',
    marks: 'The cap is always backwards',
    expressions: 'Smirk at rest; drops to genuine wide-eyed shock in an instant',
    body: 'Wide gestures, leans back, arms often crossed',
  },
  parent: {
    names: ['Rosa', 'Denny', 'Marta', 'Osric'],
    age: 'Adult',
    look: 'natural',
    personality: 'Patient to a precise limit, then completely immovable',
    build: 'Sturdy and square-set, stands planted and still',
    face: 'A kind, tired middle-aged face with warm tan skin, soft jowls and smile lines',
    eyes: 'Level, half-lidded brown eyes behind reading glasses',
    hair: 'Grey hair pulled back into a low, practical bun',
    headwear: 'Reading glasses usually pushed up onto the head',
    outfit: 'A mustard cardigan over a grey tee, comfortable dark trousers',
    shoes: 'Soft brown house slippers',
    accessories: 'A tea towel over the same shoulder, a worn wedding band',
    colors: 'Mustard, grey, warm brown',
    marks: 'The tea towel always over the same shoulder',
    expressions: 'The face barely changes; a slow, final blink ends the conversation',
    body: 'Stands still and lets everyone else move around them',
  },
  kid: {
    names: ['Bea', 'Toko', 'Nell', 'Ridge'],
    age: 'Child',
    look: 'natural',
    personality: 'Total, whole-body commitment to whatever the current idea is',
    build: 'A small, wiry child who is never fully still',
    face: 'A bright, gap-toothed child\'s face with rosy cheeks and light skin, always mid-expression',
    eyes: 'Big round eyes that go from delight to outrage with nothing in between',
    hair: 'Messy sandy hair sticking up at the crown',
    headwear: 'A lopsided cardboard crown, worn at all times',
    outfit: 'A red-and-white striped long-sleeve top and well-worn denim shorts',
    shoes: 'Mismatched socks and light-up trainers',
    accessories: 'Nothing beyond the crown',
    colors: 'Red, white, denim blue',
    marks: 'The crown always sits slightly crooked',
    expressions: 'Enormous grin or total outrage, switched in a heartbeat',
    body: 'Bounces, spins and climbs on anything within reach',
  },
  noob: {
    names: ['Ollie', 'Sprig', 'Dex', 'Fen'],
    age: 'Teen',
    look: 'natural',
    personality: 'Hopeful, undeterred by evidence, tries everything twice',
    build: 'An ordinary, slightly gangly teenager, nothing customised',
    face: 'A plain, friendly teen face with light skin, a scatter of spots and an easy grin',
    eyes: 'Small, hopeful brown eyes that stay optimistic no matter what',
    hair: 'Flat mousy hair with an obvious cowlick',
    headwear: 'None',
    outfit: 'A plain green tee and slightly-too-short blue jeans — the accidental everyman look',
    shoes: 'Plain worn white trainers',
    accessories: 'A cheap backpack on both shoulders',
    colors: 'Green, blue, off-white',
    marks: 'Utterly unremarkable except the ever-present backpack — the plainness is the joke',
    expressions: 'The same hopeful grin whatever is happening',
    body: 'Leans in far too close to whatever they are doing',
  },
  pro: {
    names: ['Ines', 'Kade', 'Roux', 'Silas'],
    age: 'Young adult',
    look: 'polished',
    personality: 'Economical, unimpressed, never explains anything twice',
    build: 'Compact and balanced, with a low, ready centre of gravity',
    face: 'A composed young-adult face with deep tan skin, high cheekbones and a flat, calm mouth',
    eyes: 'Narrow, steady dark eyes that miss nothing',
    hair: 'Black hair scraped back into a short, tight ponytail',
    headwear: 'A slim black headset resting around the neck',
    outfit: 'A fitted dark-teal jacket over a black tee, black joggers',
    shoes: 'Low black trainers, well used',
    accessories: 'A single plain cord bracelet; tape wrapped around two fingers of the left hand',
    colors: 'Dark teal, black',
    marks: 'Tape around two fingers of the left hand',
    expressions: 'The face stays still; the body does all the reacting',
    body: 'Completely still until they move, then very fast and precise',
  },
  helper: {
    names: ['Marlow', 'Sena', 'Quinn', 'Bo'],
    age: 'Young adult',
    look: 'natural',
    personality: 'Notices what others miss, acts before being asked',
    build: 'Average height with the shoulders carried slightly forward',
    face: 'A warm, attentive face with medium tan skin, a light dusting of freckles and a small closed smile',
    eyes: 'Watchful, kind brown eyes that settle on people gently',
    hair: 'An auburn bob tucked behind one ear',
    headwear: 'None',
    outfit: 'A rust-orange work shirt over a cream tee, sturdy canvas trousers',
    shoes: 'Brown lace-up work boots',
    accessories: 'A canvas satchel across the body, a pencil tucked behind the right ear',
    colors: 'Rust orange, cream, canvas brown',
    marks: 'The pencil behind the right ear, always',
    expressions: 'Holds one quiet, attentive look',
    body: 'Approaches slowly and keeps both hands visible',
  },
};

/** Never-change details, phrased for a prompt. */
export function identityLock(character) {
  return `IDENTITY LOCK — ${character.name}: preserve exactly the same face (${character.face}), `
    + `eyes (${character.eyes}), hair (${character.hair}), headwear (${character.headwear}), `
    + `build (${character.build}), outfit (${character.outfit}), footwear (${character.shoes}), `
    + `accessories (${character.accessories}) and signature colours (${character.colors}) in every scene. `
    + `This is the same real person throughout — do not recast, replace, age, restyle, beautify or `
    + `cartoonify them, and keep the face a real human face, never flattened or stylised. `
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
    look: pool.look,
    build: pool.build,
    face: pool.face,
    eyes: pool.eyes,
    hair: pool.hair,
    headwear: pool.headwear,
    outfit: pool.outfit,
    shoes: pool.shoes,
    accessories: pool.accessories,
    colors: pool.colors,
    marks: pool.marks,
    expressions: pool.expressions,
    body: pool.body,
    heightNote: '',
    mustNotChange: [
      'Face and features', 'Eyes', 'Hair', 'Headwear',
      'Outfit design and colours', 'Footwear', 'Accessories',
      'Apparent age', 'Build and proportions',
    ],
    mayChange: [
      'Facial expression', 'Pose and gesture', 'Camera angle and distance',
      'Lighting on the character', 'Background behind them',
    ],
    negatives: [
      'no recast between scenes', 'no outfit swap', 'no hair change',
      'no age change', 'no cartoon or stylised face', 'no plastic or doll-like skin',
      'no duplicate of this character in frame', 'no extra limbs', 'no cropped face',
    ],
  };

  character.identityLock = identityLock(character);
  return character;
}

/** Relative heights, so a cast reads consistently across scenes. */
const HEIGHT_ORDER = ['patient', 'kid', 'intern', 'noob', 'helper', 'pro', 'rival', 'parent', 'vet'];

/**
 * Write each character's height relative to the others, in place.
 *
 * Exported because the cast can change after it is built — casting a guest
 * character displaces the one it replaces, and a note reading "shorter than
 * Dr. Wren" is worse than useless once Dr. Wren is not in the video. Whoever
 * assembles the final cast re-runs this over it.
 */
export function resolveHeights(cast) {
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

  return resolveHeights(cast);
}
