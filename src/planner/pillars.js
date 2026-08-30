/**
 * Content pillars and concept seeds.
 *
 * A pillar is a repeatable format. Each carries the vocabulary used to detect
 * it in real titles, the emotional register it plays in, and several original
 * concept seeds so regeneration has somewhere coherent to go.
 *
 * The seeds are original premises written against structural patterns —
 * pacing, contrast, hook shape, payoff timing. None reproduces a specific
 * video, and no seed names a real creator, avatar or branded character.
 */

/** Roles the story templates reference; the character generator fills them in. */
/**
 * `refers` lists the generic phrases a seed uses for this role.
 *
 * Seeds are written before anyone is cast, so they say "the vet arrives" —
 * which reads as a placeholder once there is an actual character standing
 * there, and reads worse when that character is Dr. Harlow. The scene builder
 * swaps these for the cast member's name.
 */
export const ROLES = {
  vet: {
    role: 'Lead veterinarian', archetype: 'calm expert',
    refers: ['the lead veterinarian', 'the vet', 'the doctor'],
  },
  intern: {
    role: 'Nervous intern', archetype: 'eager rookie',
    refers: ['the night-shift intern', 'the intern'],
  },
  patient: {
    role: 'Tiny animal patient', archetype: 'vulnerable innocent',
    refers: ['the missing one', 'the patient', 'a tiny creature', 'the frightened animal'],
  },
  rival: {
    role: 'Overconfident rival', archetype: 'showy antagonist',
    refers: ['the copycat', 'the prankster', 'the expensive build', 'the rival'],
  },
  parent: {
    role: 'Exasperated parent', archetype: 'weary authority',
    refers: ['the parent'],
  },
  kid: {
    role: 'Chaotic younger sibling', archetype: 'agent of chaos',
    refers: ['the youngest character', 'the child', 'the kid'],
  },
  noob: {
    role: 'Beginner player', archetype: 'earnest underdog',
    refers: ['the modest builder', 'the modest one', 'the beginner', 'the former seeker'],
  },
  pro: {
    role: 'Veteran player', archetype: 'unbothered master',
    refers: ['the expert', 'the seeker'],
  },
  helper: {
    role: 'Quiet helper', archetype: 'unsung support',
    refers: ['the rescuer', 'the hider', 'the helper', 'the narrator'],
  },
};

/**
 * @typedef {object} Seed
 * @property {string} id
 * @property {string} premise    one line the whole video hangs on
 * @property {string} conflict   the question the opening raises
 * @property {string} escalation what makes it worse before it resolves
 * @property {string} turn       the moment expectation breaks
 * @property {string} payoff     the resolution the viewer waited for
 * @property {string} loop       how the last frame invites a replay
 * @property {string[]} roles    keys of ROLES this seed needs
 * @property {string} setting
 * @property {string[]} props
 */

export const PILLARS = [
  {
    id: 'animal-hospital',
    label: 'Animal Hospital',
    emotion: 'Warm tension',
    audience: 'Roblox players aged 8–16 who follow roleplay worlds',
    difficulty: 'Moderate',
    match: ['animal hospital', 'animalhospital', 'hospital', 'doctor', 'harlow', 'vet', 'patient', 'nurse'],
    band: 'mid',
    seeds: [
      {
        id: 'ah-smallest-patient',
        premise: 'The smallest patient in the ward refuses treatment until the vet sits on the floor with them.',
        conflict: 'A frightened animal will not come out from under the exam bed.',
        escalation: 'Every attempt to coax it out makes it retreat further; the ward gets louder.',
        turn: 'The vet gives up standing over it and lies down at its level.',
        payoff: 'The patient walks straight into the vet\'s hands.',
        loop: 'The last frame matches the first, now with the bed empty.',
        roles: ['vet', 'patient', 'intern'],
        setting: 'A bright examination room with a low bed and scattered equipment',
        props: ['clipboard', 'toy stethoscope', 'small blanket'],
      },
      {
        id: 'ah-night-shift',
        premise: 'The night-shift intern is alone when the ward\'s hardest case wakes up.',
        conflict: 'A monitor alarm goes off with nobody senior in the building.',
        escalation: 'The intern works through the checklist and each step fails.',
        turn: 'They stop following the chart and simply hold the patient.',
        payoff: 'The alarm stops. The vet arrives to find it already handled.',
        loop: 'The intern picks up the clipboard again as the next alarm sounds.',
        roles: ['intern', 'patient', 'vet'],
        setting: 'A dim ward at night, one lamp, monitors glowing',
        props: ['monitor', 'chart', 'desk lamp'],
      },
      {
        id: 'ah-wrong-chart',
        premise: 'Two charts get swapped and the vet almost treats the wrong patient.',
        conflict: 'The symptoms on the page do not match the animal on the table.',
        escalation: 'The intern insists the chart is right; the clock is running.',
        turn: 'The vet trusts what they can see instead of what is written.',
        payoff: 'The real problem was obvious all along — a splinter in one paw.',
        loop: 'The camera lands on the second chart, still unread.',
        roles: ['vet', 'intern', 'patient'],
        setting: 'A busy treatment room with two beds side by side',
        props: ['two clipboards', 'tweezers', 'wall clock'],
      },
    ],
  },
  {
    id: 'tiny-rescue',
    label: 'Tiny Rescue',
    emotion: 'Tender relief',
    audience: 'Viewers who watch for the emotional payoff more than the gameplay',
    difficulty: 'Moderate',
    match: ['tiny', 'rescue', 'saved', 'help', 'lost', 'stuck'],
    band: 'short',
    seeds: [
      {
        id: 'tr-storm-drain',
        premise: 'Something very small is stuck somewhere very large, and only one character notices.',
        conflict: 'A faint sound nobody else hears stops one character in the street.',
        escalation: 'Passers-by walk on; the sound gets weaker.',
        turn: 'They reach in without hesitating, ruining their clothes.',
        payoff: 'A tiny creature, safe, held up to the light.',
        loop: 'They walk on and hear a second sound.',
        roles: ['helper', 'patient'],
        setting: 'A rain-slick street beside a storm drain at dusk',
        props: ['flashlight', 'wet jacket'],
      },
      {
        id: 'tr-box-doorstep',
        premise: 'A box appears on a doorstep and the household argues about who keeps it.',
        conflict: 'Something inside the box is moving.',
        escalation: 'Everyone has a reason it cannot stay.',
        turn: 'The youngest character quietly makes space on their own bed.',
        payoff: 'The argument stops. Nobody takes the box away.',
        loop: 'The doorbell rings again.',
        roles: ['kid', 'parent', 'patient'],
        setting: 'A front hallway with a cardboard box in the middle of the floor',
        props: ['cardboard box', 'towel'],
      },
      {
        id: 'tr-last-one',
        premise: 'A rescuer counts their charges and comes up one short.',
        conflict: 'The count is wrong and nobody knows where the missing one went.',
        escalation: 'Each place they check is empty; the light is going.',
        turn: 'They stop searching outward and look in the one place they started.',
        payoff: 'The missing one is asleep in the carrier the whole time.',
        loop: 'They start the count again from one.',
        roles: ['helper', 'patient'],
        setting: 'A field at golden hour with an open carrier',
        props: ['carrier', 'tally counter'],
      },
    ],
  },
  {
    id: 'comparison',
    label: 'Comparison',
    emotion: 'Recognition and surprise',
    audience: 'Broad Shorts audience who watch for the contrast beat',
    difficulty: 'Easy',
    match: ['vs', 'versus', 'poor', 'rich', 'noob', 'pro', 'expectation', 'reality', 'before', 'after'],
    band: 'short',
    seeds: [
      {
        id: 'cmp-what-they-see',
        premise: 'The same three seconds shown twice — once as everyone sees it, once as it actually is.',
        conflict: 'The first version is confident and polished.',
        escalation: 'Small details in the polished version stop adding up.',
        turn: 'Cut to the same moment from behind the camera.',
        payoff: 'The unglamorous truth, and it is funnier than the polished take.',
        loop: 'The polished version starts again over the messy frame.',
        roles: ['noob', 'pro'],
        setting: 'One location shot two ways: wide and staged, then handheld and cluttered',
        props: ['ring light', 'unplugged cable'],
      },
      {
        id: 'cmp-first-day-last-day',
        premise: 'First day versus one hundredth day at the same task.',
        conflict: 'Day one is a catastrophe played completely straight.',
        escalation: 'Each failure repeats with slightly better form.',
        turn: 'Day one hundred begins identically — same frame, same posture.',
        payoff: 'It goes perfectly, and the character does not even look up.',
        loop: 'A new beginner walks in behind them.',
        roles: ['noob', 'pro'],
        setting: 'A single practice space, unchanged between the two days',
        props: ['worn equipment', 'wall tally'],
      },
      {
        id: 'cmp-two-budgets',
        premise: 'Two characters attempt the same build with wildly different resources.',
        conflict: 'One has everything, the other has almost nothing.',
        escalation: 'The expensive build grows fast and gets top-heavy.',
        turn: 'It collapses; the modest one is still standing.',
        payoff: 'The modest builder adds one final piece without hurrying.',
        loop: 'The expensive builder starts over.',
        roles: ['rival', 'noob'],
        setting: 'Two adjacent build plots, one crowded with materials',
        props: ['stacked crates', 'single plank'],
      },
    ],
  },
  {
    id: 'troll-prank',
    label: 'Troll & Prank',
    emotion: 'Mischief',
    audience: 'Comedy-first viewers who rewatch for the reaction',
    difficulty: 'Easy',
    match: ['troll', 'prank', 'fooled', 'trick', 'fake', 'caught'],
    band: 'short',
    seeds: [
      {
        id: 'tp-copycat',
        premise: 'One character copies another exactly until the copied one sets a trap.',
        conflict: 'Every move is mirrored a half-second later.',
        escalation: 'The mirroring gets faster and more obnoxious.',
        turn: 'The original does something deliberately absurd.',
        payoff: 'The copycat commits to it fully and pays for it.',
        loop: 'The original starts mirroring the copycat.',
        roles: ['rival', 'noob'],
        setting: 'An open lobby with a reflective floor',
        props: ['identical hats'],
      },
      {
        id: 'tp-fake-door',
        premise: 'A prankster builds a door that goes nowhere and waits.',
        conflict: 'Someone approaches the door with total confidence.',
        escalation: 'They try the handle repeatedly; a queue forms behind them.',
        turn: 'The prankster steps forward to gloat.',
        payoff: 'The door opens for the person behind them instead.',
        loop: 'The prankster tries the handle themselves.',
        roles: ['rival', 'helper'],
        setting: 'A corridor with one obviously suspicious door',
        props: ['painted door', 'queue of onlookers'],
      },
      {
        id: 'tp-swapped-seats',
        premise: 'Two characters swap places every time the third one looks away.',
        conflict: 'The third character cannot work out what is wrong.',
        escalation: 'The swaps get faster and more impossible.',
        turn: 'They finally stare without blinking.',
        payoff: 'Both swap in plain sight anyway.',
        loop: 'They look away and there are now three.',
        roles: ['rival', 'noob', 'helper'],
        setting: 'A small room with two chairs facing a desk',
        props: ['two identical chairs'],
      },
    ],
  },
  {
    id: 'family-comedy',
    label: 'Family & School Comedy',
    emotion: 'Familiar exasperation',
    audience: 'Viewers who recognise the household dynamic instantly',
    difficulty: 'Easy',
    match: ['mom', 'dad', 'parent', 'family', 'bro', 'sister', 'brother', 'school', 'homework', 'lil'],
    band: 'micro',
    seeds: [
      {
        id: 'fc-one-sound',
        premise: 'One small sound sets off every member of the household in sequence.',
        conflict: 'A single noise from one room.',
        escalation: 'Each character reacts more dramatically than the last.',
        turn: 'The source turns out to be entirely harmless.',
        payoff: 'Everyone returns to exactly where they started.',
        loop: 'The sound happens again.',
        roles: ['kid', 'parent', 'helper'],
        setting: 'A house with several rooms visible in quick cuts',
        props: ['dropped spoon'],
      },
      {
        id: 'fc-homework-negotiation',
        premise: 'A negotiation over homework escalates into formal diplomacy.',
        conflict: 'A flat refusal to start.',
        escalation: 'Terms, counter-terms and a written treaty.',
        turn: 'The parent signs without reading.',
        payoff: 'Clause nine says the parent does the homework.',
        loop: 'The parent picks up the pencil.',
        roles: ['kid', 'parent'],
        setting: 'A kitchen table covered in paper',
        props: ['paper stack', 'pen', 'calculator'],
      },
      {
        id: 'fc-quiet-competition',
        premise: 'Two siblings compete silently for the last good seat.',
        conflict: 'Both arrive at the doorway at once.',
        escalation: 'Increasingly petty manoeuvres, no words.',
        turn: 'A third character sits down in it.',
        payoff: 'They team up instantly against the newcomer.',
        loop: 'The seat is empty again.',
        roles: ['kid', 'helper', 'parent'],
        setting: 'A living room with one obviously best chair',
        props: ['armchair', 'remote control'],
      },
    ],
  },
  {
    id: 'transformation',
    label: 'Transformation',
    emotion: 'Satisfying reveal',
    audience: 'Viewers who stay for the before-and-after payoff',
    difficulty: 'Moderate',
    match: ['transformation', 'glow', 'upgrade', 'makeover', 'became', 'turned into', 'evolution'],
    band: 'short',
    seeds: [
      {
        id: 'tf-abandoned-build',
        premise: 'An abandoned build is restored one small fix at a time.',
        conflict: 'The place is a wreck and nobody has claimed it.',
        escalation: 'Each repair reveals a worse problem underneath.',
        turn: 'The last problem is structural and cannot be patched.',
        payoff: 'They rebuild that one wall properly and the whole thing holds.',
        loop: 'A wider shot shows the next wreck along the street.',
        roles: ['helper', 'noob'],
        setting: 'A derelict structure with visible damage',
        props: ['toolbox', 'ladder', 'paint'],
      },
      {
        id: 'tf-one-item',
        premise: 'A character changes one item at a time until nothing original remains.',
        conflict: 'The starting look is deliberately plain.',
        escalation: 'Each swap gets bolder and the reactions get louder.',
        turn: 'The final swap goes back to the original item.',
        payoff: 'That plain item now reads as the most confident choice.',
        loop: 'They reach for the second item again.',
        roles: ['noob', 'rival'],
        setting: 'A changing area with a full-length mirror',
        props: ['mirror', 'row of items'],
      },
      {
        id: 'tf-quiet-upgrade',
        premise: 'Someone upgrades a friend\'s setup without telling them.',
        conflict: 'The friend\'s setup is falling apart and they will not accept help.',
        escalation: 'Each secret improvement is nearly discovered.',
        turn: 'The friend returns early.',
        payoff: 'They say nothing, sit down and simply use it.',
        loop: 'The helper starts on the next room.',
        roles: ['helper', 'noob'],
        setting: 'A cramped room being quietly improved',
        props: ['spare parts', 'screwdriver'],
      },
    ],
  },
  {
    id: 'hide-and-seek',
    label: 'Hide & Seek',
    emotion: 'Playful suspense',
    audience: 'Players who enjoy tension without real threat',
    difficulty: 'Moderate',
    match: ['hide', 'seek', 'hiding', 'found', 'search'],
    band: 'short',
    seeds: [
      {
        id: 'hs-too-good',
        premise: 'One hider is so good that the seeker gives up and goes home.',
        conflict: 'The count reaches zero and the room is empty.',
        escalation: 'Every obvious spot is checked and dismissed.',
        turn: 'The seeker announces they are leaving.',
        payoff: 'The hider emerges from somewhere impossible, annoyed at being missed.',
        loop: 'The seeker starts counting again.',
        roles: ['noob', 'helper'],
        setting: 'A room with far too few hiding places',
        props: ['curtain', 'cupboard'],
      },
      {
        id: 'hs-wrong-game',
        premise: 'A character hides enthusiastically in a game nobody else is playing.',
        conflict: 'They dive behind cover with total commitment.',
        escalation: 'Everyone around them continues normally.',
        turn: 'Someone finally asks what they are doing.',
        payoff: 'They explain the rules. Everyone immediately hides.',
        loop: 'The original asker is left alone, counting.',
        roles: ['kid', 'helper', 'parent'],
        setting: 'An ordinary public space',
        props: ['potted plant', 'bench'],
      },
      {
        id: 'hs-swap',
        premise: 'The seeker and the hider quietly trade places mid-game.',
        conflict: 'The seeker is bad at seeking and knows it.',
        escalation: 'They search the same three spots repeatedly.',
        turn: 'The hider steps out and starts seeking instead.',
        payoff: 'The former seeker hides brilliantly on their first try.',
        loop: 'Nobody is looking for anyone.',
        roles: ['noob', 'pro'],
        setting: 'A layered environment with sightlines',
        props: ['blindfold'],
      },
    ],
  },
  {
    id: 'challenge',
    label: 'Challenge',
    emotion: 'Competitive energy',
    audience: 'Viewers who watch to see whether it works',
    difficulty: 'Easy',
    match: ['challenge', 'attempt', 'try', 'speedrun', 'escape', 'obby', 'parkour', 'survive'],
    band: 'mid',
    seeds: [
      {
        id: 'ch-one-rule',
        premise: 'A run attempted under one absurd self-imposed rule.',
        conflict: 'The rule is announced and immediately makes everything harder.',
        escalation: 'Three attempts, each failing in a different way.',
        turn: 'The rule turns out to be an advantage in the final section.',
        payoff: 'They finish because of the rule, not despite it.',
        loop: 'They add a second rule.',
        roles: ['noob', 'pro'],
        setting: 'An obstacle course with distinct sections',
        props: ['timer', 'handwritten rule card'],
      },
      {
        id: 'ch-last-second',
        premise: 'A timed run where the clock and the finish arrive together.',
        conflict: 'The timer starts with an obviously insufficient margin.',
        escalation: 'Each section takes longer than planned.',
        turn: 'They abandon the safe route entirely.',
        payoff: 'They land the finish as the timer hits zero.',
        loop: 'The timer resets one second shorter.',
        roles: ['pro', 'rival'],
        setting: 'A vertical course with a visible clock',
        props: ['countdown clock'],
      },
      {
        id: 'ch-handicap',
        premise: 'An expert takes on a beginner with a deliberately unfair handicap.',
        conflict: 'The expert accepts terms that look impossible.',
        escalation: 'The beginner pulls ahead and cannot believe it.',
        turn: 'The expert was never trying to win.',
        payoff: 'They were teaching the route the whole time.',
        loop: 'The beginner offers the same handicap to someone else.',
        roles: ['pro', 'noob'],
        setting: 'A course with a clear start and finish',
        props: ['weighted pack'],
      },
    ],
  },
  {
    id: 'mystery',
    label: 'Mystery & Twist',
    emotion: 'Curiosity',
    audience: 'Viewers who rewatch to catch what they missed',
    difficulty: 'Advanced',
    match: ['mystery', 'secret', 'hidden', 'proof', 'truth', 'anomaly', 'strange', 'behind'],
    band: 'mid',
    seeds: [
      {
        id: 'my-one-frame',
        premise: 'Something is wrong in the first frame and nobody notices until the end.',
        conflict: 'An ordinary scene plays out normally.',
        escalation: 'Small inconsistencies accumulate at the edges.',
        turn: 'The camera returns to the exact opening framing.',
        payoff: 'The wrong detail is now unmissable.',
        loop: 'The first frame plays again and reads completely differently.',
        roles: ['helper', 'rival'],
        setting: 'A deliberately mundane room with one anomaly',
        props: ['wall clock', 'framed picture'],
      },
      {
        id: 'my-locked-room',
        premise: 'A door that was locked from the inside is now open.',
        conflict: 'Two characters find the room empty.',
        escalation: 'Each explanation is ruled out in turn.',
        turn: 'They check the ceiling.',
        payoff: 'The answer was never a person.',
        loop: 'The door closes behind them.',
        roles: ['helper', 'noob'],
        setting: 'A sealed room with one high vent',
        props: ['broken lock', 'vent grille'],
      },
      {
        id: 'my-missing-name',
        premise: 'A name on a list belongs to someone nobody remembers.',
        conflict: 'One extra entry on an otherwise complete roster.',
        escalation: 'Everyone denies knowing them, but each denial is slightly rehearsed.',
        turn: 'The name is in the narrator\'s own handwriting.',
        payoff: 'They wrote it themselves and forgot.',
        loop: 'A second unfamiliar name appears below it.',
        roles: ['helper', 'rival', 'noob'],
        setting: 'An office with a pinned roster',
        props: ['roster sheet', 'pen'],
      },
    ],
  },
  {
    id: 'experimental',
    label: 'Experimental',
    emotion: 'Curiosity',
    audience: 'Existing followers who tolerate a format test',
    difficulty: 'Advanced',
    match: [],
    band: 'micro',
    seeds: [
      {
        id: 'ex-single-take',
        premise: 'One unbroken push-in on a single face while the world changes behind them.',
        conflict: 'The face is doing nothing; the background is doing everything.',
        escalation: 'The background events get progressively less plausible.',
        turn: 'The character finally reacts to the smallest of them.',
        payoff: 'That small thing was the only one that mattered.',
        loop: 'The push-in restarts from wide.',
        roles: ['helper'],
        setting: 'A fixed foreground with a deep, busy background',
        props: ['chair'],
      },
      {
        id: 'ex-no-cut-dialogue',
        premise: 'A story told entirely through on-screen text over one continuous action.',
        conflict: 'No dialogue at all; the text carries everything.',
        escalation: 'The text and the action begin to disagree.',
        turn: 'The action wins.',
        payoff: 'The final line of text simply gives up.',
        loop: 'The first line reappears.',
        roles: ['noob'],
        setting: 'A plain environment with one repeated action',
        props: ['single object'],
      },
      {
        id: 'ex-reverse',
        premise: 'The payoff is shown first and the video works backwards to explain it.',
        conflict: 'An inexplicable final image opens the video.',
        escalation: 'Each step back makes it stranger, not clearer.',
        turn: 'The first cause is absurdly small.',
        payoff: 'Cut forward to the final image, now completely logical.',
        loop: 'It reads as the opening again.',
        roles: ['noob', 'helper'],
        setting: 'A location shown in reverse chronology',
        props: ['domino', 'toppled stack'],
      },
    ],
  },
];

/** Themes the signal layer matches against real titles. */
export const THEMES = PILLARS
  .filter((p) => p.match.length > 0)
  .map((p) => ({ id: p.id, label: p.label, match: p.match }));

export const pillarById = (id) => PILLARS.find((p) => p.id === id) ?? null;

/**
 * Spoken lines and on-screen text, one entry per beat, per seed.
 *
 * These are kept in a single table rather than scattered through the seeds so
 * the whole script library can be read side by side — which is how you catch a
 * line that is really a stage direction, or two seeds that sound identical.
 *
 * `lines` are words a character actually says on camera: short enough to land
 * inside a two-to-four second scene, in-world, and never a description of what
 * is happening. An empty string is a deliberate silent beat, not a gap — some
 * of the strongest moments here are wordless, and the video prompt turns an
 * empty line into an explicit "keep the mouth closed" instruction.
 *
 * `captions` are the words burned into the frame during editing. They are the
 * literal text, not a note about what the text should do.
 */
const SCRIPTS = {
  'ah-smallest-patient': {
    lines: {
      hook: 'It won’t come out.',
      setup: 'We have ten minutes before the swelling sets in.',
      escalation: 'Every time we reach in, it goes further back.',
      turn: 'Fine. I’ll come to you.',
      payoff: 'There you are.',
    },
    captions: {
      hook: 'IT WON’T COME OUT',
      setup: 'TEN MINUTES',
      escalation: 'GOING BACKWARDS',
      turn: 'FINE. YOUR WAY.',
      payoff: 'THERE YOU ARE',
    },
  },
  'ah-night-shift': {
    lines: {
      hook: 'Bed four’s alarm. And I’m the only one here.',
      setup: 'Checklist. Top to bottom. I can do this.',
      escalation: 'That’s the third step and it’s still climbing.',
      turn: 'Forget the chart.',
      payoff: 'It’s already handled.',
    },
    captions: {
      hook: 'ALONE ON NIGHTS',
      setup: 'JUST FOLLOW THE CHART',
      escalation: 'STEP THREE FAILS',
      turn: 'FORGET THE CHART',
      payoff: 'ALREADY HANDLED',
    },
  },
  'ah-wrong-chart': {
    lines: {
      hook: 'This chart isn’t describing this animal.',
      setup: 'Two beds, two charts, one of them is wrong.',
      escalation: 'I copied it exactly. We don’t have time to redo it.',
      turn: 'I’m treating what I can see.',
      payoff: 'A splinter. That’s all it ever was.',
    },
    captions: {
      hook: 'WRONG CHART',
      setup: 'ONE OF THESE IS WRONG',
      escalation: 'CLOCK’S RUNNING',
      turn: 'TRUST YOUR EYES',
      payoff: 'JUST A SPLINTER',
    },
  },
  'tr-storm-drain': {
    lines: {
      hook: 'Wait. Did you hear that?',
      setup: 'It’s coming from down there.',
      escalation: 'Nobody’s stopping.',
      turn: 'This jacket was new.',
      payoff: 'Got you.',
    },
    captions: {
      hook: 'DID YOU HEAR THAT?',
      setup: 'IT’S DOWN THERE',
      escalation: 'NOBODY STOPS',
      turn: 'JACKET WAS NEW',
      payoff: 'GOT YOU',
    },
  },
  'tr-box-doorstep': {
    lines: {
      hook: 'Something in there just moved.',
      setup: 'It was on the step. Nobody knocked.',
      escalation: 'We don’t have the room. Or the time.',
      turn: 'It can have my bed.',
      payoff: '',
    },
    captions: {
      hook: 'IT MOVED',
      setup: 'NOBODY KNOCKED',
      escalation: 'NO ROOM. NO TIME.',
      turn: 'IT CAN HAVE MY BED',
      payoff: 'NOBODY ARGUED',
    },
  },
  'tr-last-one': {
    lines: {
      hook: 'That’s one short.',
      setup: 'There were six when we left.',
      escalation: 'Empty. That’s everywhere I know.',
      turn: 'I never looked in the carrier.',
      payoff: 'Asleep. The entire time.',
    },
    captions: {
      hook: 'ONE SHORT',
      setup: 'THERE WERE SIX',
      escalation: 'EVERYWHERE. EMPTY.',
      turn: 'CHECK WHERE YOU STARTED',
      payoff: 'ASLEEP THE WHOLE TIME',
    },
  },
  'cmp-what-they-see': {
    lines: {
      hook: 'Watch how easy this is.',
      setup: 'One take. No edits.',
      escalation: 'Ignore that. And that.',
      turn: 'Okay. Here’s the actual take.',
      payoff: 'Forty-one attempts.',
    },
    captions: {
      hook: 'WHAT YOU SEE',
      setup: 'ONE TAKE',
      escalation: 'IGNORE THAT',
      turn: 'WHAT ACTUALLY HAPPENED',
      payoff: 'ATTEMPT 41',
    },
  },
  'cmp-first-day-last-day': {
    lines: {
      hook: 'Day one.',
      setup: 'Same map, same start, same everything.',
      escalation: 'Closer. Still no.',
      turn: 'Day one hundred.',
      payoff: '',
    },
    captions: {
      hook: 'DAY 1',
      setup: 'SAME START',
      escalation: 'CLOSER. STILL NO.',
      turn: 'DAY 100',
      payoff: 'DIDN’T EVEN LOOK UP',
    },
  },
  'cmp-two-budgets': {
    lines: {
      hook: 'You’ve got everything. I’ve got this.',
      setup: 'Same build. Same deadline.',
      escalation: 'Taller. Always taller.',
      turn: '',
      payoff: 'Still standing.',
    },
    captions: {
      hook: 'EVERYTHING VS THIS',
      setup: 'SAME BUILD',
      escalation: 'TALLER. ALWAYS TALLER.',
      turn: 'OH.',
      payoff: 'STILL STANDING',
    },
  },
  'tp-copycat': {
    lines: {
      hook: 'Stop copying me.',
      setup: 'Everything I do, half a second later.',
      escalation: 'You’re not even trying to hide it.',
      turn: 'Copy this, then.',
      payoff: '',
    },
    captions: {
      hook: 'STOP COPYING ME',
      setup: 'HALF A SECOND LATER',
      escalation: 'NOT EVEN HIDING IT',
      turn: 'COPY THIS',
      payoff: 'THEY COMMITTED',
    },
  },
  'tp-fake-door': {
    lines: {
      hook: 'That door doesn’t go anywhere.',
      setup: 'Built it this morning. Now we wait.',
      escalation: 'Third try. There’s a queue now.',
      turn: 'It isn’t a real door.',
      payoff: 'How did you —',
    },
    captions: {
      hook: 'THE DOOR IS FAKE',
      setup: 'NOW WE WAIT',
      escalation: 'THERE’S A QUEUE',
      turn: 'IT ISN’T REAL',
      payoff: 'HOW.',
    },
  },
  'tp-swapped-seats': {
    lines: {
      hook: 'Something’s different.',
      setup: 'You two haven’t moved. Right?',
      escalation: 'That was instant. That was not possible.',
      turn: 'I’m not blinking. Not once.',
      payoff: '',
    },
    captions: {
      hook: 'SOMETHING’S DIFFERENT',
      setup: 'NOBODY MOVED. RIGHT?',
      escalation: 'NOT POSSIBLE',
      turn: 'NOT BLINKING',
      payoff: 'IN PLAIN SIGHT',
    },
  },
  'fc-one-sound': {
    lines: {
      hook: 'What was that?',
      setup: 'It came from the kitchen.',
      escalation: 'Everyone out. Now.',
      turn: 'It’s the ice maker.',
      payoff: '',
    },
    captions: {
      hook: 'WHAT WAS THAT?',
      setup: 'FROM THE KITCHEN',
      escalation: 'EVERYONE OUT',
      turn: 'IT’S THE ICE MAKER',
      payoff: 'AS YOU WERE',
    },
  },
  'fc-homework-negotiation': {
    lines: {
      hook: 'No.',
      setup: 'It’s four questions.',
      escalation: 'Then I want it in writing.',
      turn: 'Fine. Where do I sign?',
      payoff: 'Clause nine. You’re doing it.',
    },
    captions: {
      hook: 'NO.',
      setup: 'FOUR QUESTIONS',
      escalation: 'PUT IT IN WRITING',
      turn: 'WHERE DO I SIGN?',
      payoff: 'CLAUSE NINE',
    },
  },
  'fc-quiet-competition': {
    lines: {
      hook: '',
      setup: 'Don’t.',
      escalation: '',
      turn: 'Comfy.',
      payoff: 'Get up.',
    },
    captions: {
      hook: 'THE GOOD SEAT',
      setup: 'BOTH ARRIVED AT ONCE',
      escalation: 'NO WORDS',
      turn: 'COMFY.',
      payoff: 'TRUCE',
    },
  },
  'tf-abandoned-build': {
    lines: {
      hook: 'Nobody’s touched this in years.',
      setup: 'Start small. One thing at a time.',
      escalation: 'Every fix finds a worse one.',
      turn: 'That wall is the whole problem.',
      payoff: 'Now it holds.',
    },
    captions: {
      hook: 'ABANDONED',
      setup: 'ONE THING AT A TIME',
      escalation: 'IT GETS WORSE',
      turn: 'IT’S THE WALL',
      payoff: 'NOW IT HOLDS',
    },
  },
  'tf-one-item': {
    lines: {
      hook: 'Plain. On purpose.',
      setup: 'One item changes at a time.',
      escalation: 'Louder. Louder. Louder.',
      turn: 'Put the first one back.',
      payoff: 'That’s the one.',
    },
    captions: {
      hook: 'PLAIN ON PURPOSE',
      setup: 'ONE ITEM AT A TIME',
      escalation: 'LOUDER',
      turn: 'PUT IT BACK',
      payoff: 'THAT’S THE ONE',
    },
  },
  'tf-quiet-upgrade': {
    lines: {
      hook: 'This setup is held together with tape.',
      setup: 'They’d never let me fix it. So I won’t ask.',
      escalation: 'Almost. Put it back, put it back.',
      turn: 'You’re early.',
      payoff: '',
    },
    captions: {
      hook: 'HELD TOGETHER WITH TAPE',
      setup: 'DON’T ASK',
      escalation: 'ALMOST CAUGHT',
      turn: 'THEY’RE EARLY',
      payoff: 'THEY SAID NOTHING',
    },
  },
  'hs-too-good': {
    lines: {
      hook: 'Ten. Ready or not.',
      setup: 'There is nowhere in here to hide.',
      escalation: 'Checked it. Checked it. Checked it.',
      turn: 'I’m going home.',
      payoff: 'You didn’t even look up.',
    },
    captions: {
      hook: 'READY OR NOT',
      setup: 'NOWHERE TO HIDE',
      escalation: 'CHECKED. CHECKED. CHECKED.',
      turn: 'I’M GOING HOME',
      payoff: 'YOU DIDN’T LOOK UP',
    },
  },
  'hs-wrong-game': {
    lines: {
      hook: 'Go. Hide.',
      setup: '',
      escalation: 'Why is nobody hiding?',
      turn: 'What are you doing?',
      payoff: 'Whoever’s found first is out.',
    },
    captions: {
      hook: 'GO. HIDE.',
      setup: 'NOBODY ELSE IS PLAYING',
      escalation: 'WHY IS NOBODY HIDING?',
      turn: 'WHAT ARE YOU DOING?',
      payoff: 'FOUND FIRST IS OUT',
    },
  },
  'hs-swap': {
    lines: {
      hook: 'I’m terrible at this.',
      setup: 'Same three spots. Every round.',
      escalation: 'Not here either.',
      turn: 'Swap with me.',
      payoff: '',
    },
    captions: {
      hook: 'TERRIBLE AT THIS',
      setup: 'SAME THREE SPOTS',
      escalation: 'NOT HERE EITHER',
      turn: 'SWAP WITH ME',
      payoff: 'FIRST TRY',
    },
  },
  'ch-one-rule': {
    lines: {
      hook: 'New rule. I never stop moving.',
      setup: 'Whole run. No exceptions.',
      escalation: 'Attempt three. Different mistake.',
      turn: 'Wait. That’s why it works.',
      payoff: 'Because of the rule. Not despite it.',
    },
    captions: {
      hook: 'NEVER STOP MOVING',
      setup: 'NO EXCEPTIONS',
      escalation: 'ATTEMPT 3',
      turn: 'THAT’S WHY IT WORKS',
      payoff: 'BECAUSE OF THE RULE',
    },
  },
  'ch-last-second': {
    lines: {
      hook: 'That timer is not enough.',
      setup: 'Three sections. Clock starts now.',
      escalation: 'Behind. Behind again.',
      turn: 'Forget the safe route.',
      payoff: 'Zero. On zero.',
    },
    captions: {
      hook: 'NOT ENOUGH TIME',
      setup: 'CLOCK STARTS NOW',
      escalation: 'BEHIND',
      turn: 'FORGET THE SAFE ROUTE',
      payoff: 'ON ZERO',
    },
  },
  'ch-handicap': {
    lines: {
      hook: 'One hand. You get the whole map.',
      setup: 'Those terms are ridiculous.',
      escalation: 'I’m ahead. I’m actually ahead.',
      turn: 'I wasn’t racing you.',
      payoff: 'Now you know the route.',
    },
    captions: {
      hook: 'ONE HAND',
      setup: 'RIDICULOUS TERMS',
      escalation: 'ACTUALLY AHEAD',
      turn: 'I WASN’T RACING',
      payoff: 'NOW YOU KNOW THE ROUTE',
    },
  },
  'my-one-frame': {
    lines: {
      hook: '',
      setup: 'Perfectly normal morning.',
      escalation: 'Was that always there?',
      turn: '',
      payoff: 'It was there the whole time.',
    },
    captions: {
      hook: 'WATCH THE FIRST FRAME',
      setup: 'PERFECTLY NORMAL',
      escalation: 'DID YOU SEE IT?',
      turn: 'SAME FRAME',
      payoff: 'IT WAS ALWAYS THERE',
    },
  },
  'my-locked-room': {
    lines: {
      hook: 'This was locked from the inside.',
      setup: 'Empty. Completely empty.',
      escalation: 'Not the window. Not the vent. Not the floor.',
      turn: 'Look up.',
      payoff: 'It was never a person.',
    },
    captions: {
      hook: 'LOCKED FROM INSIDE',
      setup: 'EMPTY',
      escalation: 'NOT THE WINDOW',
      turn: 'LOOK UP',
      payoff: 'NEVER A PERSON',
    },
  },
  'my-missing-name': {
    lines: {
      hook: 'There’s one more name than there are people.',
      setup: 'Twelve on the list. Eleven of us.',
      escalation: 'Nobody knows them. Everybody answers too fast.',
      turn: 'That’s my handwriting.',
      payoff: 'I wrote it. And I forgot.',
    },
    captions: {
      hook: 'ONE NAME TOO MANY',
      setup: '12 NAMES. 11 OF US.',
      escalation: 'EVERYBODY ANSWERS TOO FAST',
      turn: 'THAT’S MY HANDWRITING',
      payoff: 'I WROTE IT',
    },
  },
  'ex-single-take': {
    lines: {
      hook: '',
      setup: '',
      escalation: '',
      turn: 'Hey. That’s mine.',
      payoff: '',
    },
    captions: {
      hook: 'DON’T LOOK AWAY',
      setup: 'THE FACE DOES NOTHING',
      escalation: 'IT KEEPS GETTING WORSE',
      turn: 'THAT’S MINE',
      payoff: 'ONLY THAT ONE MATTERED',
    },
  },
  'ex-no-cut-dialogue': {
    // Silent by design: this seed's whole premise is a story carried by text.
    lines: {
      hook: '', setup: '', escalation: '', turn: '', payoff: '',
    },
    captions: {
      hook: 'HE HAS NO IDEA',
      setup: 'HE’S BEEN WALKING FOR AN HOUR',
      escalation: 'HE IS GOING THE WRONG WAY',
      turn: '…HE IS NOT.',
      payoff: 'NEVER MIND.',
    },
  },
  'ex-reverse': {
    lines: {
      hook: '',
      setup: 'How did we get here?',
      escalation: 'That explains nothing.',
      turn: 'It was a dropped key.',
      payoff: '',
    },
    captions: {
      hook: 'THIS IS THE END',
      setup: 'HOW DID WE GET HERE?',
      escalation: 'THAT EXPLAINS NOTHING',
      turn: 'A DROPPED KEY',
      payoff: 'NOW WATCH IT AGAIN',
    },
  },
};

// Attach the script table to the seeds it belongs to. Doing it here rather
// than inline keeps each seed's premise readable and makes a missing script
// impossible to overlook — the test suite asserts every seed is covered.
for (const pillar of PILLARS) {
  for (const seed of pillar.seeds) {
    Object.assign(seed, SCRIPTS[seed.id] ?? {});
  }
}

/**
 * Where each concept is actually staged, in Roblox terms.
 *
 * The seeds were first written as story premises, which left their settings
 * generic — "a bright examination room", "a rain-slick street". A prompt built
 * from that produces a generic room, and the video stops looking like the game
 * the audience knows. Every setting here names a place that exists in a Roblox
 * world, and every prop is an object that would be built out of parts.
 */
const STAGING = {
  'ah-smallest-patient': {
    setting: 'A treatment room in the Animal Hospital: one low bed, a supply trolley, flat white walls',
    props: ['patient chart clipboard', 'toy stethoscope', 'folded blanket on the trolley'],
  },
  'ah-night-shift': {
    setting: 'The Animal Hospital ward at night, one lamp lit and monitor screens glowing against dark blocky walls',
    props: ['bedside monitor', 'chart clipboard', 'desk lamp'],
  },
  'ah-wrong-chart': {
    setting: 'A treatment room in the Animal Hospital with two beds side by side and a wall clock above them',
    props: ['two chart clipboards', 'tweezers', 'wall clock'],
  },
  'tr-storm-drain': {
    setting: 'A Roblox town street at dusk, a storm drain set into the flat grey kerb',
    props: ['flashlight', 'street lamp', 'drain grate'],
  },
  'tr-box-doorstep': {
    setting: 'The front hallway of a Roblox house, a cardboard box sitting square in the middle of the floor',
    props: ['cardboard box', 'folded towel', 'front door'],
  },
  'tr-last-one': {
    setting: 'The Animal Hospital lobby at closing time, pet carriers lined along a bench',
    props: ['pet carrier', 'clipboard', 'wall clock'],
  },
  'cmp-what-they-see': {
    setting: 'An obby platform floating over an empty void, the next jump clearly visible ahead',
    props: ['checkpoint pad', 'floating platform', 'leaderboard'],
  },
  'cmp-first-day-last-day': {
    setting: 'The opening section of an obby, the same platform run framed identically both times',
    props: ['checkpoint pad', 'spinning obstacle', 'timer display'],
  },
  'cmp-two-budgets': {
    setting: 'Two adjacent build plots on a flat baseplate, one stacked with parts and one nearly bare',
    props: ['stack of coloured parts', 'single plank', 'plot boundary marker'],
  },
  'tp-copycat': {
    setting: 'An open Roblox game lobby with a flat patterned floor and other players idling in the background',
    props: ['spawn pad', 'lobby sign'],
  },
  'tp-fake-door': {
    setting: 'A corridor of identical doors in a Roblox map, one of them built flat into a blank wall',
    props: ['door', 'corridor light', 'queue of waiting players'],
  },
  'tp-swapped-seats': {
    setting: 'A Roblox classroom, desks in strict grid rows facing a blocky whiteboard',
    props: ['school desk', 'chair', 'whiteboard'],
  },
  'fc-one-sound': {
    setting: 'A Roblox suburban house, kitchen open to a living room with a blocky sofa',
    props: ['sofa', 'television', 'ice maker'],
  },
  'fc-homework-negotiation': {
    setting: 'The kitchen counter island of a Roblox house, two stools facing each other across it',
    props: ['homework sheet', 'pen', 'stool'],
  },
  'fc-quiet-competition': {
    setting: 'A Roblox living room with one obviously better seat facing the television',
    props: ['sofa', 'armchair', 'television'],
  },
  'tf-abandoned-build': {
    setting: 'A half-built structure on a bare baseplate, parts missing and one wall leaning out of square',
    props: ['loose building parts', 'leaning wall panel', 'toolbox'],
  },
  'tf-one-item': {
    setting: 'A Roblox avatar shop interior, mirrors and item racks along flat blocky walls',
    props: ['mirror', 'item rack', 'price sign'],
  },
  'tf-quiet-upgrade': {
    setting: 'A bedroom in a Roblox house, a desk setup pushed against the wall',
    props: ['desk', 'monitor', 'tape'],
  },
  'hs-too-good': {
    setting: 'A hide-and-seek map interior: a cluttered attic stacked with crates',
    props: ['crate', 'attic beam', 'seeker countdown display'],
  },
  'hs-wrong-game': {
    setting: 'A Roblox town square where nobody else is playing the game',
    props: ['bench', 'fountain', 'lamp post'],
  },
  'hs-swap': {
    setting: 'A hide-and-seek map with a long corridor of identical lockers',
    props: ['locker', 'corridor light', 'countdown timer'],
  },
  'ch-one-rule': {
    setting: 'A difficult obby section, narrow platforms strung over an empty void',
    props: ['narrow platform', 'checkpoint pad', 'spinning obstacle'],
  },
  'ch-last-second': {
    setting: 'A timed obby run, the timer display mounted above the finish arch',
    props: ['timer display', 'finish arch', 'checkpoint pad'],
  },
  'ch-handicap': {
    setting: 'The start line of an obby, two players side by side on the spawn pad',
    props: ['spawn pad', 'start gate', 'leaderboard'],
  },
  'my-one-frame': {
    setting: 'A Roblox bedroom squared to the grid, with one thing subtly out of place',
    props: ['bed', 'wall poster', 'bedside lamp'],
  },
  'my-locked-room': {
    setting: 'A small locked room in a Roblox map, one door and a hatch high in the ceiling',
    props: ['door', 'ceiling hatch', 'floor vent'],
  },
  'my-missing-name': {
    setting: 'The Animal Hospital reception desk, a printed roster pinned to the wall behind it',
    props: ['roster board', 'reception desk', 'pen'],
  },
  'ex-single-take': {
    setting: 'A Roblox map with a plain flat wall behind the subject and the world running on past the frame',
    props: ['background props', 'plain wall panel'],
  },
  'ex-no-cut-dialogue': {
    setting: 'A long flat Roblox road with nothing built on either side',
    props: ['road surface', 'distant baseplate edge'],
  },
  'ex-reverse': {
    setting: 'A Roblox room with a toppled stack of parts across the floor',
    props: ['stacked parts', 'dropped key', 'doorway'],
  },
};

// Restage every seed in its Roblox world. Kept separate from the premises so
// the story and the place it happens in can be reviewed independently.
for (const pillar of PILLARS) {
  for (const seed of pillar.seeds) {
    Object.assign(seed, STAGING[seed.id] ?? {});
  }
}
