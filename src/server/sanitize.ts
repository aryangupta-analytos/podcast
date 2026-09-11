/**
 * HTML sanitizer for owner-authored rich text (show notes, About copy).
 *
 * This content is written by an authenticated owner, not by the public, so the
 * threat is narrower than general user-generated content: mostly a script tag
 * or a tracking pixel riding along in text pasted from a Word document or an
 * old web page. An allowlist handles that — anything not explicitly permitted
 * is dropped rather than escaped, because the goal is clean markup, not a
 * faithful rendering of whatever was pasted.
 *
 * Deliberately dependency-free and allowlist-based: a blocklist of "dangerous"
 * tags is the pattern that keeps being bypassed.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'br',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'a',
  'ul',
  'ol',
  'li',
  'blockquote',
  'h2',
  'h3',
  'h4',
  'code',
  'pre',
  'hr',
  'img',
  'figure',
  'figcaption',
  'span',
  'div'
]);

/** Attributes permitted per tag. Everything else — including every `on*` — goes. */
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading'])
};

/** Tags whose entire contents are removed, not just the tag itself. */
const STRIP_CONTENT = /<(script|style|iframe|object|embed|noscript|template)\b[\s\S]*?<\/\1\s*>/gi;

function isSafeUrl(value: string): boolean {
  const trimmed = value.trim();

  // Relative URLs and anchors are fine.
  if (/^(\/|#|\.\/|\.\.\/)/.test(trimmed)) return true;

  // Anything with a scheme must be one we trust. `javascript:`, `data:` and
  // `vbscript:` are the ones that turn a link into code execution.
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(trimmed);
  if (!scheme) return true; // schemeless, e.g. "example.com/page"

  return ['http', 'https', 'mailto', 'tel'].includes(scheme[1].toLowerCase());
}

function escapeText(value: string): string {
  return value.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function sanitizeHtml(input: string): string {
  if (!input) return '';

  // 1. Remove elements whose content is never renderable prose.
  let html = input.replace(STRIP_CONTENT, '');
  // 2. Remove HTML comments, which can hide conditional-comment payloads.
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  const output: string[] = [];
  const openTags: string[] = [];

  // Walks the markup tag by tag. Text between tags is escaped; each tag is
  // rebuilt from only the attributes that survived the allowlist, so nothing
  // from the input is ever echoed verbatim into an attribute position.
  const tagPattern = /<\/?([a-zA-Z][a-zA-Z0-9]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;

  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = tagPattern.exec(html)) !== null) {
    output.push(escapeText(html.slice(cursor, match.index)));
    cursor = match.index + match[0].length;

    const raw = match[0];
    const tag = match[1].toLowerCase();
    const isClosing = raw.startsWith('</');

    if (!ALLOWED_TAGS.has(tag)) continue;

    if (isClosing) {
      const index = openTags.lastIndexOf(tag);
      if (index !== -1) {
        openTags.splice(index, 1);
        output.push(`</${tag}>`);
      }
      continue;
    }

    const permitted = ALLOWED_ATTRIBUTES[tag];
    const attributes: string[] = [];

    if (permitted) {
      const attrPattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
      let attr: RegExpExecArray | null;

      while ((attr = attrPattern.exec(match[2])) !== null) {
        const name = attr[1].toLowerCase();
        if (!permitted.has(name)) continue;

        const value = attr[3] ?? attr[4] ?? attr[5] ?? '';

        if ((name === 'href' || name === 'src') && !isSafeUrl(value)) continue;

        attributes.push(
          `${name}="${value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')}"`
        );
      }
    }

    // Any link that opens a new tab gets rel="noopener" — without it the target
    // page can reach back through window.opener.
    if (tag === 'a') {
      const hasTarget = attributes.some((a) => a.startsWith('target='));
      if (hasTarget && !attributes.some((a) => a.startsWith('rel='))) {
        attributes.push('rel="noopener noreferrer"');
      }
    }

    // Images in show notes are always lazy — they sit below the fold.
    if (tag === 'img' && !attributes.some((a) => a.startsWith('loading='))) {
      attributes.push('loading="lazy"');
    }

    const isVoid = tag === 'br' || tag === 'hr' || tag === 'img';
    const rendered = attributes.length ? `<${tag} ${attributes.join(' ')}` : `<${tag}`;

    if (isVoid) {
      output.push(`${rendered} />`);
    } else {
      output.push(`${rendered}>`);
      openTags.push(tag);
    }
  }

  output.push(escapeText(html.slice(cursor)));

  // Close anything the input left open so the surrounding page cannot be
  // restructured by an unbalanced tag.
  while (openTags.length > 0) {
    output.push(`</${openTags.pop()}>`);
  }

  return output.join('').trim();
}

/** Strips all markup — for meta descriptions and list summaries. */
export function toPlainText(html: string, limit?: number): string {
  const text = html
    .replace(STRIP_CONTENT, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

  if (!limit || text.length <= limit) return text;

  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : limit).trimEnd()}…`;
}
