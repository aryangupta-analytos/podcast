import { describe, expect, it } from 'vitest';

import { csvCell, csvRow } from '../../src/lib/csv';
import { isEmail } from '../../src/server/rate-limit';

describe('isEmail', () => {
  it('accepts ordinary addresses', () => {
    expect(isEmail('someone@example.com')).toBe(true);
    expect(isEmail('first.last+tag@sub.example.co')).toBe(true);
  });

  it('rejects malformed addresses', () => {
    expect(isEmail('')).toBe(false);
    expect(isEmail('nope')).toBe(false);
    expect(isEmail('a@b')).toBe(false);
    expect(isEmail('a b@example.com')).toBe(false);
  });
});

describe('csvCell', () => {
  it('quotes and escapes', () => {
    expect(csvCell('plain')).toBe('"plain"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('a,b')).toBe('"a,b"');
  });

  it('neutralises formula prefixes', () => {
    expect(csvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
    expect(csvCell('+1')).toBe(`"'+1"`);
    expect(csvCell('-x')).toBe(`"'-x"`);
    expect(csvCell('@cmd')).toBe(`"'@cmd"`);
  });

  it('formats dates as ISO and empties as blank', () => {
    expect(csvCell(new Date('2026-01-02T03:04:05Z'))).toBe('"2026-01-02T03:04:05.000Z"');
    expect(csvCell(null)).toBe('""');
    expect(csvRow(['a', 1])).toBe('"a","1"');
  });
});
