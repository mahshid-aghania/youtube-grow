/**
 * Application entry point.
 *
 * Every page loads this same module. The shell is wired first — it is identical
 * everywhere — and then the one page module named by `<body data-page>` is
 * imported. A page's code is only fetched on the page that uses it, so opening
 * Trending Now does not download the planner.
 */

import { mountShell } from './nav.js';

/** Page id → module loader. Kept beside the route table it mirrors. */
const PAGES = {
  overview: () => import('./pages/overview.js'),
  'for-you': () => import('./pages/for-you.js'),
  'top-shorts': () => import('./pages/top-shorts.js'),
  trending: () => import('./pages/trending.js'),
  'top-channels': () => import('./pages/top-channels.js'),
  'breakout-videos': () => import('./pages/breakout-videos.js'),
  'shot-analyzer': () => import('./pages/shot-analyzer.js'),
};

async function boot() {
  mountShell();

  const id = document.body.dataset.page;
  const load = PAGES[id];
  if (!load) {
    console.error(`No page module is registered for "${id}".`);
    return;
  }

  const module = await load();
  await module.default();
}

boot();
