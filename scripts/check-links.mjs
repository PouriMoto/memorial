#!/usr/bin/env node
// Checks every internal link/asset in dist/ (and #fragments). Run after `npm run build`.
// Use the same BASE_PATH you built with: BASE_PATH=/repo npm run check:links
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');
const base = (process.env.BASE_PATH || '/').replace(/\/$/, '');
if (!existsSync(dist)) {
  console.error('dist/ not found — run `npm run build` first.');
  process.exit(1);
}

const htmlFiles = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

const idCache = new Map();
const idsOf = (file) => {
  if (!idCache.has(file)) {
    const html = readFileSync(file, 'utf8');
    idCache.set(file, new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
};

const resolve = (urlPath) => {
  let p = urlPath.startsWith(base + '/') || urlPath === base ? urlPath.slice(base.length) : null;
  if (p === null) return null;
  p = decodeURIComponent(p);
  const full = path.join(dist, p);
  if (existsSync(full) && statSync(full).isFile()) return full;
  const idx = path.join(full, 'index.html');
  return existsSync(idx) ? idx : undefined;
};

let checked = 0;
const problems = [];
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1];
    if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(url)) continue;
    let target;
    let hash = '';
    if (url.startsWith('#')) {
      target = file;
      hash = url.slice(1);
    } else if (url.startsWith('/')) {
      const [p, h = ''] = url.split('#');
      hash = h;
      target = resolve(p.split('?')[0]);
      if (target === null) {
        problems.push(`${path.relative(dist, file)}: link outside base path → ${url}`);
        continue;
      }
    } else {
      // relative link (used in Markdown): resolve against the page's URL directory
      const [p, h = ''] = url.split('#');
      hash = h;
      const pageDir = path.dirname(file);
      const full = path.resolve(pageDir, p.split('?')[0]);
      target = existsSync(full) && statSync(full).isFile() ? full : existsSync(path.join(full, 'index.html')) ? path.join(full, 'index.html') : undefined;
    }
    checked++;
    if (!target) problems.push(`${path.relative(dist, file)}: broken link → ${url}`);
    else if (hash && target.endsWith('.html') && !idsOf(target).has(decodeURIComponent(hash))) problems.push(`${path.relative(dist, file)}: missing anchor → ${url}`);
  }
}
console.log(`Checked ${checked} internal references in ${htmlFiles.length} pages.`);
for (const p of problems) console.log('PROBLEM', p);
console.log(problems.length ? `${problems.length} problem(s)` : 'No broken internal links.');
process.exit(problems.length ? 1 : 0);
