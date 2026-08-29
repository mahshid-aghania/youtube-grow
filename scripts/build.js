#!/usr/bin/env node
/**
 * Assemble public/ for deployment.
 *
 * The page imports the same modules the test suite covers, rather than a copy,
 * so a rendering page is evidence the tested code works. Everything generated
 * here is gitignored — public/ holds nothing hand-written.
 *
 * Each route in src/routes.js becomes a real directory with its own
 * index.html: `/youtube-grow/for-you/` is a file on disk, not a client-side
 * route. That is what makes a direct visit, a refresh and a shared link work on
 * GitHub Pages without a history-API fallback or a 404.html redirect trick.
 */

import { copyFileSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROUTES } from '../src/routes.js';
import { renderPage } from '../src/shell.js';

const copy = (from, to) => {
  mkdirSync(join(to, '..'), { recursive: true });
  copyFileSync(from, to);
  console.log(`  ${from} -> ${to}`);
};

console.log('Building public/');

// Modules and styles the page loads at runtime, including src/planner/ and
// src/pages/ — the browser resolves those imports by path, so the tree must
// ship intact. src/pages/*.html are templates for the build, not runtime
// assets, so they are not copied.
const copySources = (fromDir, toDir) => {
  mkdirSync(toDir, { recursive: true });
  for (const entry of readdirSync(fromDir, { withFileTypes: true })) {
    const from = join(fromDir, entry.name);
    if (entry.isDirectory()) copySources(from, join(toDir, entry.name));
    else if (entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
      copy(from, join(toDir, entry.name));
    }
  }
};
copySources('src', 'public');

// One real directory per route, each a complete document built from the shared
// shell plus that page's body.
console.log('  Pages:');
for (const route of ROUTES) {
  const body = readFileSync(join('src', 'pages', `${route.id}.html`), 'utf8').trimEnd();
  const dir = route.dir ? join('public', route.dir) : 'public';
  mkdirSync(dir, { recursive: true });
  const target = join(dir, 'index.html');
  writeFileSync(target, renderPage(route, body));
  console.log(`    ${route.dir ? `/${route.dir}/` : '/'} -> ${target}`);
}

// Data the page fetches — including data/shotlists/, so nested dirs come too.
const copyJson = (fromDir, toDir) => {
  mkdirSync(toDir, { recursive: true });
  for (const entry of readdirSync(fromDir, { withFileTypes: true })) {
    const from = join(fromDir, entry.name);
    if (entry.isDirectory()) {
      copyJson(from, join(toDir, entry.name));
    } else if (entry.name.endsWith('.json')) {
      copy(from, join(toDir, entry.name));
      console.log(`    (${(statSync(from).size / 1024).toFixed(1)} KB)`);
    }
  }
};
copyJson('data', join('public', 'data'));

console.log('Done.');
