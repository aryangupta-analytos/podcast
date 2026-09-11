import { describe, expect, it } from 'vitest';

import { sanitizeHtml, toPlainText } from '../../src/server/sanitize';

describe('sanitizeHtml', () => {
  it('keeps the formatting an owner actually writes', () => {
    const input =
      '<p>Hello <strong>world</strong> and <em>everyone</em>.</p><ul><li>One</li><li>Two</li></ul>';
    expect(sanitizeHtml(input)).toBe(input);
  });

  it('removes script tags and their contents', () => {
    const result = sanitizeHtml('<p>Before</p><script>alert(1)</script><p>After</p>');
    expect(result).not.toContain('script');
    expect(result).not.toContain('alert');
    expect(result).toContain('Before');
    expect(result).toContain('After');
  });

  it('removes style, iframe and object elements entirely', () => {
    for (const tag of ['style', 'iframe', 'object', 'embed', 'noscript']) {
      const result = sanitizeHtml(`<p>ok</p><${tag}>payload</${tag}>`);
      expect(result).not.toContain('payload');
      expect(result).toContain('ok');
    }
  });

  it('strips every event handler attribute', () => {
    const result = sanitizeHtml(
      '<a href="https://example.com" onclick="steal()" onmouseover="x()">link</a>'
    );
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
    expect(result).toContain('href="https://example.com"');
  });

  it('drops javascript: and data: URLs but keeps real links', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript');
    expect(sanitizeHtml('<a href="data:text/html,<script>">x</a>')).not.toContain('data:');
    expect(sanitizeHtml('<a href="https://ok.example">x</a>')).toContain('https://ok.example');
    expect(sanitizeHtml('<a href="/episodes/one">x</a>')).toContain('/episodes/one');
    expect(sanitizeHtml('<a href="mailto:a@b.com">x</a>')).toContain('mailto:a@b.com');
  });

  it('is not fooled by mixed case or whitespace in a javascript: URL', () => {
    const result = sanitizeHtml('<a href="  JaVaScRiPt:alert(1)">x</a>');
    expect(result.toLowerCase()).not.toContain('javascript');
  });

  it('escapes stray angle brackets rather than emitting them raw', () => {
    const result = sanitizeHtml('<p>5 < 6 and 7 > 2</p>');
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
  });

  it('closes tags the input left open', () => {
    const result = sanitizeHtml('<p>unclosed');
    expect(result).toBe('<p>unclosed</p>');
  });

  it('adds rel="noopener" to links that open a new tab', () => {
    const result = sanitizeHtml('<a href="https://x.example" target="_blank">x</a>');
    expect(result).toContain('rel="noopener noreferrer"');
  });

  it('makes images in show notes lazy', () => {
    expect(sanitizeHtml('<img src="/a.png" alt="a">')).toContain('loading="lazy"');
  });

  it('removes HTML comments', () => {
    expect(sanitizeHtml('<p>a</p><!-- [if IE]><script>x</script><![endif] -->')).toBe('<p>a</p>');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('toPlainText', () => {
  it('strips markup and collapses whitespace', () => {
    expect(toPlainText('<p>Hello   <strong>there</strong></p>')).toBe('Hello there');
  });

  it('truncates on a word boundary', () => {
    const result = toPlainText('<p>one two three four five six</p>', 12);
    expect(result.endsWith('…')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(13);
    expect(result).not.toContain('thre…');
  });

  it('decodes the entities a pasted document brings along', () => {
    expect(toPlainText('<p>Tom &amp; Jerry &quot;quoted&quot;</p>')).toBe(
      'Tom & Jerry "quoted"'
    );
  });
});
