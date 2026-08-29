/**
 * Overview — the executive summary.
 *
 * Deliberately not a copy of every table: headline metrics, the grounded
 * observations, the single leader in each ranking, and a way into each detailed
 * workspace. Anyone who wants the full list opens the workspace that owns it.
 */

import { ROUTES, routeById } from '../routes.js';
import { keyInsights, overviewMetrics } from '../insights.js';
import { compactNumber, exactNumber, multiple, shortDuration } from '../format.js';
import {
  ICON, channelUrl, emptyState, esc, extLink, insightCard, metricCard, setHTML, thumbUrl, watchUrl,
} from '../ui.js';
import { withReport } from './shared.js';

const MOUNTS = ['#metrics', '#insights', '#leaders', '#workspaces'];

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/* ---------- leaders ---------- */

function leaderCard({ tone, eyebrow, route, title, href, thumb, meta, stat, statLabel }) {
  return `
    <article class="leader" style="--tone: var(--${tone}); --tone-wash: var(--${tone}-wash);">
      <p class="leader__eyebrow">${esc(eyebrow)}</p>
      <div class="leader__body">
        ${thumb ? `<img class="leader__thumb" src="${thumb}" alt="" width="96" height="54"
             loading="lazy" onerror="this.remove()">` : ''}
        <div>
          <h3 class="leader__title">${extLink(href, esc(title), 'leader__link')}</h3>
          <p class="leader__meta">${esc(meta)}</p>
        </div>
      </div>
      <p class="leader__stat"><strong>${esc(stat)}</strong> ${esc(statLabel)}</p>
      <p class="leader__more">${workspaceLink(route, 'See the full ranking')}</p>
    </article>`;
}

/** A link into another workspace, opening in its own tab. */
function workspaceLink(routeId, label) {
  const route = routeById(routeId);
  if (!route) return '';
  return `<a class="wslink" href="./${route.dir}/" target="_blank" rel="noopener noreferrer"
      aria-label="Open ${esc(route.label)} in a new tab" title="Opens this workspace in a new tab"
      >${esc(label)}${ICON.ext}</a>`;
}

function renderLeaders(deep) {
  const short = deep.topByViews[0];
  const fastest = deep.topByVph[0];
  const channel = deep.topChannels[0];
  const breakout = deep.breakouts[0];

  const cards = [
    short && leaderCard({
      tone: 'red', eyebrow: 'Leading Short', route: 'top-shorts',
      title: short.title, href: watchUrl(short.id), thumb: thumbUrl(short.id),
      meta: `${short.channel} · ${shortDuration(short.durationSec)}`,
      stat: compactNumber(short.views), statLabel: 'lifetime views',
    }),
    fastest && leaderCard({
      tone: 'amber', eyebrow: 'Highest views per hour', route: 'trending',
      title: fastest.title, href: watchUrl(fastest.id), thumb: thumbUrl(fastest.id),
      meta: `${fastest.channel} · ${shortDuration(fastest.durationSec)}`,
      stat: `${compactNumber(fastest.vph)}/hr`, statLabel: 'average since publication',
    }),
    channel && leaderCard({
      tone: 'cyan', eyebrow: 'Leading channel', route: 'top-channels',
      title: channel.channel, href: channelUrl(channel.channelId), thumb: '',
      meta: `${plural(channel.videoCount, 'tracked Short')} · ${compactNumber(channel.subs)} subscribers`,
      stat: compactNumber(channel.views), statLabel: 'views across this window',
    }),
    breakout && leaderCard({
      tone: 'emerald', eyebrow: 'Strongest breakout', route: 'breakout-videos',
      title: breakout.title, href: watchUrl(breakout.id), thumb: thumbUrl(breakout.id),
      meta: `${breakout.channel} · ${compactNumber(breakout.subs)} subscribers`,
      stat: multiple(breakout.viewsPerSub), statLabel: 'its subscriber count',
    }),
  ].filter(Boolean);

  setHTML('#leaders', cards.length
    ? cards.join('')
    : emptyState('No leaders to show', 'This window contains no ranked videos.'));
}

/* ---------- workspace previews ---------- */

/** A one-line preview of what each workspace currently holds. */
function previewFor(id, deep, report) {
  switch (id) {
    case 'for-you':
      return ['7 planned Shorts, Saturday to Friday',
        'Concepts, characters, storyboards and prompts',
        'Built from this snapshot — rule-based, not predictions'];
    case 'top-shorts':
      return deep.topByViews.slice(0, 3)
        .map((v) => `${compactNumber(v.views)} · ${v.title}`);
    case 'trending':
      return deep.topByVph.slice(0, 3)
        .map((v) => `${compactNumber(v.vph)}/hr · ${v.title}`);
    case 'top-channels':
      return deep.topChannels.slice(0, 3)
        .map((c) => `${compactNumber(c.views)} · ${c.channel}`);
    case 'breakout-videos':
      return deep.breakouts.slice(0, 3)
        .map((v) => `${multiple(v.viewsPerSub)} · ${v.title}`);
    case 'shot-analyzer':
      return ['Paste any YouTube Shorts link',
        'Scene timings, dialogue, camera and hook analysis',
        'Frames pulled from the stills YouTube publishes'];
    default:
      return [`${exactNumber(report.totals.videoCount)} Shorts tracked`];
  }
}

function workspaceCard(route, deep, report) {
  return `
    <article class="wscard">
      <div class="wscard__top">
        <span class="wscard__icon" aria-hidden="true">${route.icon}</span>
        <h3 class="wscard__title">${esc(route.label)}</h3>
      </div>
      <p class="wscard__desc">${esc(route.description)}</p>
      <ul class="wscard__preview">
        ${previewFor(route.id, deep, report).map((line) => `<li>${esc(line)}</li>`).join('')}
      </ul>
      <p class="wscard__action">${workspaceLink(route.id, `Open ${route.label}`)}</p>
    </article>`;
}

/* ---------- page ---------- */

export default function mount() {
  withReport(MOUNTS, ({ report, deep }) => {
    setHTML('#metrics', overviewMetrics(report).map(metricCard).join(''));

    const insights = keyInsights(report);
    setHTML('#insights', insights.length
      ? insights.map(insightCard).join('')
      : emptyState('No observations', 'The loaded window contains no videos to describe.'));

    renderLeaders(deep);

    setHTML('#workspaces', ROUTES
      .filter((r) => r.id !== 'overview')
      .map((r) => workspaceCard(r, deep, report))
      .join(''));
  });
}
