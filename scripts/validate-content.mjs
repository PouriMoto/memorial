#!/usr/bin/env node
// Lightweight content validation. Run: npm run validate
// Exit code 1 when any ERROR is found; warnings never fail the run.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const root = path.resolve('src/content/memorials');
const publicDir = path.resolve('public');
const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(`ERROR   ${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`warning ${where}: ${msg}`);

const readJson = (file) => {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(rel(file), `invalid JSON (${e.message})`);
    return undefined;
  }
};
const rel = (p) => path.relative(process.cwd(), p);

function validDate(s) {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(s ?? '');
  if (!m) return false;
  const [, y, mo, d] = m;
  if (mo && (+mo < 1 || +mo > 12)) return false;
  if (d) {
    const dt = new Date(Date.UTC(+y, +mo - 1, +d));
    if (dt.getUTCMonth() !== +mo - 1 || dt.getUTCDate() !== +d) return false;
  }
  return true;
}

function validVideoUrl(provider, url) {
  try {
    const u = new URL(url);
    if (provider === 'youtube') {
      if (!['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(u.hostname)) return false;
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v');
      return Boolean(id && /^[\w-]{6,20}$/.test(id));
    }
    if (provider === 'aparat') return ['aparat.com', 'www.aparat.com'].includes(u.hostname) && /^\/v\/[\w-]+/.test(u.pathname);
  } catch {
    /* fall through */
  }
  return false;
}

function frontmatter(file) {
  const text = readFileSync(file, 'utf8');
  const m = /^---\n([\s\S]*?)\n---/.exec(text);
  if (!m) {
    err(rel(file), 'missing frontmatter');
    return {};
  }
  try {
    return parseYaml(m[1]) ?? {};
  } catch (e) {
    err(rel(file), `invalid frontmatter (${e.message})`);
    return {};
  }
}

const RESERVED = ['about', 'order', 'submit-memory', 'en', 'g'];
const slugs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
if (slugs.length === 0) err('src/content/memorials', 'no memorials found');

for (const slug of slugs) {
  const dir = path.join(root, slug);
  if (RESERVED.includes(slug)) err(slug, `slug "${slug}" is reserved for a site route`);
  const where = (f) => `${slug}/${f}`;

  // --- memorial.json ---
  const memFile = path.join(dir, 'memorial.json');
  if (!existsSync(memFile)) {
    err(where('memorial.json'), 'missing');
    continue;
  }
  const mem = readJson(memFile) ?? {};
  for (const k of ['name', 'nameLatin', 'tagline', 'summary', 'birth']) if (!mem[k]) err(where('memorial.json'), `missing "${k}"`);
  for (const k of ['name', 'tagline', 'summary']) if (mem[k] && !mem[k].fa) err(where('memorial.json'), `"${k}.fa" is required`);
  if (mem.birth && !validDate(mem.birth.date)) err(where('memorial.json'), `invalid birth.date "${mem.birth?.date}"`);
  if (mem.death && !validDate(mem.death.date)) err(where('memorial.json'), `invalid death.date "${mem.death?.date}"`);

  // --- sources ---
  const sources = existsSync(path.join(dir, 'sources.json')) ? readJson(path.join(dir, 'sources.json')) ?? [] : [];
  const sourceIds = new Set();
  for (const s of sources) {
    const w = where(`sources.json#${s.id}`);
    if (!s.id) err(where('sources.json'), 'item without id');
    if (sourceIds.has(s.id)) err(w, 'duplicate id');
    sourceIds.add(s.id);
    for (const k of ['title', 'publisher', 'url', 'type', 'relevance', 'status']) if (!s[k]) err(w, `missing "${k}"`);
    try { new URL(s.url); } catch { err(w, `invalid url "${s.url}"`); }
    if (s.publishedAt && !validDate(s.publishedAt)) err(w, `invalid publishedAt "${s.publishedAt}"`);
    if (s.accessedAt && !validDate(s.accessedAt)) err(w, `invalid accessedAt "${s.accessedAt}"`);
    if (s.type === 'unverified' && s.status === 'verified') err(w, 'type "unverified" cannot have status "verified"');
  }
  const checkRefs = (w, ids) => {
    for (const id of ids ?? []) if (!sourceIds.has(id)) err(w, `unknown source id "${id}"`);
  };
  checkRefs(where('memorial.json'), mem.sourceIds);
  const sample = mem.sample === true; // fictional demo: no external sources expected
  if (mem.calendar && !['gregory', 'persian'].includes(mem.calendar)) err(where('memorial.json'), `invalid calendar "${mem.calendar}"`);

  // --- gallery ---
  const gallery = existsSync(path.join(dir, 'gallery.json')) ? readJson(path.join(dir, 'gallery.json')) ?? [] : [];
  const galleryIds = new Set();
  for (const g of gallery) {
    const w = where(`gallery.json#${g.id}`);
    if (galleryIds.has(g.id)) err(w, 'duplicate id');
    galleryIds.add(g.id);
    for (const k of ['src', 'title', 'caption', 'alt', 'license']) if (!g[k]) err(w, `missing "${k}"`);
    if (!g.alt?.fa?.trim()) err(w, 'missing alt text (alt.fa)');
    if (g.date && !validDate(g.date)) err(w, `invalid date "${g.date}"`);
    if (g.src && !/^https?:\/\//.test(g.src)) {
      const local = path.join(publicDir, g.src.replace(/^\/+/, ''));
      if (!existsSync(local)) err(w, `local image not found: public${g.src.startsWith('/') ? '' : '/'}${g.src}`);
      else if (statSync(local).size > 1_500_000) warn(w, `image is ${(statSync(local).size / 1e6).toFixed(1)} MB — optimise it`);
    }
    const external = /^https?:\/\//.test(g.src ?? '');
    if (external && (!g.creator || !g.sourceUrl)) err(w, 'externally hosted image needs "creator" and "sourceUrl"');
    if (g.license === 'unknown') warn(w, 'license is "unknown" — do not publish until verified');
    if (g.status === 'verified' && !g.sourceUrl) err(w, 'status "verified" requires "sourceUrl"');
    if (['cc-by', 'cc-by-sa'].includes(g.license) && !g.creator) err(w, `license ${g.license} requires "creator" attribution`);
  }

  // --- videos ---
  const videos = existsSync(path.join(dir, 'videos.json')) ? readJson(path.join(dir, 'videos.json')) ?? [] : [];
  const videoIds = new Set();
  for (const v of videos) {
    const w = where(`videos.json#${v.id}`);
    if (videoIds.has(v.id)) err(w, 'duplicate id');
    videoIds.add(v.id);
    for (const k of ['title', 'description', 'provider', 'url']) if (!v[k]) err(w, `missing "${k}"`);
    if (!validVideoUrl(v.provider, v.url)) err(w, `invalid ${v.provider} url "${v.url}"`);
    if (v.status === 'verified' && !v.sourceUrl) err(w, 'status "verified" requires "sourceUrl"');
  }

  // --- memories ---
  const memories = existsSync(path.join(dir, 'memories.json')) ? readJson(path.join(dir, 'memories.json')) ?? [] : [];
  const memIds = new Set();
  for (const x of memories) {
    const w = where(`memories.json#${x.id}`);
    if (memIds.has(x.id)) err(w, 'duplicate id');
    memIds.add(x.id);
    for (const k of ['displayName', 'text']) if (!x[k]) err(w, `missing "${k}"`);
    const published = x.reviewStatus === 'approved' && x.publicationPermission === 'granted';
    if (!published) warn(w, 'not approved + permission granted: excluded from the public build (consider keeping unreviewed submissions out of the repository)');
    if (x.reviewStatus === 'approved' && x.publicationPermission !== 'granted') err(w, 'approved memory without publicationPermission "granted"');
    if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(`${x.text} ${x.displayName}`)) err(w, 'contains an email address — remove private data');
    if (/(\+?\d[\d\s-]{8,}\d)/.test(x.text ?? '')) warn(w, 'text looks like it contains a phone number — check for private data');
    if (x.portraitId && !galleryIds.has(x.portraitId)) err(w, `unknown portraitId "${x.portraitId}"`);
    for (const id of x.imageIds ?? []) if (!galleryIds.has(id)) err(w, `unknown imageId "${id}"`);
    if (x.videoId && !videoIds.has(x.videoId)) err(w, `unknown videoId "${x.videoId}"`);
    if (x.topics && !Array.isArray(x.topics)) err(w, '"topics" must be an array');
    if (x.date && !validDate(x.date)) err(w, `invalid date "${x.date}"`);
  }

  // --- keepsakes ---
  const keepsakes = existsSync(path.join(dir, 'keepsakes.json')) ? readJson(path.join(dir, 'keepsakes.json')) ?? [] : [];
  const ksIds = new Set();
  for (const k of keepsakes) {
    const w = where(`keepsakes.json#${k.id}`);
    if (ksIds.has(k.id)) err(w, 'duplicate id');
    ksIds.add(k.id);
    if (!['audio', 'music', 'letter', 'handwriting', 'object'].includes(k.kind)) err(w, `invalid kind "${k.kind}"`);
    if (!k.title?.fa) err(w, 'title.fa is required');
    if (!k.audioSrc && !k.text && !(k.imageIds?.length)) warn(w, 'keepsake has no audio, text or image');
    if (k.date && !validDate(k.date)) err(w, `invalid date "${k.date}"`);
    for (const id of k.imageIds ?? []) if (!galleryIds.has(id)) err(w, `unknown imageId "${id}"`);
    if (k.audioSrc) {
      const local = path.join(publicDir, k.audioSrc.replace(/^\/+/, ''));
      if (!/^https?:\/\//.test(k.audioSrc)) {
        if (!existsSync(local)) err(w, `audio file not found: public${k.audioSrc}`);
        else if (statSync(local).size > 5_000_000) warn(w, 'audio file is over 5 MB — compress it');
      }
    }
  }

  // --- story chapters ---
  const storyDir = path.join(dir, 'story');
  const chapterStems = { fa: new Set(), en: new Set() };
  for (const lang of ['fa', 'en']) {
    const d = path.join(storyDir, lang);
    if (!existsSync(d)) {
      if (lang === 'fa') warn(where('story/fa'), 'no Persian story chapters');
      continue;
    }
    for (const f of readdirSync(d).filter((n) => n.endsWith('.md'))) {
      const fm = frontmatter(path.join(d, f));
      const w = where(`story/${lang}/${f}`);
      if (!fm.title) err(w, 'missing title');
      if (typeof fm.order !== 'number') err(w, 'missing numeric order');
      checkRefs(w, fm.sourceIds);
      if (fm.imageId && !galleryIds.has(fm.imageId)) err(w, `unknown imageId "${fm.imageId}"`);
      for (const id of fm.imageIds ?? []) if (!galleryIds.has(id)) err(w, `unknown imageId "${id}"`);
      chapterStems[lang].add(f.replace(/\.md$/, ''));
    }
  }
  for (const stem of chapterStems.fa) if (!chapterStems.en.has(stem)) warn(where(`story/en/${stem}.md`), 'English version missing (the English page will skip this chapter)');
  for (const stem of chapterStems.en) if (!chapterStems.fa.has(stem)) warn(where(`story/fa/${stem}.md`), 'Persian version missing');

  // --- biography ---
  const bioFile = path.join(dir, 'biography.md');
  if (existsSync(bioFile)) {
    const fm = frontmatter(bioFile);
    for (const k of ['title', 'description']) if (!fm[k]) err(where('biography.md'), `missing "${k}"`);
    checkRefs(where('biography.md'), fm.sourceIds);
  }

  // --- timeline ---
  const timeline = existsSync(path.join(dir, 'timeline.json')) ? readJson(path.join(dir, 'timeline.json')) ?? [] : [];
  const evIds = new Set();
  for (const e of timeline) {
    const w = where(`timeline.json#${e.id}`);
    if (evIds.has(e.id)) err(w, 'duplicate id');
    evIds.add(e.id);
    if (!validDate(e.date)) err(w, `invalid date "${e.date}"`);
    if (!e.title?.fa || !e.description?.fa) err(w, 'title.fa and description.fa are required');
    if (e.milestone && (!e.title?.en || !e.description?.en)) warn(w, 'milestone has no English text (hidden on the English page)');
    checkRefs(w, e.sourceIds);
    if (!sample && e.status === 'verified' && (!e.sourceIds || e.sourceIds.length === 0)) err(w, 'status "verified" requires at least one source id');
    if (!sample && e.status !== 'verified' && (!e.sourceIds || e.sourceIds.length === 0)) warn(w, 'event has no sources');
    if (e.imageId && !galleryIds.has(e.imageId)) err(w, `unknown imageId "${e.imageId}"`);
    if (e.storyId && !chapterStems.fa.has(e.storyId)) err(w, `unknown storyId "${e.storyId}"`);
  }

  console.log(
    `${slug}: ${timeline.length} events, ${chapterStems.fa.size}/${chapterStems.en.size} chapters (fa/en), ${gallery.length} images, ${videos.length} videos, ${memories.length} memories (in file), ${keepsakes.length} keepsakes, ${sources.length} sources`,
  );
}

for (const w of warnings) console.log(w);
for (const e of errors) console.log(e);
console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length > 0 ? 1 : 0);
