/**
 * Build an internal URL that respects the configured base path
 * (needed for GitHub Pages project sites served from /<repo>/).
 *
 *   href('/')                  -> '/' or '/memorial/'
 *   href('ali-khamenei/timeline') -> '/ali-khamenei/timeline/'
 */
export function href(path = ''): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  return clean ? `${base}/${clean}/` : `${base}/`;
}

/** Prefix a path under public/ (images, media) with the base path. */
export function asset(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}/${path.replace(/^\/+/, '')}`;
}
