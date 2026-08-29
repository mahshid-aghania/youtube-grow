import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

import {
  ROUTES, SITE_ORIGIN, canonicalUrl, hrefBetween, pageTitle, rootPrefix, routeById,
} from '../src/routes.js';
import { renderPage } from '../src/shell.js';

const fragment = (route) =>
  readFileSync(new URL(`../src/pages/${route.id}.html`, import.meta.url), 'utf8');

/** Every page, rendered exactly as the build renders it. */
const rendered = new Map(ROUTES.map((r) => [r.id, renderPage(r, fragment(r))]));

const attrs = (html, tag) => html.match(new RegExp(`<${tag}\\b[^>]*>`, 'g')) ?? [];
const navLinks = (html) => attrs(html, 'a').filter((a) => a.includes('class="nav__link"'));

/* ---------- the route table ---------- */

test('the route table covers every required destination exactly once', () => {
  assert.deepEqual(ROUTES.map((r) => r.id), [
    'overview', 'for-you', 'top-shorts', 'trending',
    'top-channels', 'breakout-videos', 'shot-analyzer',
  ]);
  assert.equal(new Set(ROUTES.map((r) => r.dir)).size, ROUTES.length, 'no two routes share a directory');
  assert.equal(new Set(ROUTES.map((r) => r.title)).size, ROUTES.length, 'no two routes share a title');
});

test('every route is complete enough to render a page', () => {
  for (const r of ROUTES) {
    assert.ok(r.label && r.label.length > 2, `${r.id} has a sidebar label`);
    assert.ok(r.title && r.title.length > 2, `${r.id} has a title`);
    assert.ok(r.description.length > 60, `${r.id} has a real meta description`);
    assert.match(r.icon, /^<svg/, `${r.id} has a sidebar icon`);
    assert.ok(existsSync(new URL(`../src/pages/${r.id}.html`, import.meta.url)),
      `${r.id} has a body fragment`);
  }
});

test('only the overview sits at the site root', () => {
  assert.equal(routeById('overview').dir, '');
  for (const r of ROUTES.filter((x) => x.id !== 'overview')) {
    assert.match(r.dir, /^[a-z][a-z-]*[a-z]$/, `${r.id} is a clean single-segment directory`);
  }
});

test('canonical URLs sit under the GitHub Pages base path', () => {
  assert.equal(canonicalUrl(routeById('overview')), SITE_ORIGIN);
  assert.equal(canonicalUrl(routeById('for-you')), `${SITE_ORIGIN}for-you/`);
  for (const r of ROUTES) {
    assert.ok(canonicalUrl(r).startsWith(SITE_ORIGIN), `${r.id} stays inside the base path`);
    assert.ok(canonicalUrl(r).endsWith('/'), `${r.id} keeps its trailing slash`);
  }
});

test('page titles are unique and none keeps the old generic title', () => {
  const titles = ROUTES.map(pageTitle);
  assert.equal(new Set(titles).size, titles.length);
  for (const t of titles) {
    assert.match(t, / \| Shorts Intelligence$/);
    assert.doesNotMatch(t, /Roblox Shorts — 7-day report/);
  }
});

/* ---------- relative links resolve under any base path ---------- */

test('every sidebar href resolves to the right absolute URL from every page', () => {
  for (const from of ROUTES) {
    const pageUrl = canonicalUrl(from);
    for (const to of ROUTES) {
      const resolved = new URL(hrefBetween(from, to), pageUrl).href;
      assert.equal(resolved, canonicalUrl(to),
        `${from.id} → ${to.id} resolves to ${canonicalUrl(to)}`);
    }
  }
});

test('links stay relative, so the site works under any base path', () => {
  for (const from of ROUTES) {
    for (const to of ROUTES) {
      const href = hrefBetween(from, to);
      assert.doesNotMatch(href, /^\//, `${from.id} → ${to.id} is not an absolute path`);
      assert.doesNotMatch(href, /youtube-grow/, `${from.id} → ${to.id} does not hard-code the repo path`);
    }
  }
  assert.equal(rootPrefix(routeById('overview')), './');
  assert.equal(rootPrefix(routeById('trending')), '../');
});

/* ---------- the rendered pages ---------- */

test('each page marks itself current, and only itself', () => {
  for (const route of ROUTES) {
    const current = navLinks(rendered.get(route.id)).filter((a) => a.includes('aria-current="page"'));
    assert.equal(current.length, 1, `${route.id} has exactly one current link`);
    assert.ok(current[0].includes(`href="${hrefBetween(route, route)}"`),
      `${route.id}'s current link points at itself`);
  }
});

test('the current page never opens a duplicate of itself in a new tab', () => {
  for (const route of ROUTES) {
    const current = navLinks(rendered.get(route.id)).find((a) => a.includes('aria-current="page"'));
    assert.doesNotMatch(current, /target=/, `${route.id} does not re-open itself`);
    assert.match(current, /href="/, `${route.id} stays a real, copyable link`);
  }
});

test('every other destination opens in a new tab, safely and with a label', () => {
  for (const route of ROUTES) {
    const others = navLinks(rendered.get(route.id)).filter((a) => !a.includes('aria-current="page"'));
    assert.equal(others.length, ROUTES.length - 1, `${route.id} links to every other page`);
    for (const link of others) {
      assert.match(link, /target="_blank"/, `${route.id}: opens in a new tab`);
      assert.match(link, /rel="noopener noreferrer"/, `${route.id}: severs the opener`);
      assert.match(link, /aria-label="Open .+ in a new tab"/, `${route.id}: says so to a screen reader`);
      assert.match(link, /title="Opens this workspace in a new tab"/, `${route.id}: says so on hover`);
    }
  }
});

test('the new-tab behaviour is never signalled by the icon alone', () => {
  const html = rendered.get('overview');
  // The marker is decorative; the label and tooltip carry the meaning.
  assert.match(html, /class="nav__ext"[^>]*aria-hidden="true"/);
  assert.match(html, /Each workspace opens in its own browser tab\./);
});

test('every page carries one h1, its own title, canonical and Open Graph tags', () => {
  const seen = new Set();
  for (const route of ROUTES) {
    const html = rendered.get(route.id);
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${route.id} has exactly one h1`);

    const title = html.match(/<title>([^<]+)<\/title>/)[1];
    assert.equal(title, pageTitle(route));
    assert.ok(!seen.has(title), `${route.id} has a title no other page uses`);
    seen.add(title);

    assert.ok(html.includes(`<link rel="canonical" href="${canonicalUrl(route)}">`),
      `${route.id} declares its canonical URL`);
    assert.ok(html.includes(`<meta property="og:url" content="${canonicalUrl(route)}">`),
      `${route.id} declares its Open Graph URL`);
    assert.ok(html.includes(`<meta name="description" content="${route.description}">`),
      `${route.id} has its own meta description`);
    assert.ok(html.includes(`<body data-page="${route.id}">`),
      `${route.id} tells the entry point which page it is`);
  }
});

test('assets are addressed relative to the page, never to a hard-coded base path', () => {
  for (const route of ROUTES) {
    const html = rendered.get(route.id);
    const prefix = rootPrefix(route);
    assert.ok(html.includes(`href="${prefix}styles.css"`), `${route.id} finds the stylesheet`);
    assert.ok(html.includes(`src="${prefix}app.js"`), `${route.id} finds the entry point`);

    // Absolute site paths would break every fork and local preview. The only
    // absolute URLs allowed are the canonical and Open Graph tags, which are
    // meant to name the deployed site, plus genuinely external hosts.
    const local = html.match(/(?:href|src)="\/[^"]*"/g) ?? [];
    assert.deepEqual(local, [], `${route.id} uses no absolute local paths`);
  }
});

/* ---------- the entry point knows every route ---------- */

test('the entry point registers a page module for every route', () => {
  const app = readFileSync(new URL('../src/app.js', import.meta.url), 'utf8');
  for (const route of ROUTES) {
    const key = /^[a-z]+$/.test(route.id) ? route.id : `'${route.id}'`;
    assert.ok(app.includes(`${key}: () => import('./pages/${route.id}.js')`),
      `${route.id} is registered in the page map`);
    assert.ok(existsSync(new URL(`../src/pages/${route.id}.js`, import.meta.url)),
      `${route.id} has a page module`);
  }
});
