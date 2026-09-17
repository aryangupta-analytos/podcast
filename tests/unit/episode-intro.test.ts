import { describe, expect, it } from 'vitest';

import { introFrom } from '../../src/lib/episode-intro';

describe('introFrom', () => {
  it('keeps the guest introduction and stops at the topics list', () => {
    const html =
      '<p>Larry is an entrepreneur.</p><p>In his fifties he seeks significance.</p>' +
      '<p>In this interview we talked about:</p><ul><li>Things</li></ul><p>Help us reach new listeners</p>';
    expect(introFrom(html)).toBe(
      '<p>Larry is an entrepreneur.</p>\n<p>In his fifties he seeks significance.</p>'
    );
  });

  it('skips empty paragraphs and caps the length', () => {
    const html = '<p>&nbsp;</p><p>One.</p><p>Two.</p><p>Three.</p><p>Four.</p>';
    expect(introFrom(html)).toBe('<p>One.</p>\n<p>Two.</p>\n<p>Three.</p>');
  });

  it('returns nothing for empty notes or notes that open with the list', () => {
    expect(introFrom('')).toBe('');
    expect(introFrom(null)).toBe('');
    expect(introFrom('<p>In this episode we cover pricing.</p>')).toBe('');
  });
});
