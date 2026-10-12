# AGENTS.md — rules for AI agents and contributors

Read this before changing the project. Goals and scope are in `PROJECT.md`; architecture in `docs/architecture.md`.

## Architecture constraints

- Astro (v7) + TypeScript, static output only. **No** backend, database, auth, admin dashboard, custom CMS, payment, or AI-generated biographies.
- No UI frameworks (React/Vue/Svelte/Tailwind) and no animation libraries. Client JS is limited to small progressive enhancements (menu, reading progress, reveal, gallery viewer). Content must be readable without JavaScript.
- Content lives in `src/content/memorials/<slug>/` (Markdown + JSON), never in components. Adding a memorial must not require code changes.
- Site is **Persian-first (fa, RTL)**. English exists **only** for the scrollytelling page (`/en/`, `/en/<slug>/`). Do not add English versions of other pages unless the owner asks.
- All internal URLs go through `href()` / `asset()` in `src/lib/url.ts` so the GitHub Pages base path works. Never hardcode `/path`.
- Use CSS logical properties (`margin-inline`, `inset-inline-start`, …) so RTL and LTR share the same CSS. Design tokens are in `src/styles/global.css`.

## Code conventions

- Collections and schemas: `src/content.config.ts`. Per-memorial lists (`timeline`, `gallery`, `videos`, `memories`, `sources`) are JSON arrays loaded by `memorialListLoader`.
- Shared data access: `src/lib/memorial.ts` (`loadMemorial`). Pages call it; they do not read collections directly.
- Persian UI strings for the scrollytelling page live in `src/lib/i18n.ts`. Other Persian pages may hold literal strings.
- Keep components small and scoped-styled. Avoid new dependencies; justify any addition in `CHANGELOG.md`.
- Latin names/URLs inside Persian text use `<bdi>` or `.url` so bidi does not break layout.

## Content rules (non-negotiable)

1. **Never invent** dates, quotes, events, family details, image origins, video URLs, citations, or licenses. If unverified, omit it or mark `status: needs-verification`.
2. Sources are kept in the data (`sourceIds`) but shown only on the togglable sources page, never under sections. Every real-person claim should reference `sourceIds`; fictional `sample` memorials need none. `status: verified` requires at least one source and a retrieved copy actually read.
3. Respect copyright: no large verbatim excerpts; paraphrase and attribute. Do not download or hotlink images without a recorded license and attribution.
4. Disputed claims keep attribution ("according to …"). The tone is respectful and commemorative; do not state contested assertions as fact and do not suppress sourced facts.
5. Memories are published only when `reviewStatus: "approved"` **and** `publicationPermission: "granted"`. Never store emails, phone numbers or addresses in the repository.
6. Do not claim a check passed unless it was run. Record real results in `ROADMAP.md` / `CHANGELOG.md`.

## Maintenance workflow

```bash
npm install
npm run dev          # local development
npm test             # validate → astro check → build → link check
```

Before finishing any change: run `npm test`, and update `ROADMAP.md` (status) and `CHANGELOG.md`.
