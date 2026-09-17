import { describe, expect, it } from 'vitest';

import { prettifyLinks } from '../../src/lib/prettify-links';

describe('prettifyLinks', () => {
  it('collapses a linked label followed by a linked URL', () => {
    const html =
      '<p><a href="https://x.com">LinkedIn</a>: <a href="https://www.linkedin.com/in/larry/">https://www.linkedin.com/in/larry/</a></p>';
    const out = prettifyLinks(html);
    expect(out).toBe(
      '<p><a href="https://www.linkedin.com/in/larry/" class="note-link" target="_blank" rel="noopener noreferrer">LinkedIn</a></p>'
    );
  });

  it('links a plain label followed by a URL', () => {
    expect(prettifyLinks('<p>Website: https://www.svtechpodcast.com</p>')).toBe(
      '<p><a href="https://www.svtechpodcast.com" class="note-link" target="_blank" rel="noopener noreferrer">Website</a></p>'
    );
  });

  it('labels bare URL anchors and loose URLs by hostname', () => {
    expect(prettifyLinks('<a href="https://github.com/a">https://github.com/a</a>')).toContain(
      '>Github.com</a>'
    );
    expect(prettifyLinks('<p>see https://example.org/x today</p>')).toContain(
      '>Example.org</a> today'
    );
  });

  it('leaves ordinary text and links alone', () => {
    const html = '<p>Hello <a href="/about">about</a> world.</p>';
    expect(prettifyLinks(html)).toBe(html);
  });
});

describe('prettifyLinks on imported Podbean notes', () => {
  it('handles single-quoted hrefs, wrong-target labels and www. addresses', () => {
    const html =
      "<p><a href='http://www.tackettbartlett.com/'>LinkedIn</a>: https://www.linkedin.com/in/larrykesslin/</p>" +
      "<p><a href='http://www.tackettbartlett.com/'>Website</a>: www.svtechpodcast.com</p>" +
      "<p><a href='http://x.com/'>Facebook</a>: <a href='https://www.facebook.com/a?b=c'>https://www.facebook.com/a?b=c</a></p>";
    const out = prettifyLinks(html);
    expect(out).toContain('href="https://www.linkedin.com/in/larrykesslin/" class="note-link"');
    expect(out).toContain('>LinkedIn</a>');
    expect(out).toContain('href="https://www.svtechpodcast.com" class="note-link"');
    expect(out).toContain('href="https://www.facebook.com/a?b=c" class="note-link"');
    expect(out).not.toContain('tackettbartlett');
    expect(out).not.toContain('>https://');
  });
});
