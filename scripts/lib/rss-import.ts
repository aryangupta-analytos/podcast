/**
 * Minimal RSS reader for the one-time Podbean import.
 *
 * A dependency would do this too, but the feed is a known shape and this keeps
 * a migration-only concern out of the application's dependency tree.
 */

export interface FeedEpisode {
  guid: string;
  title: string;
  description: string;
  showNotes: string;
  publishDate: Date;
  durationSeconds: number | null;
  episodeNumber: number | null;
  season: number | null;
  audioUrl: string | null;
  audioMimeType: string;
  audioBytes: number | null;
  imageUrl: string | null;
  link: string | null;
}

export interface FeedChannel {
  title: string;
  description: string;
  imageUrl: string | null;
  link: string | null;
  episodes: FeedEpisode[];
}

const stripCdata = (value: string) =>
  value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();

function decodeEntities(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function tag(xml: string, name: string): string {
  const match = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`).exec(
    xml
  );
  return match ? stripCdata(match[1]) : '';
}

function attr(xml: string, tagName: string, attribute: string): string | null {
  const match = new RegExp(
    `<${tagName}[^>]*\\s${attribute}="([^"]*)"`,
    'i'
  ).exec(xml);
  return match ? decodeEntities(match[1]) : null;
}

/** `"41:00"` / `"2460"` / `"01:02:05"` → seconds. */
function parseDuration(raw: string): number | null {
  if (!raw) return null;
  if (/^\d+$/.test(raw)) return Number(raw);

  const parts = raw.split(':').map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return null;

  return parts.reduce((total, part) => total * 60 + part, 0);
}

/** HTML show notes → a plain-text summary for lists and meta descriptions. */
export function toPlainText(html: string, limit = 280): string {
  const text = decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, ' ')
      .replace(/<\/p>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (text.length <= limit) return text;

  // Cut at a word boundary so the summary does not end mid-word.
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : limit).trimEnd()}…`;
}

export async function fetchFeed(url: string): Promise<FeedChannel> {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'svtechpodcast-migration/1.0' }
  });

  if (!response.ok) {
    throw new Error(`Feed request failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const [channelHead, ...itemChunks] = xml.split('<item>');
  const items = itemChunks.map((chunk) => chunk.split('</item>')[0]);

  const episodes: FeedEpisode[] = items.map((item) => {
    const description = tag(item, 'description');
    const contentEncoded = tag(item, 'content:encoded');
    const showNotes = contentEncoded || description;

    const episodeNumber = Number.parseInt(tag(item, 'itunes:episode'), 10);
    const season = Number.parseInt(tag(item, 'itunes:season'), 10);
    const bytes = Number.parseInt(attr(item, 'enclosure', 'length') ?? '', 10);
    const pubDate = new Date(tag(item, 'pubDate'));

    return {
      guid: tag(item, 'guid') || tag(item, 'link'),
      title: decodeEntities(tag(item, 'title')),
      description: toPlainText(description),
      showNotes,
      publishDate: Number.isNaN(pubDate.getTime()) ? new Date() : pubDate,
      durationSeconds: parseDuration(tag(item, 'itunes:duration')),
      episodeNumber: Number.isFinite(episodeNumber) ? episodeNumber : null,
      season: Number.isFinite(season) ? season : null,
      audioUrl: attr(item, 'enclosure', 'url'),
      audioMimeType: attr(item, 'enclosure', 'type') ?? 'audio/mpeg',
      audioBytes: Number.isFinite(bytes) ? bytes : null,
      imageUrl: attr(item, 'itunes:image', 'href'),
      link: tag(item, 'link') || null
    };
  });

  return {
    title: decodeEntities(tag(channelHead, 'title')),
    description: toPlainText(tag(channelHead, 'description'), 1000),
    imageUrl: attr(channelHead, 'itunes:image', 'href'),
    link: tag(channelHead, 'link') || null,
    episodes
  };
}
