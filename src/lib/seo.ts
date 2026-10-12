/** Structured data (schema.org JSON-LD) built from the content, never invented. */
export interface LdSpec {
  /** Real (non-sample) person described on this page. */
  person?: { name: string; birthDate: string; deathDate?: string; birthPlace?: string; deathPlace?: string; description: string; path: string };
  /** A single memory page. */
  article?: { headline: string; author: string; datePublished?: string; about: string; path: string };
  /** Breadcrumb trail, home first. Paths are without base. */
  breadcrumb?: { name: string; path: string }[];
  /** Short question/answer pairs also shown on the page. */
  faq?: { q: string; a: string }[];
  /** Language of the page content. */
  lang: 'fa' | 'en';
}

type Abs = (path: string) => string;

export function buildLd(spec: LdSpec, abs: Abs, pagePath: string, title: string): object[] {
  const out: object[] = [];
  out.push({ '@context': 'https://schema.org', '@type': 'WebPage', name: title, url: abs(pagePath), inLanguage: spec.lang });
  if (spec.person) {
    const p = spec.person;
    out.push({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: p.name,
      description: p.description,
      birthDate: p.birthDate,
      ...(p.deathDate ? { deathDate: p.deathDate } : {}),
      ...(p.birthPlace ? { birthPlace: { '@type': 'Place', name: p.birthPlace } } : {}),
      ...(p.deathPlace ? { deathPlace: { '@type': 'Place', name: p.deathPlace } } : {}),
      url: abs(p.path),
    });
  }
  if (spec.article) {
    const a = spec.article;
    out.push({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: a.headline.slice(0, 110),
      author: { '@type': 'Person', name: a.author },
      ...(a.datePublished ? { datePublished: a.datePublished } : {}),
      about: { '@type': 'Thing', name: a.about },
      inLanguage: spec.lang,
      mainEntityOfPage: abs(a.path),
    });
  }
  if (spec.breadcrumb && spec.breadcrumb.length > 1) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: spec.breadcrumb.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: abs(b.path) })),
    });
  }
  if (spec.faq && spec.faq.length > 0) {
    out.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: spec.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return out;
}
