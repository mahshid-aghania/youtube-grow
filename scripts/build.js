#!/usr/bin/env node
/**
 * Assemble public/ for deployment.
 *
 * The page imports the same modules the test suite covers, rather than a copy,
 * so a rendering page is evidence the tested code works. Everything generated
 * here is gitignored — public/ holds only hand-written sources in git.
 */

import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const copy = (from, to) => {
  mkdirSync(join(to, '..'), { recursive: true });
  copyFileSync(from, to);
  console.log(`  ${from} -> ${to}`);
};

console.log('Building public/');

// Shared modules the page imports at runtime.
for (const file of readdirSync('src').filter((f) => f.endsWith('.js'))) {
  copy(join('src', file), join('public', file));
}

// Data snapshots the page fetches.
mkdirSync(join('public', 'data'), { recursive: true });
for (const file of readdirSync('data').filter((f) => f.endsWith('.json'))) {
  const from = join('data', file);
  copy(from, join('public', 'data', file));
  console.log(`    (${(statSync(from).size / 1024).toFixed(1)} KB)`);
}

console.log('Done.');
