import type { APIRoute } from 'astro';

import { getLatestEpisodes, searchEpisodes } from '../../server/repo/episodes';

const MAX_RESULTS = 8;

/**
 * Search backing the ⌘K dialog. Returns only the fields the dialog renders —
 * show notes and audio URLs would multiply the payload for no benefit.
 */
export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get('q')?.slice(0, 120) ?? '';
  const wantsLatest = url.searchParams.get('latest') === '1';

  const episodes = wantsLatest
    ? await getLatestEpisodes(MAX_RESULTS)
    : await searchEpisodes(query, MAX_RESULTS);

  const results = episodes.map((episode) => ({
    id: episode.id,
    title: episode.title,
    description: episode.description,
    episodeNumber: episode.episodeNumber,
    episodeSlug: episode.episodeSlug
  }));

  return new Response(JSON.stringify({ episodes: results }), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      // Per-query and cheap; let the CDN hold identical queries briefly.
      'Cache-Control': 'public, max-age=0, s-maxage=60'
    }
  });
};
