import { describe, expect, it } from 'vitest';

import { slugify, uniqueSlug } from '../../src/server/slug';

describe('slugify', () => {
  it('builds a readable URL segment from an episode title', () => {
    expect(slugify('Interview of Larry Kesslin, Chief Connector at SPIRE')).toBe(
      'interview-of-larry-kesslin-chief-connector-at-spire'
    );
  });

  it('strips diacritics instead of dropping the letters', () => {
    expect(slugify('Señor Ramírez')).toBe('senor-ramirez');
  });

  it('spells out an ampersand', () => {
    expect(slugify('Rock & Roll')).toBe('rock-and-roll');
  });

  it('removes apostrophes rather than turning them into dashes', () => {
    expect(slugify("What's Next")).toBe('whats-next');
  });

  it('never starts or ends with a dash', () => {
    const slug = slugify('  --- Hello --- ');
    expect(slug.startsWith('-')).toBe(false);
    expect(slug.endsWith('-')).toBe(false);
  });

  it('falls back to a usable value for input with no letters', () => {
    expect(slugify('!!!')).toBe('untitled');
    expect(slugify('')).toBe('untitled');
  });

  it('caps the length so a long title cannot make an unusable URL', () => {
    expect(slugify('word '.repeat(60)).length).toBeLessThanOrEqual(90);
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', async () => {
    expect(await uniqueSlug('My Episode', async () => false)).toBe('my-episode');
  });

  it('appends a counter until it finds a free slug', async () => {
    const taken = new Set(['my-episode', 'my-episode-2']);
    expect(await uniqueSlug('My Episode', async (s) => taken.has(s))).toBe('my-episode-3');
  });

  it('terminates even when everything is taken', async () => {
    const slug = await uniqueSlug('x', async () => true);
    expect(slug.startsWith('x-')).toBe(true);
  });
});
