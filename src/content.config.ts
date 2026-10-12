import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { Loader } from 'astro/loaders';
import { z } from 'astro/zod';
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

/* ------------------------------------------------------------------ */
/* Shared field types                                                  */
/* ------------------------------------------------------------------ */

/** Text with a Persian original and an optional English version. */
const localized = z.object({ fa: z.string().min(1), en: z.string().optional() });

/** "YYYY", "YYYY-MM" or "YYYY-MM-DD" (Gregorian). */
const dateString = z.string().regex(/^\d{4}(-\d{2}(-\d{2})?)?$/, 'Use YYYY, YYYY-MM or YYYY-MM-DD');

/** How certain a date is. Shown differently in the UI. */
const precision = z.enum(['exact', 'month', 'year', 'approximate', 'uncertain']);

/** Editorial verification state of a claim, image or video. Kept in the data for the creator; not shown to readers. */
const verification = z.enum(['verified', 'single-source', 'needs-verification']);

const license = z.enum([
  'public-domain',
  'cc0',
  'cc-by',
  'cc-by-sa',
  'permission-granted',
  'all-rights-reserved',
  'unknown',
]);

const sourceIds = z.array(z.string()).default([]);

/* ------------------------------------------------------------------ */
/* Loader for "one JSON array per memorial" files                      */
/* ------------------------------------------------------------------ */

/**
 * Reads src/content/memorials/<slug>/<file> (a JSON array) for every
 * memorial and stores each item as `<slug>/<item.id>` with a `memorial`
 * field added. Keeps content files compact and easy to edit by hand.
 */
function memorialListLoader(file: string): Loader {
  const root = path.resolve('src/content/memorials');
  return {
    name: `memorial-list:${file}`,
    load: async ({ store, parseData, generateDigest, logger, watcher }) => {
      store.clear();
      const slugs = (await readdir(root, { withFileTypes: true }))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const slug of slugs) {
        const filePath = path.join(root, slug, file);
        if (!existsSync(filePath)) continue;
        watcher?.add(filePath);
        const items = JSON.parse(await readFile(filePath, 'utf8'));
        if (!Array.isArray(items)) {
          logger.error(`${slug}/${file} must contain a JSON array`);
          continue;
        }
        for (const item of items) {
          const id = `${slug}/${item.id}`;
          const data = await parseData({ id, data: { ...item, memorial: slug } });
          store.set({ id, data, digest: generateDigest(item) });
        }
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

const sections = z.object({
  biography: z.boolean().default(true),
  timeline: z.boolean().default(true),
  gallery: z.boolean().default(true),
  videos: z.boolean().default(true),
  memories: z.boolean().default(true),
  keepsakes: z.boolean().default(true),
  sources: z.boolean().default(true),
});

const memorials = defineCollection({
  // One memorial.json per memorial; the folder name is the slug / entry id.
  loader: glob({
    pattern: '*/memorial.json',
    base: './src/content/memorials',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    name: localized,
    nameLatin: z.string(),
    tagline: localized,
    summary: localized,
    birth: z.object({ date: dateString, precision: precision.default('exact'), place: localized.optional() }),
    death: z
      .object({ date: dateString, precision: precision.default('exact'), place: localized.optional() })
      .optional(),
    /** Source ids supporting the birth/death years shown in the hero. */
    sourceIds,
    /** Gallery item id used as hero / social preview image. */
    heroImageId: z.string().optional(),
    /** The memorial with featured:true is the home page. */
    featured: z.boolean().default(false),
    /** A fictional demo memorial: a "sample" notice is shown on its pages. */
    sample: z.boolean().default(false),
    /** Calendar used for full dates on Persian pages. Falls back to settings.defaultCalendar. */
    calendar: z.enum(['gregory', 'persian']).optional(),
    enabledSections: sections.prefault({}),
  }),
});

const story = defineCollection({
  // story/<lang>/<order>-<name>.md  → id "<slug>/story/<lang>/<order>-<name>"
  loader: glob({ pattern: '*/story/*/*.md', base: './src/content/memorials' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    kicker: z.string().optional(),
    dateLabel: z.string().optional(),
    sourceIds,
    imageId: z.string().optional(),
    /** Several photos for this chapter: shown as a collage that appears while scrolling. */
    imageIds: z.array(z.string()).default([]),
  }),
});

const biography = defineCollection({
  loader: glob({
    pattern: '*/biography.md',
    base: './src/content/memorials',
    generateId: ({ entry }) => entry.split('/')[0],
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    sourceIds,
  }),
});

const timeline = defineCollection({
  loader: memorialListLoader('timeline.json'),
  schema: z.object({
    id: z.string(),
    memorial: z.string(),
    date: dateString,
    precision: precision.default('exact'),
    title: localized,
    description: localized,
    /** Show on the home page "milestones" strip. */
    milestone: z.boolean().default(false),
    imageId: z.string().optional(),
    /** Optional link to a story chapter (file name without extension). */
    storyId: z.string().optional(),
    sourceIds,
    status: verification.default('needs-verification'),
  }),
});

const gallery = defineCollection({
  loader: memorialListLoader('gallery.json'),
  schema: z.object({
    id: z.string(),
    memorial: z.string(),
    /** Local path under public/ (e.g. /images/ali-khamenei/x.jpg) or https URL. */
    src: z.string(),
    width: z.number().optional(),
    height: z.number().optional(),
    title: localized,
    caption: localized,
    alt: localized,
    date: dateString.optional(),
    datePrecision: precision.optional(),
    creator: z.string().optional(),
    sourceUrl: z.url().optional(),
    license,
    licenseUrl: z.url().optional(),
    featured: z.boolean().default(false),
    status: verification.default('needs-verification'),
  }),
});

const videos = defineCollection({
  loader: memorialListLoader('videos.json'),
  schema: z.object({
    id: z.string(),
    memorial: z.string(),
    title: localized,
    description: localized,
    provider: z.enum(['youtube', 'aparat']),
    url: z.url(),
    sourceUrl: z.url().optional(),
    featured: z.boolean().default(false),
    status: verification.default('needs-verification'),
  }),
});

const memories = defineCollection({
  loader: memorialListLoader('memories.json'),
  schema: z.object({
    id: z.string(),
    memorial: z.string(),
    /** Public display name only — never emails, phones or addresses. */
    displayName: z.string(),
    relationship: z.string().optional(),
    title: z.string().optional(),
    text: z.string(),
    date: dateString.optional(),
    /** Short topic labels used by the feed's search and filter chips. */
    topics: z.array(z.string()).default([]),
    /** Profile picture: gallery item id. */
    portraitId: z.string().optional(),
    /** Photos attached to the memory: gallery item ids (so license metadata is kept). */
    imageIds: z.array(z.string()).default([]),
    /** Video attached to the memory: id from videos.json. */
    videoId: z.string().optional(),
    reviewStatus: z.enum(['pending', 'approved', 'rejected']).default('pending'),
    /** Written permission to publish. Only "granted" memories are public. */
    publicationPermission: z.enum(['granted', 'not-granted', 'unknown']).default('unknown'),
    featured: z.boolean().default(false),
  }),
});

/** Personal items of the person: letters, handwriting, favourite audio/music, objects. */
const keepsakes = defineCollection({
  loader: memorialListLoader('keepsakes.json'),
  schema: z.object({
    id: z.string(),
    memorial: z.string(),
    kind: z.enum(['audio', 'music', 'letter', 'handwriting', 'object']),
    title: localized,
    description: localized.optional(),
    date: dateString.optional(),
    /** Local audio file under public/ (keep it small and compressed). */
    audioSrc: z.string().optional(),
    /** Scans or photos: gallery item ids. */
    imageIds: z.array(z.string()).default([]),
    /** Transcription / typeset text of a letter or note (paragraphs separated by a blank line). */
    text: z.string().optional(),
  }),
});

const sources = defineCollection({
  loader: memorialListLoader('sources.json'),
  schema: z.object({
    id: z.string(),
    memorial: z.string(),
    title: z.string(),
    publisher: z.string(),
    url: z.url(),
    publishedAt: dateString.optional(),
    accessedAt: dateString.optional(),
    type: z.enum(['primary', 'secondary', 'personal-recollection', 'unverified']),
    relevance: z.string(),
    status: z.enum(['verified', 'partially-verified', 'link-only', 'unverified']),
    note: z.string().optional(),
  }),
});

export const collections = { memorials, story, biography, timeline, gallery, videos, memories, keepsakes, sources };
