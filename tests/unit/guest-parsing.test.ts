import { describe, expect, it } from 'vitest';

import { parseGuestFromTitle } from '../../scripts/lib/migrate-content';
import { toPlainText } from '../../scripts/lib/rss-import';

describe('parseGuestFromTitle', () => {
  it('pulls the guest and their role out of a plain interview title', () => {
    expect(parseGuestFromTitle('Interview of Larry Kesslin, Chief Connector at SPIRE')).toEqual({
      name: 'Larry Kesslin',
      title: 'Chief Connector at SPIRE'
    });
  });

  it('ignores a "Part 2 - " prefix', () => {
    expect(
      parseGuestFromTitle('Part 2 - Interview of Prem Jain, CEO at Pensando Systems')
    ).toEqual({ name: 'Prem Jain', title: 'CEO at Pensando Systems' });
  });

  it('ignores a "Teaser - " prefix', () => {
    expect(
      parseGuestFromTitle('Teaser - Interview of Prem Jain, CEO at Pensando Systems')?.name
    ).toBe('Prem Jain');
  });

  it('handles a dash separating the name from the role', () => {
    expect(
      parseGuestFromTitle('Interview of Lou Pambianco - Chairman and CEO of Startup Sandbox')
    ).toEqual({ name: 'Lou Pambianco', title: 'Chairman and CEO of Startup Sandbox' });
  });

  it('decodes an HTML-escaped ampersand', () => {
    const parsed = parseGuestFromTitle(
      'Interview of Rushabh Parmani, Co-Founder &amp; Executive Vice President'
    );
    expect(parsed?.title).toContain('&');
    expect(parsed?.title).not.toContain('&amp;');
  });

  it('returns null for a title that names no guest', () => {
    expect(parseGuestFromTitle('000 Launching Silicon Valley Tech')).toBeNull();
    expect(parseGuestFromTitle('A conversation about hiring')).toBeNull();
  });

  it('refuses to treat a sentence as a name', () => {
    expect(
      parseGuestFromTitle(
        'Interview of the entire founding team of a very large company indeed'
      )
    ).toBeNull();
  });
});

describe('toPlainText', () => {
  it('turns HTML show notes into a summary', () => {
    expect(toPlainText('<p>Hello <b>there</b></p><p>Second</p>')).toBe('Hello there Second');
  });

  it('truncates at a word boundary with an ellipsis', () => {
    const result = toPlainText('<p>alpha beta gamma delta epsilon</p>', 14);
    expect(result.endsWith('…')).toBe(true);
    expect(result.startsWith('alpha beta')).toBe(true);
  });
});
