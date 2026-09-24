/**
 * Multi-part interviews shown as one card in the archive.
 *
 * The repository groups episodes that share the same guests; these helpers
 * decide how such a group reads: each episode's short label ("Part 1",
 * "Teaser"), the group's summary ("2-part interview"), and which episode the
 * card's Listen button should start.
 */

/** "Part 2 - Interview of…" → "Part 2"; "Teaser - …" → "Teaser". */
export function partLabel(title: string, episodeNumber?: string): string {
  const part = /\bpart\s*(\d+)/i.exec(title);
  if (part) return `Part ${part[1]}`;
  if (/\bteaser\b/i.test(title)) return 'Teaser';
  if (/\btrailer\b/i.test(title)) return 'Trailer';
  return episodeNumber ? `Episode ${episodeNumber}` : 'Episode';
}

const isExtra = (label: string) => label === 'Teaser' || label === 'Trailer';

/**
 * "2-part interview", "2-part interview + teaser", or "3 episodes" when the
 * titles carry no part numbers. `titles` in playing order.
 */
export function groupSummary(titles: string[]): string {
  const labels = titles.map((t) => partLabel(t));
  const parts = labels.filter((l) => l.startsWith('Part ')).length;
  const extras = labels.filter(isExtra);
  if (parts >= 2) {
    const extra = extras.length ? ` + ${extras[0].toLowerCase()}` : '';
    return `${parts}-part interview${extra}`;
  }
  return `${titles.length} episodes`;
}

/**
 * Index of the episode a group's Listen button starts: Part 1 when there is
 * one, else the first episode that is not a teaser, else the first.
 */
export function leadIndex(titles: string[]): number {
  const labels = titles.map((t) => partLabel(t));
  const part1 = labels.indexOf('Part 1');
  if (part1 >= 0) return part1;
  const main = labels.findIndex((l) => !isExtra(l));
  return main >= 0 ? main : 0;
}

/** URL form of a tag: "Film & Media" → "film-and-media". Empty for no letters. */
export function tagSlug(tag: string): string {
  return tag
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Tags typed by the owner: comma-separated, trimmed, de-duplicated by slug
 * (first spelling wins), at most `max` of them, each at most 40 characters.
 */
export function parseTags(raw: string, max = 6): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const piece of raw.split(',')) {
    const tag = piece.replace(/\s+/g, ' ').trim().slice(0, 40);
    const key = tagSlug(tag);
    if (!tag || !key || seen.has(key)) continue;
    seen.add(key);
    out.push(tag);
    if (out.length >= max) break;
  }
  return out;
}
