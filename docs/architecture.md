# Architecture

## Overview

A fully static Astro 7 site (`output: 'static'`, `trailingSlash: 'always'`). All content is committed as Markdown/JSON and validated by Astro content collections (Zod 4) plus `scripts/validate-content.mjs`. Hosting target: GitHub Pages.

```
src/
  content/
    memorials/<slug>/        one folder per memorial
      memorial.json          metadata, enabled sections, hero image, featured flag
      biography.md           long-form biography (Persian)
      story/fa/NN-name.md    scrollytelling chapters (Persian)
      story/en/NN-name.md    scrollytelling chapters (English, optional per chapter)
      timeline.json          array of events
      gallery.json           array of images (metadata; files in public/images/<slug>/)
      videos.json            array of YouTube/Aparat links
      memories.json          array of memories (only approved+permitted are published)
      sources.json           array of sources
    site/settings.json       site settings, contact links, Google Forms URL, CTA
    site/author.json         creator display name / introduction
  content.config.ts          collections, schemas, memorialListLoader
  lib/                       memorial.ts (data access), format.ts (dates), url.ts (base path),
                             video.ts (embed URLs), i18n.ts (fa/en strings), site.ts (settings)
  layouts/                   BaseLayout (head/SEO/lang/dir), MemorialLayout (sub-pages)
  components/                StoryPage, StoryHero, StorySection, Timeline, PhotoGallery,
                             VideoEmbed, MemoryCard, SourceNote, OrderCTA, SiteHeader, SiteFooter
  pages/                     routes (below)
  styles/                    global.css (tokens), typography.css
scripts/                     validate-content.mjs, check-links.mjs
```

## Content model

| Collection | Source | Key fields |
|---|---|---|
| `memorials` | `<slug>/memorial.json` | name{fa,en}, nameLatin, tagline, summary, birth, death, sourceIds, heroImageId, featured, enabledSections |
| `story` | `<slug>/story/<lang>/*.md` | title, order, kicker, dateLabel, sourceIds, imageId |
| `biography` | `<slug>/biography.md` | title, description, sourceIds |
| `timeline` | `<slug>/timeline.json` | id, date (YYYY[-MM[-DD]]), precision, title, description, milestone, storyId, sourceIds, status |
| `gallery` | `<slug>/gallery.json` | id, src, title, caption, alt, date, creator, sourceUrl, license, licenseUrl, status |
| `videos` | `<slug>/videos.json` | id, title, description, provider, url, sourceUrl, status |
| `memories` | `<slug>/memories.json` | id, displayName, relationship, text, date, portraitId, reviewStatus, publicationPermission |
| `sources` | `<slug>/sources.json` | id, title, publisher, url, publishedAt, accessedAt, type, relevance, status |

Text fields that can be bilingual use `{ fa: string, en?: string }`; `en` falls back to `fa` and, on the English page, events without English text are skipped.

Dates are Gregorian strings. `precision` is `exact | month | year | approximate | uncertain`; the UI renders exact dates with a solid marker and approximate ones with a dashed marker. Solar Hijri dates are not generated; add them only when a source states them.

## Routes

| Route | Page |
|---|---|
| `/` | Scrollytelling for the featured memorial (fa); canonical → `/<slug>/` |
| `/en/` | Same, English; canonical → `/en/<slug>/` |
| `/<slug>/`, `/en/<slug>/` | Memorial landing = scrollytelling (fa / en) |
| `/<slug>/biography/`, `timeline/`, `gallery/`, `videos/`, `memories/`, `sources/` | Persian sub-pages, generated when the section is enabled |
| `/<slug>/keepsakes/`, `/<slug>/memories/<id>/` | Keepsakes page; one permalink per published memory |
| `/g/<slug>/` | Grave-side page (`features.grave`): tiny, no JS, system fonts, `noindex` |
| `/<slug>/qr/` | Printable QR (`features.qr`), built with `qrcode` at build time; `noindex` |
| `/about/`, `/order/`, `/submit-memory/` | Persian site pages, in `src/routes/` and injected by `astro.config.mjs` only when `features.studio` / `features.memories` is on |
| `/robots.txt`, `/sitemap-index.xml` | SEO |

Static routes (`about`, `order`, `submit-memory`, `en`, `g`) win over `[slug]`, so a memorial must not use those slugs.

## Feature toggles

A section exists only if `settings.features.<x>` AND the memorial's `enabledSections.<x>` are on AND it has content (memories stay on while enabled). Nav, footer, home links and routes all read `loadMemorial().has`.

## Multi-memorial support

`getStaticPaths()` enumerates `src/content/memorials/*`, so every folder becomes a full set of routes. The memorial with `"featured": true` is shown at `/`. Sections are switched with `enabledSections`; navigation and the home page link only to sections that have content, while enabled-but-empty section pages show an explicit empty state.

## Publishing rules in code

- Memories: `isPublicMemory()` in `src/lib/memorial.ts` keeps only `approved` + `granted`. Pending/rejected entries never reach the HTML (verified by a temporary fixture test).
- Canonical, `hreflang` and Open Graph URLs are emitted only when a real production URL is configured (not the `username.github.io` placeholder).
- Embeds: only YouTube (`youtube-nocookie.com`) and Aparat URLs are converted to iframes (`src/lib/video.ts`); everything else falls back to a link.

## Build-time configuration

`astro.config.mjs` reads `SITE_URL` and `BASE_PATH` (env) → `productionUrl` in `settings.json` → placeholder. The deploy workflow sets both from the repository name.
