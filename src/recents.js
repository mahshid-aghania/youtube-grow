/**
 * Recently analysed videos, remembered per browser.
 *
 * Small, self-contained and deliberately separate from the planner's store:
 * this is one list of video ids, not a week of production work, and losing it
 * costs nothing. Every read and write is guarded, so a private window or a full
 * quota degrades to "no history" rather than a broken page.
 *
 * The `storage` event fires only in *other* tabs of the same origin, which is
 * exactly the cross-tab signal wanted here: analyse a video in one tab and the
 * analyzer open in another updates its list without a reload.
 */

const KEY = 'shorts-intelligence:recent-analyses';
const LIMIT = 6;

/** @returns {{id: string, title?: string, at?: string}[]} */
export function loadRecents() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r) => r && typeof r.id === 'string').slice(0, LIMIT);
  } catch {
    return [];
  }
}

/** Move a video to the front of the list, de-duplicating by id. */
export function pushRecent({ id, title }) {
  if (!id) return;
  try {
    const next = [{ id, title, at: new Date().toISOString() },
      ...loadRecents().filter((r) => r.id !== id)].slice(0, LIMIT);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* history is a convenience; never let it break the analyzer */ }
}

/** Call back when another tab changes the list. */
export function onRecentsChanged(fn) {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) fn(loadRecents());
  });
}
