/**
 * Shell behaviour: the mobile drawer, and the page status strip.
 *
 * Navigation itself is plain HTML — the sidebar is a list of anchors generated
 * at build time, so it works with scripting disabled and every browser gesture
 * (middle click, context menu, copy link address, keyboard activation) behaves
 * natively. Nothing here intercepts a click to open a tab.
 */

import { $, esc, setHTML } from './ui.js';
import { dateRange, relativeTime, timestamp } from './format.js';

const MOBILE = '(max-width: 1080px)';

/** Wire the mobile navigation drawer. */
export function mountShell() {
  const sidebar = $('#sidebar');
  const scrim = $('#scrim');
  const toggle = $('#menu-toggle');
  if (!sidebar || !toggle) return;

  const setOpen = (open) => {
    sidebar.dataset.open = String(open);
    if (scrim) scrim.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    if (open) sidebar.querySelector('.nav__link')?.focus();
  };

  toggle.addEventListener('click', () => setOpen(sidebar.dataset.open !== 'true'));
  scrim?.addEventListener('click', () => setOpen(false));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.dataset.open === 'true') { setOpen(false); toggle.focus(); }
  });

  // Choosing a destination closes the drawer behind it. The link still does the
  // navigating; this only tidies up the panel the tap came from — which matters
  // because the destination opens in a new tab and this one stays visible.
  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.nav__link') && window.matchMedia(MOBILE).matches) setOpen(false);
  });
}

/** The dataset status strip every data-backed page carries. */
export function renderStatus(report, snapshot) {
  const window = dateRange(report.window.start, report.window.end);
  setHTML('#head-status', `
    <span class="pill pill--live"><span class="dot"></span>Snapshot loaded</span>
    <span class="pill">${esc(window)}</span>
    <span class="pill" title="${esc(timestamp(report.fetchedAt))}">Updated ${esc(relativeTime(report.fetchedAt))}</span>
    <span class="pill pill--amber" title="${esc(snapshot.coverageNote ?? '')}">Coverage: ${esc(report.coverage)}</span>`);
}

export const statusUnavailable = (text = 'Snapshot unavailable') =>
  setHTML('#head-status', `<span class="pill pill--amber">${esc(text)}</span>`);
