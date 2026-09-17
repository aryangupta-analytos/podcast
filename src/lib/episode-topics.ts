/**
 * The "In this interview we talked about" list from an episode's show notes,
 * as plain strings — shown as the topics card beside the notes.
 *
 * Input is HTML that `sanitizeHtml()` already cleaned on write; only the text
 * of the first list is read, so nothing here can reach the page as markup.
 */
const ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#39;': "'",
  '&lt;': '<',
  '&gt;': '>'
};

export function topicsFrom(html: string | null | undefined, max = 10): string[] {
  if (!html) return [];
  const list = html.match(/<(ul|ol)\b[^>]*>([\s\S]*?)<\/\1>/i);
  if (!list) return [];

  const items = list[2].match(/<li\b[^>]*>[\s\S]*?<\/li>/gi) ?? [];
  return items
    .map((item) =>
      item
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, (entity) => ENTITIES[entity])
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(Boolean)
    .slice(0, max);
}
