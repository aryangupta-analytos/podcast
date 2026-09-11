import type { APIRoute } from 'astro';

import { CACHE_FEED } from '../lib/cache';

/**
 * The admin panel is disallowed here as well as being noindex'd in middleware
 * and excluded from the sitemap. Hiding the URL is never the security control —
 * authentication is — but there is no reason for it to be crawled either.
 */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap.xml', site).href;

  const body = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

Sitemap: ${sitemap}
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': CACHE_FEED
    }
  });
};
