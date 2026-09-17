/**
 * YouTube URL helpers. Pure and client-safe — used by Astro components on the
 * server and by the LiteYouTube island in the browser.
 */

const ID = /^[A-Za-z0-9_-]{11}$/;

/** The 11-character video id from any of the URL shapes YouTube hands out. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\.|^m\./, '');
  if (host !== 'youtube.com' && host !== 'youtu.be' && host !== 'youtube-nocookie.com') {
    return null;
  }

  let candidate: string | null = null;

  if (host === 'youtu.be') {
    candidate = parsed.pathname.split('/')[1] ?? null;
  } else {
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch') {
      candidate = parsed.searchParams.get('v');
    } else if (['embed', 'shorts', 'live', 'v'].includes(parts[0] ?? '')) {
      candidate = parts[1] ?? null;
    }
  }

  return candidate && ID.test(candidate) ? candidate : null;
}

/**
 * `hqdefault` exists for every video; `maxresdefault` 404s on older uploads,
 * which would leave a broken tile.
 */
export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
}
