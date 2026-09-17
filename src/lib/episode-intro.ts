/**
 * The opening of an episode's show notes — the part that introduces the guest.
 *
 * Guests rarely have a bio of their own, but the show notes of their episode
 * open with one: the paragraphs before the "In this interview we talked
 * about…" list. A profile with no bio shows those paragraphs, credited to the
 * episode. It is the show's own published copy; nothing is invented.
 *
 * Input is HTML that `sanitizeHtml()` already cleaned on write; this only
 * selects whole paragraphs from it.
 */
const STOP =
  /in this (interview|episode)|we talked about|help us reach|learn more about|follow silicon|about hosts/i;

export function introFrom(html: string | null | undefined, maxParagraphs = 3): string {
  if (!html) return '';
  const paragraphs = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? [];
  const intro: string[] = [];

  for (const paragraph of paragraphs) {
    const text = paragraph
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim();
    if (!text) continue;
    if (STOP.test(text)) break;
    intro.push(paragraph);
    if (intro.length >= maxParagraphs) break;
  }

  return intro.join('\n');
}
