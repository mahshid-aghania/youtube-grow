/**
 * The route table — the single source of truth for navigation.
 *
 * Every page in the application is one entry here. The build script reads this
 * to generate a real directory per route (`public/for-you/index.html` and so
 * on), the sidebar markup, and each page's title and metadata; the browser
 * reads it to know which page it is on. Adding a page means adding a row here
 * and a body fragment in `src/pages/`, nothing else.
 *
 * Paths are directories rather than a client-side router because this is a
 * static site on GitHub Pages: `/youtube-grow/for-you/` is served by a real
 * file, so a direct visit and a refresh are ordinary static requests. There is
 * no history-API fallback to get wrong and no route that can 404 in production
 * while working locally.
 */

const svg = (path) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" `
  + `stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;

/**
 * @typedef {object} Route
 * @property {string} id        matches the body's data-page and the page fragment filename
 * @property {string} dir       directory under the site root; '' is the site root itself
 * @property {string} label     sidebar label
 * @property {string} title     browser title, without the site suffix
 * @property {string} description  meta description and Open Graph description
 * @property {string} icon      inline sidebar icon
 */

/** @type {Route[]} */
export const ROUTES = [
  {
    id: 'overview',
    dir: '',
    label: 'Overview',
    title: 'Overview',
    description: 'An executive summary of Roblox YouTube Shorts performance in the tracked '
      + '7-day window — headline metrics, the leading Short, the fastest mover, the leading '
      + 'channel and the strongest breakout.',
    icon: svg('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>'),
  },
  {
    id: 'for-you',
    dir: 'for-you',
    label: 'For You',
    title: 'For You',
    description: 'A personalised seven-day Roblox Shorts production plan built from current '
      + 'performance signals — concepts, characters, storyboards, generation prompts, audio '
      + 'and publishing packages. Data-informed and rule-based, not predictions.',
    icon: svg('<rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="m9.5 14 1.8 1.8L15 12.5"/>'),
  },
  {
    id: 'top-shorts',
    dir: 'top-shorts',
    label: 'Top Shorts',
    title: 'Top Shorts',
    description: 'Every tracked Roblox Short ranked by lifetime views, with views per hour, '
      + 'channel and subscriber context, duration and direct YouTube links.',
    icon: svg('<rect x="2" y="4" width="20" height="16" rx="4"/><path d="m10 9 5 3-5 3z"/>'),
  },
  {
    id: 'trending',
    dir: 'trending',
    label: 'Trending Now',
    title: 'Trending Now',
    description: 'Roblox Shorts ranked by average views per hour since publication — the '
      + 'fastest-moving videos in the tracked window, computed from snapshot data.',
    icon: svg('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
  },
  {
    id: 'top-channels',
    dir: 'top-channels',
    label: 'Top Channels',
    title: 'Top Channels',
    description: 'Channels ranked by total views across every Short they published in the '
      + 'tracked window, with Shorts represented, subscribers and average views per Short.',
    icon: svg('<path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="3.5"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/>'),
  },
  {
    id: 'breakout-videos',
    dir: 'breakout-videos',
    label: 'Breakout Videos',
    title: 'Breakout Videos',
    description: 'Roblox Shorts earning unusually high reach relative to their channel’s '
      + 'subscriber base, ranked by views per subscriber.',
    icon: svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
  },
  {
    id: 'shot-analyzer',
    dir: 'shot-analyzer',
    label: 'Shot Analyzer',
    title: 'Shot Analyzer',
    description: 'Reverse-engineer a Roblox Short scene by scene — how long each scene holds, '
      + 'what the character does and says, how the camera moves, and where the payoff lands.',
    icon: svg('<rect x="2.5" y="5" width="13" height="14" rx="2"/><path d="M18 8v8M21.5 10v4"/>'),
  },
];

export const SITE_NAME = 'Shorts Intelligence';
export const SITE_ORIGIN = 'https://mahshid-aghania.github.io/youtube-grow/';

export const routeById = (id) => ROUTES.find((r) => r.id === id) ?? null;

/** The full browser title for a route. */
export const pageTitle = (route) => `${route.title} | ${SITE_NAME}`;

/** A route's absolute URL, for canonical and Open Graph tags. */
export const canonicalUrl = (route) => (route.dir ? `${SITE_ORIGIN}${route.dir}/` : SITE_ORIGIN);

/**
 * How deep a route sits, as a relative prefix back to the site root.
 *
 * Root pages address siblings as `./x/`; a page one directory down needs `../`.
 * Keeping this here means no page fragment ever hard-codes `/youtube-grow/`,
 * which would break every local preview and any fork served from another path.
 */
export const rootPrefix = (route) => (route.dir ? '../' : './');

/** The href from one route to another, relative to the page being generated. */
export function hrefBetween(from, to) {
  const prefix = rootPrefix(from);
  return to.dir ? `${prefix}${to.dir}/` : prefix;
}
