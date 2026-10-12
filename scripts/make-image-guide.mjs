#!/usr/bin/env node
// Builds a standalone HTML "image slot guide" for every memorial: docs/image-slots/<slug>.html.
// It lists every picture the site can show, with exact pixel sizes, file names, a drawn slot of the
// right proportion, whether the file already exists, and a button that copies the gallery.json entry.
// Run: npm run slots
import { readdirSync, readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

const root = path.resolve('src/content/memorials');
const pub = path.resolve('public');
const outDir = path.resolve('docs/image-slots');
mkdirSync(outDir, { recursive: true });

const readJson = (f, d = []) => (existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : d);
const fm = (f) => {
  const m = /^---\n([\s\S]*?)\n---/.exec(readFileSync(f, 'utf8'));
  return m ? parseYaml(m[1]) : {};
};
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const EXT = ['webp', 'jpg', 'jpeg', 'png', 'avif'];

/** Every slot: id, label, size, where it is used, brief, format, optional flag. */
function slotsFor(slug) {
  const dir = path.join(root, slug);
  const mem = readJson(path.join(dir, 'memorial.json'), {});
  const gallery = readJson(path.join(dir, 'gallery.json'));
  const memories = readJson(path.join(dir, 'memories.json'));
  const keepsakes = readJson(path.join(dir, 'keepsakes.json'));
  const chapters = existsSync(path.join(dir, 'story/fa'))
    ? readdirSync(path.join(dir, 'story/fa')).filter((f) => f.endsWith('.md')).sort().map((f) => ({ stem: f.replace(/\.md$/, ''), ...fm(path.join(dir, 'story/fa', f)) }))
    : [];
  const name = mem.name?.fa ?? slug;
  const s = [];
  s.push({ id: 'hero-portrait', group: 'اصلی', label: 'پرتره هیرو', w: 1200, h: 1600, fmt: 'WebP یا PNG با پس‌زمینهٔ شفاف', max: 250,
    use: ['صفحهٔ اول (هیرو)، پایین پرتره در پس‌زمینه محو می‌شود', 'صفحهٔ مزار (برش دایره‌ای؛ چهره را وسط و بالای کادر بگذارید)'],
    brief: `سر و شانهٔ ${name}، رو به دوربین یا کمی مایل، نور نرم. سر حدود ۱۵٪ از بالای کادر فاصله داشته باشد و شانه‌ها تا پایین ادامه یابند چون پایین کادر محو می‌شود.`, gid: mem.heroImageId ?? 'hero' });
  s.push({ id: 'og-image', group: 'اصلی', label: 'تصویر اشتراک‌گذاری', w: 1200, h: 630, fmt: 'JPG', max: 150,
    use: ['پیش‌نمایش لینک در تلگرام، بله، واتس‌اپ و گوگل'], brief: 'نام و چهره در بخش مرکزی؛ حاشیه‌های چپ و راست ممکن است بریده شود.', gid: 'og' });
  chapters.forEach((c, i) => s.push({ id: `chapter-${String(i + 1).padStart(2, '0')}`, group: 'فصل‌های روایت', label: `فصل ${i + 1}: ${c.title ?? c.stem}`, w: 1600, h: 1000, fmt: 'WebP', max: 220,
    use: ['در موبایل بالای فصل می‌چسبد (برش افقی)؛ موضوع را وسط کادر بگذارید'], brief: 'تصویر مرتبط با همین فصل (اختیاری). برای کلاژ فصل می‌توانید چند تصویر بدهید: در فایل فصل، فیلد imageIds.', optional: true, gid: `chapter-${i + 1}` }));
  [['collage-1', 'کلاژ ۱ (بزرگ، مربع)', 1600, 1600], ['collage-2', 'کلاژ ۲ (افقی)', 1200, 800], ['collage-3', 'کلاژ ۳ (افقی)', 1200, 800],
   ['collage-4', 'کلاژ ۴ (عمودی)', 1000, 1500], ['collage-5', 'کلاژ ۵ (پهن)', 1800, 600], ['collage-6', 'کلاژ ۶ (عمودی)', 1000, 1500]]
    .forEach(([id, label, w, h]) => s.push({ id, group: 'کلاژ تصاویر', label, w, h, fmt: 'WebP', max: 220,
      use: ['بخش «تصاویر» و گالری؛ با اسکرول ظاهر می‌شود'], brief: 'هر عکس می‌تواند هر نسبتی داشته باشد؛ کادر آن را می‌برد. موضوع را وسط بگذارید. شش عکس بهترین چیدمان را می‌دهند.', optional: true, gid: id }));
  memories.forEach((m) => s.push({ id: `avatar-${m.id}`, group: 'آواتار خاطره‌ها', label: `آواتار ${m.displayName}`, w: 256, h: 256, fmt: 'WebP', max: 30,
    use: ['کنار نام در فید خاطره‌ها (دایره)'], brief: 'اختیاری. اگر نباشد، حرف اول نام نشان داده می‌شود. فقط با اجازهٔ خود فرد.', optional: true, gid: `avatar-${m.id}` }));
  keepsakes.filter((k) => k.kind === 'handwriting' || k.kind === 'letter').forEach((k) => s.push({ id: `scan-${k.id}`, group: 'یادگارها', label: `اسکن: ${k.title?.fa ?? k.id}`, w: 1600, h: 2200, fmt: 'WebP', max: 300,
    use: ['صفحهٔ یادگارها، کنار متن تایپ‌شده'], brief: 'اسکن یا عکس مستقیم از بالا، نور یکنواخت، بدون سایه. حدود ۱۶۰۰ پیکسل عرض.', optional: true, gid: `scan-${k.id}` }));
  s.push({ id: 'extra', group: 'تصاویر دیگر', label: 'عکس‌های اضافه (گالری، پیوست خاطره)', w: 1600, h: null, fmt: 'WebP', max: 250,
    use: ['گالری، پیوست خاطره، خط زمانی'], brief: 'ضلع بلند ۱۶۰۰ پیکسل. نام فایل دلخواه ولی لاتین و با خط‌تیره.', optional: true, gid: 'photo-1' });

  const imgDir = path.join(pub, 'images', slug);
  const registered = new Set(gallery.map((g) => g.src));
  for (const x of s) {
    const found = EXT.map((e) => `${x.id}.${e}`).find((f) => existsSync(path.join(imgDir, f)));
    x.file = found ?? `${x.id}.webp`;
    x.exists = Boolean(found);
    x.src = `/images/${slug}/${x.file}`;
    x.registered = registered.has(x.src);
  }
  return { s, name };
}

function page(slug, name, slots) {
  const groups = [...new Set(slots.map((x) => x.group))];
  const done = slots.filter((x) => x.exists).length;
  const card = (x) => {
    const ratio = x.h ? `${x.w} / ${x.h}` : '4 / 3';
    const dims = x.h ? `${x.w} × ${x.h} px` : `ضلع بلند ${x.w} px`;
    const entry = JSON.stringify({ id: x.gid, src: x.src, width: x.w, height: x.h ?? undefined, title: { fa: '' }, caption: { fa: '' }, alt: { fa: '' }, license: 'permission-granted', status: 'needs-verification' }, null, 2);
    return `<article class="slot ${x.exists ? 'ok' : ''}">
  <div class="frame" style="aspect-ratio:${ratio}"><span>${esc(dims)}</span></div>
  <div class="meta">
    <h3>${esc(x.label)} ${x.optional ? '<small>اختیاری</small>' : '<small class="req">لازم</small>'}</h3>
    <p class="dim">${esc(dims)} · ${esc(x.fmt)} · حداکثر ${x.max} KB</p>
    <p class="file"><code dir="ltr">public${esc(x.src)}</code> <button data-copy="public${esc(x.src)}">کپی مسیر</button></p>
    <p>${esc(x.brief)}</p>
    <ul>${x.use.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>
    <p class="state">${x.exists ? '✔ فایل هست' : '✗ فایل هنوز نیست'}${x.exists ? (x.registered ? ' · در gallery.json ثبت شده' : ' · هنوز در gallery.json ثبت نشده') : ''}</p>
    <button data-copy='${esc(entry)}'>کپی ورودی gallery.json</button>
  </div>
</article>`;
  };
  return `<!doctype html>
<html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>راهنمای تصاویر: ${esc(name)}</title>
<style>
:root{--bg:#f6f2ea;--ink:#1d1a16;--soft:#5d564b;--line:#d6ccb9;--ok:#2e7d4f;--no:#b3261e;--acc:#8a5a1c;font-family:Vazirmatn,Tahoma,system-ui,sans-serif}
@media(prefers-color-scheme:dark){:root{--bg:#151210;--ink:#f1ece2;--soft:#b7ad9c;--line:#3a342c;--ok:#6fcf97;--no:#ff8a80;--acc:#e0b36a}}
body{margin:0;background:var(--bg);color:var(--ink);line-height:1.8}
main{max-width:70rem;margin:0 auto;padding:1.5rem 1rem 4rem}
h1{margin:.2rem 0}h2{margin-top:2.5rem;border-bottom:1px solid var(--line);padding-bottom:.4rem}
.lead,.dim{color:var(--soft)}
.rules{border:1px solid var(--line);border-radius:1rem;padding:1rem 1.25rem}
.grid{display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fill,minmax(19rem,1fr))}
.slot{border:1px solid var(--line);border-radius:1rem;overflow:hidden;display:flex;flex-direction:column}
.slot.ok{border-color:var(--ok)}
.frame{background:repeating-linear-gradient(45deg,transparent 0 10px,color-mix(in srgb,var(--line) 50%,transparent) 10px 20px);display:grid;place-items:center;border-bottom:1px dashed var(--soft);max-height:16rem;inline-size:100%}
.frame span{background:var(--bg);padding:.2rem .7rem;border-radius:999px;font-weight:700;direction:ltr}
.meta{padding:1rem}.meta h3{margin:0}.meta small{font-weight:400;color:var(--soft);font-size:.8rem}.meta small.req{color:var(--acc);font-weight:700}
.meta p{margin:.3rem 0}.meta ul{margin:.3rem 0;padding-inline-start:1.2rem;color:var(--soft);font-size:.92rem}
code{font-size:.85rem;word-break:break-all}
.state{font-weight:700}.ok .state{color:var(--ok)}.slot:not(.ok) .state{color:var(--no)}
button{font:inherit;font-size:.85rem;padding:.35rem .9rem;border-radius:999px;border:1px solid var(--ink);background:none;color:var(--ink);cursor:pointer;min-height:2.4rem}
button:hover{background:var(--ink);color:var(--bg)}
</style></head><body><main>
<h1>راهنمای تصاویر: ${esc(name)}</h1>
<p class="lead">${done} از ${slots.length} جایگاه پر است. هر کادرِ خط‌خطی اندازهٔ دقیق و نسبت تصویر است. این فایل را از روی داده‌ها <code>npm run slots</code> دوباره می‌سازد.</p>
<section class="rules"><strong>قواعد کلی</strong><ul>
<li>فایل‌ها را در <code dir="ltr">public/images/${esc(slug)}/</code> بگذارید؛ نام لاتین، حروف کوچک، با خط‌تیره.</li>
<li>قالب WebP با کیفیت حدود ۸۰؛ پرتره با پس‌زمینهٔ شفاف WebP یا PNG. سقف حجم هر تصویر در کارت‌ها آمده است (گورستان اینترنت ضعیف دارد).</li>
<li>برای هر تصویر متن جایگزین (alt)، شرح، پدیدآورنده/منبع و مجوز در <code>gallery.json</code> لازم است. تصویر ساخته‌شده با هوش مصنوعی را با همین برچسب ثبت کنید و سند تاریخی جا نزنید.</li>
<li>تصویر چهرهٔ افراد زنده (آواتار خاطره‌ها) فقط با اجازهٔ خودشان.</li></ul></section>
${groups.map((g) => `<h2>${esc(g)}</h2><div class="grid">${slots.filter((x) => x.group === g).map(card).join('')}</div>`).join('\n')}
<script>
document.addEventListener('click',function(e){var b=e.target.closest('[data-copy]');if(!b)return;var t=b.getAttribute('data-copy');
(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){var o=b.textContent;b.textContent='کپی شد ✓';setTimeout(function(){b.textContent=o},1400)},function(){window.prompt('کپی کنید:',t)})});
</script></main></body></html>`;
}

const slugs = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
const index = [];
for (const slug of slugs) {
  const { s, name } = slotsFor(slug);
  writeFileSync(path.join(outDir, `${slug}.html`), page(slug, name, s), 'utf8');
  index.push(`${slug}: ${s.length} slots, ${s.filter((x) => x.exists).length} filled → docs/image-slots/${slug}.html`);
}
console.log(index.join('\n'));
