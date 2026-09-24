import { describe, expect, it } from 'vitest';

import { groupSummary, leadIndex, parseTags, partLabel, tagSlug } from '../../src/lib/episode-groups';

describe('partLabel', () => {
  it('reads the part number however the title spells it', () => {
    expect(partLabel('Part 2 - Interview of Prem Jain')).toBe('Part 2');
    expect(partLabel('Part 1: Interview of Prem Jain')).toBe('Part 1');
    expect(partLabel('Part 1- Interview of David Womark')).toBe('Part 1');
  });

  it('names teasers, and falls back to the episode number', () => {
    expect(partLabel('Teaser - Interview of Prem Jain')).toBe('Teaser');
    expect(partLabel('Interview of Larry Kesslin', '12')).toBe('Episode 12');
    expect(partLabel('Interview of Larry Kesslin')).toBe('Episode');
  });
});

describe('groupSummary', () => {
  it('counts parts and mentions a teaser', () => {
    expect(groupSummary(['Part 1 - A', 'Part 2 - A'])).toBe('2-part interview');
    expect(groupSummary(['Teaser - A', 'Part 1: A', 'Part 2 - A'])).toBe('2-part interview + teaser');
  });

  it('falls back to an episode count without part numbers', () => {
    expect(groupSummary(['Interview of A', 'Another chat with A'])).toBe('2 episodes');
  });
});

describe('leadIndex', () => {
  it('starts at Part 1, skipping a teaser', () => {
    expect(leadIndex(['Teaser - A', 'Part 1: A', 'Part 2 - A'])).toBe(1);
    expect(leadIndex(['Teaser - A', 'Interview of A'])).toBe(1);
    expect(leadIndex(['Interview of A'])).toBe(0);
  });
});

describe('tags', () => {
  it('slugs a tag for the URL', () => {
    expect(tagSlug('Film & Media')).toBe('film-and-media');
    expect(tagSlug('  Leadership ')).toBe('leadership');
    expect(tagSlug('!!!')).toBe('');
  });

  it('parses the admin field: trimmed, deduplicated, capped', () => {
    expect(parseTags(' Leadership, technology ,Leadership, , Film & Media')).toEqual([
      'Leadership',
      'technology',
      'Film & Media'
    ]);
    expect(parseTags('a, b, c, d, e, f, g')).toHaveLength(6);
    expect(parseTags('!!!, ok')).toEqual(['ok']);
  });
});
