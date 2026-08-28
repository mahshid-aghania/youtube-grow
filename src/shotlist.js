/**
 * Shot lists: scene-by-scene breakdowns of a Short.
 *
 * Pure functions over a committed shot-list record — no network, no clock.
 * The scene analysis itself is produced by a video-understanding model and
 * stored in data/shotlists/<videoId>.json; this module parses the link the
 * user pastes, validates the record, and shapes it for rendering.
 *
 * A shot-list record looks like:
 *   { videoId, url, title, channel, durationSeconds, analysedAt, source,
 *     hook: { seconds, why },
 *     scenes: [{ n, startSec, endSec, action, dialogue, camera, visual }] }
 */

/** Every YouTube link shape that can carry a video id. */
const URL_PATTERNS = [
  /[?&]v=([A-Za-z0-9_-]{11})/,          // youtube.com/watch?v=ID
  /youtu\.be\/([A-Za-z0-9_-]{11})/,     // youtu.be/ID
  /\/shorts\/([A-Za-z0-9_-]{11})/,      // youtube.com/shorts/ID
  /\/embed\/([A-Za-z0-9_-]{11})/,       // youtube.com/embed/ID
  /\/live\/([A-Za-z0-9_-]{11})/,        // youtube.com/live/ID
];

const BARE_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Pull the 11-character video id out of whatever the user pasted.
 *
 * Accepts a full URL in any of YouTube's shapes, or a bare id.
 * Returns null rather than throwing, so a typo renders a message instead of
 * breaking the page.
 *
 * @param {string} input
 * @returns {string|null}
 */
export function parseVideoId(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (BARE_ID.test(trimmed)) return trimmed;

  for (const pattern of URL_PATTERNS) {
    const match = pattern.exec(trimmed);
    if (match) return match[1];
  }
  return null;
}

/** YouTube's own thumbnail for a video. hqdefault exists for every video. */
export function thumbnailUrl(videoId, quality = 'hqdefault') {
  if (!BARE_ID.test(videoId ?? '')) throw new RangeError('videoId must be an 11-character YouTube id');
  return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * The still frames YouTube publishes for every video, as a fraction of runtime.
 *
 * YouTube auto-generates exactly three interior stills — 1.jpg, 2.jpg and
 * 3.jpg — at roughly a quarter, half and three-quarters through. They are real
 * frames from the video and are the only per-timestamp images available without
 * downloading the file, so a shot list maps each scene to the nearest one.
 */
export const FRAME_FRACTIONS = [0.25, 0.5, 0.75];

/** How far a frame may sit from a scene's midpoint before we call it approximate. */
const EXACT_WINDOW_FRACTION = 0.08;

/**
 * Pick the published still that best represents a scene.
 *
 * Returns the frame's URL, the timestamp it was taken at, and whether it
 * genuinely lands inside the scene — a Short with nine scenes has more scenes
 * than YouTube has frames, so some rows necessarily share one, and the caller
 * must be able to say so rather than implying every row has its own shot.
 *
 * @param {{startSec: number, endSec: number}} scene
 * @param {number} durationSeconds
 * @param {string} videoId
 */
export function frameForScene(scene, durationSeconds, videoId) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new RangeError('durationSeconds must be positive');
  }
  const midpoint = (scene.startSec + scene.endSec) / 2;
  const times = FRAME_FRACTIONS.map((f) => f * durationSeconds);

  let best = 0;
  for (let i = 1; i < times.length; i += 1) {
    if (Math.abs(times[i] - midpoint) < Math.abs(times[best] - midpoint)) best = i;
  }

  const atSec = times[best];
  return {
    url: thumbnailUrl(videoId, String(best + 1)),
    index: best + 1,
    atSec: Math.round(atSec * 10) / 10,
    // "Inside the scene" is the honest bar: a frame from 0:07 shown against a
    // scene running 0:00–0:01 is a different moment, not that scene's shot.
    withinScene: atSec >= scene.startSec && atSec <= scene.endSec,
    exact: Math.abs(atSec - midpoint) <= durationSeconds * EXACT_WINDOW_FRACTION,
  };
}

/** 0 -> "0:00", 75 -> "1:15". Shorts never run past an hour. */
export function timecode(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const whole = Math.floor(seconds);
  const mins = Math.floor(whole / 60);
  const secs = whole % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/** "0:00–0:03" for a scene's span. */
export function sceneRange(scene) {
  return `${timecode(scene.startSec)}–${timecode(scene.endSec)}`;
}

/**
 * Validate and normalise a stored shot list for rendering.
 *
 * Fills each scene's duration from its span, numbers scenes in play order,
 * and computes what share of the video each scene occupies — the share is
 * what makes a shot list readable at a glance, since a 6-second beat in a
 * 15-second Short is doing far more work than the timecode alone suggests.
 *
 * @throws {TypeError} when the record is missing the fields the page needs
 */
export function normaliseShotlist(raw) {
  if (!raw || typeof raw !== 'object') throw new TypeError('shot list must be an object');
  if (!parseVideoId(raw.videoId)) throw new TypeError('shot list needs a valid videoId');
  if (!Array.isArray(raw.scenes) || raw.scenes.length === 0) {
    throw new TypeError('shot list needs at least one scene');
  }

  const scenes = [...raw.scenes]
    .sort((a, b) => a.startSec - b.startSec)
    .map((s, i) => {
      if (!Number.isFinite(s.startSec) || !Number.isFinite(s.endSec)) {
        throw new TypeError(`scene ${i + 1} needs numeric startSec and endSec`);
      }
      if (s.endSec < s.startSec) {
        throw new TypeError(`scene ${i + 1} ends before it starts`);
      }
      return {
        n: i + 1,
        startSec: s.startSec,
        endSec: s.endSec,
        durationSec: Math.round((s.endSec - s.startSec) * 10) / 10,
        action: s.action ?? '—',
        dialogue: s.dialogue ?? '—',
        camera: s.camera ?? '—',
        visual: s.visual ?? '',
      };
    });

  // Prefer the stated runtime; fall back to where the last scene ends.
  const runtime = Number.isFinite(raw.durationSeconds) && raw.durationSeconds > 0
    ? raw.durationSeconds
    : scenes[scenes.length - 1].endSec;

  return {
    videoId: raw.videoId,
    url: raw.url ?? `https://www.youtube.com/shorts/${raw.videoId}`,
    title: raw.title ?? '(untitled)',
    channel: raw.channel ?? '',
    durationSeconds: runtime,
    analysedAt: raw.analysedAt ?? null,
    source: raw.source ?? '',
    thumbnail: thumbnailUrl(raw.videoId),
    hook: raw.hook ?? null,
    sceneCount: scenes.length,
    meanSceneSec: Math.round((runtime / scenes.length) * 10) / 10,
    scenes: scenes.map((s) => ({
      ...s,
      share: runtime > 0 ? Math.round((s.durationSec / runtime) * 1000) / 10 : 0,
      frame: frameForScene(s, runtime, raw.videoId),
    })),
  };
}

/** The scene that takes up the most screen time — usually the payoff. */
export function longestScene(shotlist) {
  return shotlist.scenes.reduce((a, b) => (b.durationSec > a.durationSec ? b : a), shotlist.scenes[0]);
}
