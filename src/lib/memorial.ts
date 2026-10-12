import { getCollection, getEntry } from 'astro:content';
import type { CollectionEntry } from 'astro:content';
import type { Lang } from './i18n';
import { features, settings } from './site';
import type { Calendar } from './format';

export type SectionKey = 'biography' | 'timeline' | 'gallery' | 'videos' | 'memories' | 'keepsakes' | 'sources';

export type MemorialData = Awaited<ReturnType<typeof loadMemorial>>;

/** Every memorial that exists in src/content/memorials. */
export async function getMemorials() {
  return getCollection('memorials');
}

/** The memorial shown on the home page: the one marked featured, else the first. */
export async function getFeaturedMemorial() {
  const all = await getMemorials();
  return all.find((m) => m.data.featured) ?? all[0];
}

/** Dates sort correctly as strings because they are ISO-like prefixes. */
const byDate = <T extends { data: { date: string } }>(a: T, b: T) => a.data.date.localeCompare(b.data.date);

/** A memory is public only if it is approved AND publication was permitted. */
export function isPublicMemory(m: CollectionEntry<'memories'>): boolean {
  return m.data.reviewStatus === 'approved' && m.data.publicationPermission === 'granted';
}

/** Load everything the templates need for one memorial. */
export async function loadMemorial(slug: string) {
  const memorial = await getEntry('memorials', slug);
  if (!memorial) throw new Error(`Unknown memorial: ${slug}`);

  const [story, biography, timeline, gallery, videos, memories, keepsakes, sources] = await Promise.all([
    getCollection('story', (e) => e.id.startsWith(`${slug}/story/`)),
    getEntry('biography', slug),
    getCollection('timeline', (e) => e.data.memorial === slug),
    getCollection('gallery', (e) => e.data.memorial === slug),
    getCollection('videos', (e) => e.data.memorial === slug),
    getCollection('memories', (e) => e.data.memorial === slug),
    getCollection('keepsakes', (e) => e.data.memorial === slug),
    getCollection('sources', (e) => e.data.memorial === slug),
  ]);

  const chapters = (lang: Lang) =>
    story.filter((e) => e.id.split('/')[2] === lang).sort((a, b) => a.data.order - b.data.order);

  const enabled = memorial.data.enabledSections;
  /** A section is on when the site-wide switch AND the memorial's own switch are on. */
  const on = (k: SectionKey) => features[k] && enabled[k];
  const publicMemories = memories.filter(isPublicMemory);
  const calendar: Calendar = memorial.data.calendar ?? settings.defaultCalendar;

  return {
    memorial,
    slug,
    calendar,
    chapters,
    biography,
    timeline: timeline.sort(byDate),
    gallery,
    videos,
    memories: publicMemories,
    keepsakes: keepsakes.sort((a, b) => (a.data.date ?? '9999').localeCompare(b.data.date ?? '9999')),
    sources,
    galleryById: new Map(gallery.map((g) => [g.data.id, g])),
    videoById: new Map(videos.map((v) => [v.data.id, v])),
    sourceById: new Map(sources.map((s) => [s.data.id, s])),
    /**
     * Which sections exist. A section page is generated, linked and shown only when it is
     * switched on AND has content, so nothing empty is ever published.
     * Exception: the memories feed stays (with an invitation) while it is switched on.
     */
    has: {
      biography: on('biography') && Boolean(biography),
      timeline: on('timeline') && timeline.length > 0,
      gallery: on('gallery') && gallery.length > 0,
      videos: on('videos') && videos.length > 0,
      memories: on('memories'),
      keepsakes: on('keepsakes') && keepsakes.length > 0,
      sources: on('sources') && sources.length > 0,
    } satisfies Record<SectionKey, boolean>,
  };
}

/** Static paths helper: one entry per memorial slug. */
export async function memorialPaths() {
  return (await getMemorials()).map((m) => ({ params: { slug: m.id } }));
}

/** Static paths helper: only memorials where the section is on and has content. */
export async function memorialPathsWith(section: SectionKey) {
  const out = [];
  for (const m of await getMemorials()) {
    if ((await loadMemorial(m.id)).has[section]) out.push({ params: { slug: m.id } });
  }
  return out;
}

/** Sorted unique topics used by the public memories (for the feed's filter chips). */
export function memoryTopics(memories: CollectionEntry<'memories'>[]): string[] {
  return [...new Set(memories.flatMap((m) => m.data.topics))].sort((a, b) => a.localeCompare(b, 'fa'));
}
