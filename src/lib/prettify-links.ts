/**
 * Display-time tidy-up for CMS show notes.
 *
 * Imported notes (from Podbean) carry links written out in full —
 * `LinkedIn: https://www.linkedin.com/in/…` — sometimes with the label linked
 * (often to the wrong place), sometimes not. This turns each of those into one
 * readable link pointing at the URL that was written out. It runs on HTML that
 * `sanitizeHtml()` already cleaned on write; it only ever adds anchors and
 * removes URL text, and never introduces markup from the content itself.
 */

/** `https://…` or a bare `www.…`. */
const URL_RE = String.raw`(?:https?://|www\.)[^\s<"'()]+`;
const ATTRS = 'class="note-link" target="_blank" rel="noopener noreferrer"';

function absolute(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function hostLabel(url: string): string {
  try {
    const host = new URL(absolute(url)).hostname.replace(/^www\./, '');
    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return url;
  }
}

function link(href: string, label: string): string {
  // Trailing punctuation belongs to the sentence, not the address.
  const clean = href.replace(/[.,;:!?]+$/, '');
  return `<a href="${absolute(clean)}" ${ATTRS}>${label.trim()}</a>`;
}

export function prettifyLinks(html: string): string {
  let out = html;

  // `<a>Label</a>: <a>https://…</a>` or `<a>Label</a>: https://…`
  out = out.replace(
    new RegExp(
      String.raw`<a\b[^>]*>([^<]{1,60}?)<\/a>\s*:\s*(?:<a\b[^>]*href=["'](${URL_RE})["'][^>]*>\s*${URL_RE}\s*<\/a>|(${URL_RE}))`,
      'gi'
    ),
    (_m, label: string, href1?: string, href2?: string) => link((href1 ?? href2)!, label)
  );

  // Plain `Label: https://…` where the label is not already inside a tag.
  out = out.replace(
    new RegExp(String.raw`(^|>|\s)([A-Za-z][A-Za-z0-9 .&'/-]{1,40}?)\s*:\s*(${URL_RE})`, 'g'),
    (_m, lead: string, label: string, href: string) => `${lead}${link(href, label)}`
  );

  // Anchors whose visible text is a bare URL get a hostname label.
  out = out.replace(
    new RegExp(String.raw`<a\b[^>]*href=["'](${URL_RE})["'][^>]*>\s*${URL_RE}\s*<\/a>`, 'gi'),
    (_m, href: string) => link(href, hostLabel(href))
  );

  // Remaining bare URLs in text become links.
  out = out.replace(
    new RegExp(String.raw`(^|[\s>(])(${URL_RE})(?![^<]*<\/a>)`, 'g'),
    (_m, lead: string, href: string) => `${lead}${link(href, hostLabel(href))}`
  );

  return out;
}
