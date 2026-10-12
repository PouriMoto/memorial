import { loadMemorial, getFeaturedMemorial } from './memorial';
import type { SectionKey } from './memorial';
import { features } from './site';
import { href } from './url';
import { t, type Lang } from './i18n';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  /** True when the target page exists only in Persian but the current page is English. */
  fa: boolean;
}

/** Order of sections in menus and footer. */
const ORDER: SectionKey[] = ['biography', 'timeline', 'gallery', 'videos', 'keepsakes', 'memories', 'sources'];
/** The few destinations that always get a place on the phone's bottom bar (when they exist). */
const PRIMARY_PRIORITY = ['home', 'memories', 'timeline', 'keepsakes', 'biography', 'gallery', 'videos', 'sources', 'about', 'order'];

/**
 * Navigation items for header and footer, derived from what is actually
 * switched on and has content, so a switched-off or empty section never appears.
 */
export async function getNav(slug: string | undefined, lang: Lang) {
  const memorialSlug = slug ?? (await getFeaturedMemorial())?.id;
  const data = memorialSlug ? await loadMemorial(memorialSlug) : undefined;
  const faOnly = lang === 'en';

  const sections: NavItem[] = data
    ? ORDER.filter((k) => data.has[k]).map((k) => ({
        key: k,
        label: t(lang, k),
        href: href(`${memorialSlug}/${k}`),
        fa: faOnly,
      }))
    : [];

  const studio: NavItem[] = features.studio
    ? [
        { key: 'about', label: t(lang, 'about'), href: href('about'), fa: faOnly },
        { key: 'order', label: t(lang, 'order'), href: href('order'), fa: faOnly },
      ]
    : [];

  const submit: NavItem | undefined =
    data && data.has.memories
      ? { key: 'submit', label: t(lang, 'submitMemory'), href: href('submit-memory'), fa: faOnly }
      : undefined;

  const home: NavItem = {
    key: 'home',
    label: t(lang, 'story'),
    href: lang === 'en' ? href('en') : href('/'),
    fa: false,
  };
  const all = [home, ...sections, ...(submit ? [submit] : []), ...studio];
  const rank = (k: string) => {
    const i = PRIMARY_PRIORITY.indexOf(k);
    return i === -1 ? 99 : i;
  };
  const sorted = [...all].sort((a, b) => rank(a.key) - rank(b.key));
  /** Phone bottom bar: up to 4 items; everything else goes under "More". */
  const chosen = new Set(sorted.slice(0, all.length > 5 ? 4 : all.length));
  const primary = all.filter((x) => chosen.has(x));
  const rest = all.filter((x) => !chosen.has(x));

  return { data, slug: memorialSlug, sections, studio, submit, primary, rest };
}
