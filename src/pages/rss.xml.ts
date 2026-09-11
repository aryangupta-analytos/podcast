import type { APIRoute } from 'astro';

import { CACHE_FEED } from '../lib/cache';
import { formatDurationClock } from '../lib/format';
import { getAllLiveEpisodesForFeed } from '../server/repo/episodes';
import { getLinks, getSettings } from '../server/repo/settings';

/** XML-escapes text. CDATA is used for prose; this is for attributes and URLs. */
const escape = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const cdata = (value: string) =>
  `<![CDATA[${value.replace(/\]\]>/g, ']]]]><![CDATA[>')}]]>`;

const absolute = (url: string | null | undefined, site: URL): string | null => {
  if (!url) return null;
  return url.startsWith('http') ? url : new URL(url, site).toString();
};

/**
 * A real podcast RSS 2.0 feed with the iTunes extensions, generated from the
 * database. Submitting this URL to Apple, Spotify and the rest is what makes
 * a new episode appear in listeners' apps — so it is part of publishing, not a
 * nicety.
 */
export const GET: APIRoute = async ({ site }) => {
  const base = site ?? new URL('http://localhost:4321');
  const [settings, episodes, platforms] = await Promise.all([
    getSettings(),
    getAllLiveEpisodesForFeed(),
    getLinks('platform')
  ]);

  const artwork = absolute(settings.artworkUrl, base);
  const ownerEmail = settings.contactEmail ?? '';
  const appleLink = platforms.find((link) => link.platform === 'apple')?.url;

  const items = episodes
    .filter((episode) => episode.audioUrl)
    .map((episode) => {
      const url = new URL(`/episodes/${episode.slug}`, base).toString();
      const image = absolute(episode.thumbnailUrl, base);

      return `    <item>
      <title>${cdata(episode.title)}</title>
      <link>${escape(url)}</link>
      <guid isPermaLink="false">${escape(episode.id)}</guid>
      <pubDate>${episode.publishDate.toUTCString()}</pubDate>
      <description>${cdata(episode.description)}</description>
      <content:encoded>${cdata(episode.showNotes || episode.description)}</content:encoded>
      <enclosure url="${escape(absolute(episode.audioUrl, base)!)}" type="${escape(episode.audioMimeType)}"${
        episode.audioBytes ? ` length="${episode.audioBytes}"` : ''
      } />
      <itunes:summary>${cdata(episode.description)}</itunes:summary>
      <itunes:explicit>false</itunes:explicit>${
        episode.durationSeconds
          ? `\n      <itunes:duration>${formatDurationClock(episode.durationSeconds)}</itunes:duration>`
          : ''
      }${episode.episodeNumber ? `\n      <itunes:episode>${episode.episodeNumber}</itunes:episode>` : ''}${
        episode.season ? `\n      <itunes:season>${episode.season}</itunes:season>` : ''
      }${image ? `\n      <itunes:image href="${escape(image)}" />` : ''}
      <itunes:episodeType>full</itunes:episodeType>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/"
     xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata(settings.showTitle)}</title>
    <link>${escape(base.origin)}</link>
    <atom:link href="${escape(new URL('/rss.xml', base).toString())}" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    <description>${cdata(settings.description)}</description>
    <copyright>© ${new Date().getFullYear()} ${escape(settings.showTitle)}</copyright>
    <itunes:author>${escape(settings.showTitle)}</itunes:author>
    <itunes:summary>${cdata(settings.description)}</itunes:summary>
    <itunes:subtitle>${cdata(settings.tagline)}</itunes:subtitle>
    <itunes:type>episodic</itunes:type>
    <itunes:explicit>false</itunes:explicit>
    <itunes:owner>
      <itunes:name>${escape(settings.showTitle)}</itunes:name>${
        ownerEmail ? `\n      <itunes:email>${escape(ownerEmail)}</itunes:email>` : ''
      }
    </itunes:owner>${artwork ? `\n    <itunes:image href="${escape(artwork)}" />` : ''}
    <itunes:category text="Technology" />
    <itunes:category text="Business">
      <itunes:category text="Entrepreneurship" />
    </itunes:category>${appleLink ? `\n    <itunes:new-feed-url>${escape(new URL('/rss.xml', base).toString())}</itunes:new-feed-url>` : ''}
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': CACHE_FEED
    }
  });
};
