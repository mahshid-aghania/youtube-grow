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

// Modules and styles the page loads at runtime.
for (const file of readdirSync('src').filter((f) => f.endsWith('.js') || f.endsWith('.css'))) {
  copy(join('src', file), join('public', file));
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
