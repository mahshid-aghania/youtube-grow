/**
 * Shared formatters.
 *
 * One place for every number, duration and date the interface prints, so a
 * view count reads the same in a metric card, a table cell and a tooltip.
 */

/** 43836834 -> "43.8M". For dense tables and cards. */
export function compactNumber(n) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${trimZero(n / 1e9)}B`;
  if (abs >= 1e6) return `${trimZero(n / 1e6)}M`;
  if (abs >= 1e3) return `${trimZero(n / 1e3)}K`;
  return String(Math.round(n));
}

/** 43.0 -> "43", 43.8 -> "43.8". Keeps one decimal only when it says something. */
function trimZero(value) {
  const fixed = value.toFixed(1);
  return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
}

/** 43836834 -> "43,836,834". For tooltips and screen readers, where precision matters. */
export function exactNumber(n) {
  return Number.isFinite(n) ? n.toLocaleString('en-US') : '—';
}

/** 15 -> "0:15", 75 -> "1:15". */
export function duration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

/** 15 -> "15s". Compact badge form for a Short's runtime. */
export function shortDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '—';
  return seconds >= 60 ? duration(seconds) : `${Math.round(seconds)}s`;
}

/** 6.7 -> "6.7%". */
export function percent(value, decimals = 1) {
  if (!Number.isFinite(value)) return '—';
  return `${Number(value.toFixed(decimals))}%`;
}

/** 489.99 -> "490×". A breakout multiple reads better without false precision. */
export function multiple(value) {
  if (!Number.isFinite(value)) return '—';
  if (value >= 100) return `${Math.round(value).toLocaleString('en-US')}×`;
  if (value >= 10) return `${value.toFixed(1)}×`;
  return `${value.toFixed(2)}×`;
}

/** "2026-08-26T12:50:00Z" -> "26 Aug 2026, 12:50 UTC". Stable across locales. */
export function timestamp(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC',
  }).format(date);
  return `${parts} UTC`;
}

/** "2026-08-19T00:00:00Z" -> "19 Aug". For a window's endpoints. */
export function shortDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
  }).format(date);
}

/** "19 Aug – 26 Aug 2026" from a window's two ends. */
export function dateRange(startIso, endIso) {
  const end = new Date(endIso);
  if (Number.isNaN(end.getTime())) return '—';
  const year = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: 'UTC' }).format(end);
  return `${shortDate(startIso)} – ${shortDate(endIso)} ${year}`;
}

/**
 * How long ago, in whole units. Takes `now` explicitly so it stays pure and
 * testable — nothing here reads the clock on its own.
 */
export function relativeTime(iso, now = Date.now()) {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '—';

  const seconds = Math.round((now - then) / 1000);
  if (seconds < 0) return 'just now';

  const units = [
    ['day', 86400], ['hour', 3600], ['minute', 60],
  ];
  for (const [unit, size] of units) {
    const count = Math.floor(seconds / size);
    if (count >= 1) return `${count} ${unit}${count === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}
