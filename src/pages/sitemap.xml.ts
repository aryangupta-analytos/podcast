import type { APIRoute } from 'astro';

import { CACHE_FEED } from '../lib/cache';
import { getAllLiveEpisodesForFeed } from '../server/repo/episodes';
import { listPeople } from '../server/repo/people';

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Built from the database rather than from the file tree, because episode and
 * people URLs only exist as rows. `/admin` is absent by construction — there is
 * no code path here that could emit it.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');

  const [episodes, people] = await Promise.all([
    getAllLiveEpisodesForFeed(),
    listPeople()
  ]);

  const urls: Array<{ loc: string; lastmod?: Date; priority: string }> = [
    { loc: '/', priority: '1.0' },
    { loc: '/episodes', priority: '0.9' },
    { loc: '/people', priority: '0.6' },
    { loc: '/about', priority: '0.7' },
    { loc: '/contact', priority: '0.5' },
    ...episodes.map((episode) => ({
      loc: `/episodes/${episode.slug}`,
      lastmod: episode.updatedAt,
      priority: '0.8'
    })),
    ...people.map((person) => ({
      loc: `/people/${person.slug}`,
      lastmod: person.updatedAt,
      priority: '0.4'
    }))
  ];

  const body = urls
    .map(
      ({ loc, lastmod, priority }) => `  <url>
    <loc>${escape(new URL(loc, base).toString())}</loc>${
      lastmod ? `\n    <lastmod>${lastmod.toISOString()}</lastmod>` : ''
    }
    <priority>${priority}</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': CACHE_FEED
    }
  });
};
