/**
 * The load-render-fail cycle every data-backed page repeats.
 *
 * Kept in one place so all six pages show the same loading, empty and error
 * treatment, and so no page invents its own way of failing.
 */

import { loadReport } from '../data.js';
import { renderStatus, statusUnavailable } from '../nav.js';
import { emptyState, errorState, setHTML } from '../ui.js';

/**
 * @param {string[]} mounts  selectors to fill with the empty or error state
 * @param {(ctx: object) => void} render  called with { snapshot, report, videos, deep }
 */
export async function withReport(mounts, render) {
  try {
    const ctx = await loadReport();

    if (ctx.report.totals.videoCount === 0) {
      statusUnavailable('Snapshot empty');
      for (const sel of mounts) {
        setHTML(sel, emptyState('No videos in this window',
          'The snapshot loaded, but it contains no Shorts for the tracked period.'));
      }
      return;
    }

    renderStatus(ctx.report, ctx.snapshot);
    render(ctx);
  } catch (err) {
    statusUnavailable();
    const message = `The Shorts snapshot could not be loaded — ${err.message}.`;
    setHTML(mounts[0], errorState('Data unavailable', message));
    for (const sel of mounts.slice(1)) setHTML(sel, '');
  }
}

/** Bar-chart rows from a ranked video list, scaled against the leader. */
export function chartRows(rows, { value, display, limit = 8 }) {
  const top = rows.slice(0, limit);
  const max = Math.max(...top.map(value), 1);
  return top.map((r) => ({
    label: r.title ?? r.channel,
    channel: r.channel,
    display: display(r),
    ratio: value(r) / max,
  }));
}
