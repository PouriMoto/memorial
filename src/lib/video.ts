/**
 * Turn a configured video page URL into a safe embed URL.
 * Only YouTube and Aparat are supported; anything else returns null so the
 * UI falls back to a plain link. No arbitrary third-party HTML is embedded.
 *
 * NOTE: the Aparat embed pattern is the commonly documented one, but has not
 * been verified against a real video in this project (no verified video URL
 * is configured yet). Test with a real URL before publishing.
 */
export function embedUrl(provider: 'youtube' | 'aparat', url: string): string | null {
  try {
    const u = new URL(url);
    if (provider === 'youtube') {
      const hosts = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'];
      if (!hosts.includes(u.hostname)) return null;
      const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.searchParams.get('v') ?? u.pathname.split('/').pop();
      return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (provider === 'aparat') {
      if (!['aparat.com', 'www.aparat.com'].includes(u.hostname)) return null;
      const match = u.pathname.match(/^\/v\/([\w-]+)/);
      return match ? `https://www.aparat.com/video/video/embed/videohash/${match[1]}/vt/frame` : null;
    }
  } catch {
    return null;
  }
  return null;
}
