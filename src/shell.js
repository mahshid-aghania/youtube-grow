/**
 * The application shell, rendered once at build time into every page.
 *
 * There is one copy of the chrome — document head, sidebar, mobile topbar,
 * footer — and the build injects each page's own body into it. No page file
 * repeats the shell, so a change to navigation or branding lands everywhere at
 * once.
 *
 * This module runs in Node during the build, not in the browser.
 */

import { ROUTES, SITE_NAME, canonicalUrl, hrefBetween, pageTitle, rootPrefix } from './routes.js';

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** The "opens in a new tab" marker shown beside every inactive destination. */
const EXT_MARK = '<svg class="nav__ext" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
  + 'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
  + '<path d="M14 4h6v6M20 4 10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>';

/**
 * One sidebar entry.
 *
 * The active page links to itself with no `target`, so clicking it stays put
 * rather than opening a duplicate tab — it is still a real link, so it can be
 * focused, copied and opened deliberately with a middle click. Every other
 * entry is an ordinary anchor with `target="_blank"`: a plain click opens a new
 * tab, and middle-click, the context menu, "copy link address" and keyboard
 * activation all behave exactly as the browser intends, because nothing here
 * calls `window.open`.
 */
function navLink(current, route) {
  const active = route.id === current.id;
  const href = hrefBetween(current, route);

  if (active) {
    return `      <a class="nav__link" href="${href}" aria-current="page">
        ${route.icon}
        <span class="nav__text">${esc(route.label)}</span>
        <span class="sr-only">(current page)</span>
      </a>`;
  }

  return `      <a class="nav__link" href="${href}" target="_blank" rel="noopener noreferrer"
         aria-label="Open ${esc(route.label)} in a new tab"
         title="Opens this workspace in a new tab">
        ${route.icon}
        <span class="nav__text">${esc(route.label)}</span>
        ${EXT_MARK}
      </a>`;
}

const nav = (current) => ROUTES.map((r) => navLink(current, r)).join('\n');

/** The full document for one route. */
export function renderPage(route, body) {
  const prefix = rootPrefix(route);
  const title = pageTitle(route);
  const url = canonicalUrl(route);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(route.description)}">
<meta name="theme-color" content="#08080a">
<meta name="color-scheme" content="dark">
<link rel="canonical" href="${esc(url)}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(SITE_NAME)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(route.description)}">
<meta property="og:url" content="${esc(url)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(route.description)}">

<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' rx='5' fill='%2308080a'/%3E%3Cpath d='M12 4 4.5 8v8l7.5 4 7.5-4V8z' fill='none' stroke='%23ff4d4f' stroke-width='1.6' stroke-linejoin='round'/%3E%3Cpath d='m10.5 9.5 4 2.5-4 2.5z' fill='%23ff4d4f'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
<link rel="stylesheet" href="${prefix}styles.css">
</head>
<body data-page="${esc(route.id)}">
<a class="skip" href="#main">Skip to content</a>

<div class="app">
  <!-- Mobile drawer backdrop; inert on desktop. -->
  <div class="scrim" id="scrim" data-open="false" aria-hidden="true"></div>

  <aside class="sidebar" id="sidebar" data-open="false" aria-label="Workspaces">
    <a class="brand" href="${prefix}">
      <span class="brand__mark" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m10 9 5 3-5 3z"/></svg>
      </span>
      <span>
        <span class="brand__name">${esc(SITE_NAME)}</span><br>
        <span class="brand__sub">Roblox · 7-day window</span>
      </span>
    </a>

    <nav class="nav" aria-label="Workspaces">
      <p class="nav__label" id="nav-label">Dashboard</p>
${nav(route)}
      <p class="nav__note">Each workspace opens in its own browser tab.</p>
    </nav>

    <div class="sidebar__foot">
      <p>Deployed from GitHub Actions</p>
      <p><a href="https://github.com/mahshid-aghania/youtube-grow" target="_blank" rel="noopener noreferrer">Source repository</a></p>
      <p>Refresh data with <code>npm run fetch:shorts</code></p>
    </div>
  </aside>

  <div>
    <!-- Compact header, shown only below the sidebar breakpoint. -->
    <div class="topbar">
      <button class="topbar__menu" id="menu-toggle" type="button"
              aria-expanded="false" aria-controls="sidebar" aria-label="Open workspace menu">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
      </button>
      <span class="brand__name">${esc(route.title)}</span>
    </div>

    <main class="main" id="main">
${body}
    </main>
  </div>
</div>

<script type="module" src="${prefix}app.js"></script>
</body>
</html>
`;
}
