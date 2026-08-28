/**
 * Versioned local persistence.
 *
 * Only user-owned state is stored: preferences, per-day edits, locks, status,
 * scene marks and saved characters. Generated plans are rebuilt from templates
 * on every load, so improving a template improves every existing week rather
 * than leaving stale copies behind.
 *
 * The storage object is injected so this module stays testable without a DOM.
 */

export const STORAGE_KEY = 'shorts-intelligence:planner';
export const SCHEMA_VERSION = 2;

export const DEFAULT_PREFS = {
  weekStartDay: 'Saturday',
  postingDays: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  perDay: 1,
  niche: 'Roblox',
  pillars: [],
  audience: '',
  tone: 'Family-friendly',
  durationMode: 'auto',
  durationSec: 22,
  dialogue: true,
  visualStyle: '',
  imagePlatform: 'generic',
  videoPlatform: 'generic',
  aspect: '9:16',
  language: 'English',
  avoid: '',
};

const emptyState = () => ({
  version: SCHEMA_VERSION,
  prefs: { ...DEFAULT_PREFS },
  weekStart: null,
  days: {},            // iso -> { edits, locks, status, variant, sceneMarks }
  characters: {},      // roleKey -> character
});

/**
 * Migrate an older payload forward.
 *
 * v1 stored a flat `preferences` key and no per-day marks. Unknown or missing
 * versions fall back to defaults rather than throwing, because a corrupt blob
 * must never stop the page rendering.
 */
export function migrate(raw) {
  if (!raw || typeof raw !== 'object') return emptyState();

  let state = raw;
  if (state.version === 1) {
    state = {
      version: 2,
      prefs: { ...DEFAULT_PREFS, ...(state.preferences ?? {}) },
      weekStart: state.weekStart ?? null,
      days: state.days ?? {},
      characters: state.characters ?? {},
    };
  }
  if (state.version !== SCHEMA_VERSION) return emptyState();

  return {
    version: SCHEMA_VERSION,
    prefs: { ...DEFAULT_PREFS, ...(state.prefs ?? {}) },
    weekStart: typeof state.weekStart === 'string' ? state.weekStart : null,
    days: state.days && typeof state.days === 'object' ? state.days : {},
    characters: state.characters && typeof state.characters === 'object' ? state.characters : {},
  };
}

/** Read state, tolerating absent, unreadable or malformed storage. */
export function loadState(storage) {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return migrate(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

/** Persist state. Returns false when storage is unavailable rather than throwing. */
export function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: SCHEMA_VERSION }));
    return true;
  } catch {
    return false;
  }
}

export function clearState(storage) {
  try { storage.removeItem(STORAGE_KEY); return true; } catch { return false; }
}

/** The per-day record, with defaults filled in. */
export function dayRecord(state, iso) {
  const d = state.days[iso] ?? {};
  return {
    edits: d.edits ?? {},
    locks: Array.isArray(d.locks) ? d.locks : [],
    status: d.status ?? 'idea',
    variant: Number.isInteger(d.variant) ? d.variant : 0,
    sceneMarks: d.sceneMarks ?? {},
  };
}

export function setDay(state, iso, patch) {
  const next = { ...dayRecord(state, iso), ...patch };
  return { ...state, days: { ...state.days, [iso]: next } };
}

/** Variants map for recommendWeek(), so a regenerated day stays regenerated. */
export function variantMap(state) {
  const out = {};
  for (const [iso, d] of Object.entries(state.days)) {
    if (Number.isInteger(d.variant) && d.variant !== 0) out[iso] = d.variant;
  }
  return out;
}
