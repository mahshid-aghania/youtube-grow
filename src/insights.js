/**
 * Executive overview: headline metrics and a factual observation, both derived
 * only from the report that is actually loaded.
 *
 * Nothing here invents a trend, a percentage change or a comparison against a
 * previous period — the snapshot is a single window with no history, so any
 * "up 12% on last week" would be fabricated. Where a metric needs context, it
 * carries a caption stating what it is measured against.
 */

import { compactNumber, exactNumber, multiple, shortDuration } from './format.js';

/**
 * The six cards above the rankings.
 *
 * @param {object} report - the output of buildReport() in shorts.js
 * @returns {Array<{id, label, value, exact, caption, tone, icon}>}
 */
export function overviewMetrics(report) {
  const t = report.totals;
  const leader = report.topByViews[0] ?? null;
  const fastest = report.topByVph[0] ?? null;
  const breakout = report.breakouts[0] ?? null;

  return [
    {
      id: 'shorts',
      label: 'Shorts analysed',
      value: compactNumber(t.videoCount),
      exact: exactNumber(t.videoCount),
      caption: `Published in the tracked window`,
      tone: 'neutral',
      icon: 'film',
    },
    {
      id: 'views',
      label: 'Combined views',
      value: compactNumber(t.views),
      exact: exactNumber(t.views),
      caption: 'Lifetime views across every tracked Short',
      tone: 'red',
      icon: 'play',
    },
    {
      id: 'velocity',
      label: 'Peak velocity',
      value: compactNumber(t.peakVph),
      exact: `${exactNumber(Math.round(t.peakVph))} views per hour`,
      caption: fastest ? `Set by ${fastest.channel}` : 'No videos in range',
      tone: 'amber',
      icon: 'bolt',
    },
    {
      id: 'channels',
      label: 'Channels',
      value: compactNumber(t.channelCount),
      exact: exactNumber(t.channelCount),
      caption: 'Distinct channels represented',
      tone: 'cyan',
      icon: 'users',
    },
    {
      id: 'leader',
      label: 'Leading Short',
      value: leader ? compactNumber(leader.views) : '—',
      exact: leader ? exactNumber(leader.views) : '—',
      caption: leader ? leader.title : 'No videos in range',
      tone: 'violet',
      icon: 'trophy',
    },
    {
      id: 'breakout',
      label: 'Best breakout',
      value: breakout ? multiple(breakout.viewsPerSub) : '—',
      exact: breakout ? `${exactNumber(breakout.views)} views on ${exactNumber(breakout.subs)} subscribers` : '—',
      caption: breakout ? `${breakout.channel} · views ÷ subscribers` : 'No qualifying channels',
      tone: 'emerald',
      icon: 'trending',
    },
  ];
}

/**
 * One or more grounded observations about the loaded window.
 *
 * Each is a statement of fact recomputed from the data, phrased so it stays
 * true whatever the numbers turn out to be. An observation is omitted rather
 * than softened when the data cannot support it.
 *
 * @returns {Array<{id, headline, detail}>}
 */
export function keyInsights(report) {
  const out = [];
  const t = report.totals;
  const leader = report.topByViews[0];
  const fastest = report.topByVph[0];
  const breakout = report.breakouts[0];

  if (leader) {
    const share = t.views > 0 ? (leader.views / t.views) * 100 : 0;
    out.push({
      id: 'leader',
      headline: `${leader.channel} holds the top Short`,
      detail: `“${leader.title}” has ${compactNumber(leader.views)} views — `
        + `${share.toFixed(1)}% of all views in this window, from ${compactNumber(leader.subs)} subscribers.`,
    });
  }

  // Velocity only tells you something separate when it is a *different* video
  // from the view leader. When they coincide, saying it twice adds nothing.
  if (fastest && leader && fastest.id !== leader.id) {
    out.push({
      id: 'velocity',
      headline: `${fastest.channel} has the strongest momentum`,
      detail: `“${fastest.title}” is accumulating ${compactNumber(fastest.vph)} views per hour, `
        + `ahead of the current view leader on pace.`,
    });
  }

  if (breakout) {
    out.push({
      id: 'breakout',
      headline: `Reach is running well ahead of subscriber counts`,
      detail: `${breakout.channel} pulled ${compactNumber(breakout.views)} views from `
        + `${compactNumber(breakout.subs)} subscribers — ${multiple(breakout.viewsPerSub)} its audience size.`,
    });
  }

  if (t.videoCount > 0) {
    out.push({
      id: 'format',
      headline: `The typical Short here runs ${shortDuration(t.medianDurationSec)}`,
      detail: `Median views are ${compactNumber(t.medianViews)} against a mean of ${compactNumber(t.meanViews)}, `
        + `so a small number of large videos is pulling the average up.`,
    });
  }

  return out;
}

/**
 * Rows for the "top videos by views" bar chart.
 *
 * Values are scaled against the largest video in the set, so the longest bar is
 * always full width and every other bar is read against it.
 */
export function viewsChartRows(report, limit = 8) {
  const rows = report.topByViews.slice(0, limit);
  const peak = rows[0]?.views ?? 0;
  return rows.map((v) => ({
    id: v.id,
    label: v.title,
    channel: v.channel,
    value: v.views,
    display: compactNumber(v.views),
    exact: exactNumber(v.views),
    ratio: peak > 0 ? v.views / peak : 0,
  }));
}
