/**
 * Cache-Control headers for public pages.
 *
 * Pages are server-rendered from Postgres so a publish is live immediately,
 * but almost every visitor should be served by the CDN rather than the origin.
 * `stale-while-revalidate` gives that: the CDN answers instantly from cache
 * and refreshes in the background, so a content change appears within seconds
 * without any visitor ever waiting on a database query.
 */
export const CACHE_PUBLIC_PAGE =
  'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

/** Feeds and sitemaps change rarely and tolerate being a few minutes stale. */
export const CACHE_FEED =
  'public, max-age=0, s-maxage=600, stale-while-revalidate=3600';

/** Uploaded media is content-addressed and never changes under its key. */
export const CACHE_IMMUTABLE = 'public, max-age=31536000, immutable';

/** Anything user-specific must never touch a shared cache. */
export const CACHE_PRIVATE = 'private, no-store, max-age=0';
