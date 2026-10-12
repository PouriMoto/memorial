#!/usr/bin/env node
// Memories from the Google Sheet (exported as CSV) → the repository.
//
//   node scripts/import-memories.mjs import <slug> <file.csv> [--dry-run]
//       Reads the CSV and appends NEW rows to src/content/memorials/<slug>/memories.incoming.json
//       (git-ignored, so unreviewed text never reaches a public repository).
//       Every row is "pending"; nothing is ever approved automatically.
//
//   node scripts/import-memories.mjs publish <slug> <id> [<id>...]
//       Moves reviewed memories from memories.incoming.json into memories.json as approved.
//       Refuses memories whose publication permission is not "granted".
//
// Contact columns (email, phone, "how to reach you") and uploaded-file links are ignored on purpose.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

/** Minimal RFC 4180 CSV parser (quoted fields, escaped quotes, newlines inside quotes). */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

const norm = (s) => String(s ?? '').replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').replace(/[:؟?*]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/** Which column header means what. Edit here if your Google Form uses other wording. */
const FIELDS = {
  displayName: ['نام نمایشی', 'نام', 'نام شما', 'display name', 'name'],
  relationship: ['نسبت', 'نسبت شما', 'نسبت شما با او', 'relationship'],
  title: ['عنوان', 'عنوان خاطره', 'title'],
  text: ['خاطره', 'متن خاطره', 'متن', 'خاطره شما', 'memory', 'text'],
  topics: ['موضوع', 'موضوع ها', 'موضوعات', 'topics', 'topic'],
  date: ['تاریخ', 'تاریخ خاطره', 'date'],
  permission: ['اجازه انتشار', 'اجازه', 'اجازه می دهم', 'permission', 'consent'],
};
const IGNORED = ['timestamp', 'مهر زمانی', 'ایمیل', 'email', 'تلفن', 'شماره', 'تماس', 'phone', 'contact', 'عکس', 'فایل', 'photo', 'file', 'upload'];

function mapHeader(h) {
  const n = norm(h);
  for (const [key, names] of Object.entries(FIELDS)) if (names.map(norm).includes(n)) return key;
  return null;
}

const YES = /^(بله|آری|اره|yes|true|granted|اجازه می ?دهم|موافقم|✓|1)/i;
const slugId = (name, text) => {
  const h = createHash('sha1').update(`${name}\n${text}`).digest('hex').slice(0, 6);
  return `m-${h}`;
};
/** Jalali → Gregorian (the widely used jalaali algorithm). */
function jalaliToGregorian(jy, jm, jd) {
  jy += 1595;
  let days = -355668 + 365 * jy + Math.floor(jy / 33) * 8 + Math.floor(((jy % 33) + 3) / 4) + jd + (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal = [0, 31, (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  while (gm < 13 && gd > sal[gm]) gd -= sal[gm++];
  return [gy, gm, gd];
}

/** Dates are stored Gregorian. A year between 1300 and 1500 is read as Jalali; a Jalali year alone cannot be converted, so it is dropped. */
const normalizeDate = (d) => {
  const s = String(d ?? '').trim().replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c));
  const m = /^(\d{4})(?:[-/](\d{1,2})(?:[-/](\d{1,2}))?)?$/.exec(s);
  if (!m) return undefined;
  let [, y, mo, d2] = m;
  y = +y;
  if (y >= 1300 && y <= 1500) {
    if (!mo || !d2) return undefined;
    const [gy, gm, gd] = jalaliToGregorian(y, +mo, +d2);
    return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}`;
  }
  return [String(y), mo && mo.padStart(2, '0'), d2 && d2.padStart(2, '0')].filter(Boolean).join('-');
};

const root = path.resolve('src/content/memorials');
const readArr = (f) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : []);
const write = (f, arr) => writeFileSync(f, JSON.stringify(arr, null, 2) + '\n', 'utf8');

function doImport(slug, csvFile, dry) {
  const dir = path.join(root, slug);
  if (!existsSync(dir)) throw new Error(`Unknown memorial "${slug}"`);
  const rows = parseCsv(readFileSync(csvFile, 'utf8'));
  if (rows.length < 2) throw new Error('The CSV has no data rows');
  const header = rows[0];
  const map = header.map(mapHeader);
  const unknown = header.filter((h, i) => !map[i] && !IGNORED.some((x) => norm(h).includes(norm(x))));
  if (!map.includes('text') || !map.includes('displayName')) {
    throw new Error(`Could not find the name and memory columns in: ${header.join(' | ')}\nEdit FIELDS in scripts/import-memories.mjs to match your form.`);
  }
  const incomingFile = path.join(dir, 'memories.incoming.json');
  const known = new Set([...readArr(incomingFile), ...readArr(path.join(dir, 'memories.json'))].map((m) => m.id));
  const out = [];
  let dup = 0, noPerm = 0, privateHits = 0;
  for (const r of rows.slice(1)) {
    const o = {};
    r.forEach((v, i) => { if (map[i]) o[map[i]] = v.trim(); });
    if (!o.text || !o.displayName) continue;
    const id = slugId(o.displayName, o.text);
    if (known.has(id)) { dup++; continue; }
    known.add(id);
    const granted = o.permission ? YES.test(norm(o.permission)) : false;
    if (!granted) noPerm++;
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(o.text) || /\+?\d[\d\s-]{8,}\d/.test(o.text)) privateHits++;
    const item = { id, displayName: o.displayName };
    if (o.relationship) item.relationship = o.relationship;
    if (o.title) item.title = o.title;
    item.text = o.text;
    const date = normalizeDate(o.date);
    if (date) item.date = date;
    if (o.topics) item.topics = o.topics.split(/[,،;؛]/).map((x) => x.trim()).filter(Boolean);
    item.reviewStatus = 'pending';
    item.publicationPermission = granted ? 'granted' : 'unknown';
    out.push(item);
  }
  console.log(`${out.length} new, ${dup} already imported, ${noPerm} without a clear publication permission`);
  if (privateHits) console.log(`warning: ${privateHits} text(s) look like they contain an email or phone number: review before publishing`);
  if (unknown.length) console.log(`ignored columns: ${unknown.join(' | ')}`);
  console.log(`ids: ${out.map((m) => m.id).join(', ') || '(none)'}`);
  if (dry) return console.log('dry run: nothing written');
  if (out.length) write(incomingFile, [...readArr(incomingFile), ...out]);
  console.log(`written to ${path.relative(process.cwd(), incomingFile)} (git-ignored)`);
}

function doPublish(slug, ids) {
  const dir = path.join(root, slug);
  const incomingFile = path.join(dir, 'memories.incoming.json');
  const memFile = path.join(dir, 'memories.json');
  const incoming = readArr(incomingFile);
  const published = readArr(memFile);
  const moved = [];
  for (const id of ids) {
    const m = incoming.find((x) => x.id === id);
    if (!m) { console.log(`not found in incoming: ${id}`); continue; }
    if (m.publicationPermission !== 'granted') { console.log(`refused ${id}: publication permission is not "granted"`); continue; }
    published.push({ ...m, reviewStatus: 'approved' });
    moved.push(id);
  }
  if (!moved.length) return console.log('nothing published');
  write(memFile, published);
  write(incomingFile, incoming.filter((x) => !moved.includes(x.id)));
  console.log(`published: ${moved.join(', ')} → memories.json (now run: npm run validate)`);
}

const [cmd, slug, ...rest] = process.argv.slice(2);
try {
  if (cmd === 'import' && slug && rest[0]) doImport(slug, rest[0], rest.includes('--dry-run'));
  else if (cmd === 'publish' && slug && rest.length) doPublish(slug, rest);
  else {
    console.log('Usage:\n  import <slug> <file.csv> [--dry-run]\n  publish <slug> <id> [<id>...]');
    process.exit(1);
  }
} catch (e) {
  console.error('ERROR ' + e.message);
  process.exit(1);
}
