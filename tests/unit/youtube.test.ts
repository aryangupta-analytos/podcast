import { describe, expect, it } from 'vitest';

import { youtubeEmbed, youtubeId, youtubeThumb } from '../../src/lib/youtube';
import { isHexColor, normalizeHex } from '../../src/lib/colors';

describe('youtubeId', () => {
  it('reads every common URL shape', () => {
    const id = 'dQw4w9WgXcQ';
    expect(youtubeId(`https://www.youtube.com/watch?v=${id}`)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/watch?v=${id}&t=42s`)).toBe(id);
    expect(youtubeId(`https://youtu.be/${id}`)).toBe(id);
    expect(youtubeId(`https://youtu.be/${id}?si=abc`)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/shorts/${id}`)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/embed/${id}`)).toBe(id);
    expect(youtubeId(`https://www.youtube.com/live/${id}`)).toBe(id);
    expect(youtubeId(`https://m.youtube.com/watch?v=${id}`)).toBe(id);
  });

  it('rejects anything that is not a YouTube video', () => {
    expect(youtubeId(null)).toBeNull();
    expect(youtubeId('')).toBeNull();
    expect(youtubeId('not a url')).toBeNull();
    expect(youtubeId('https://vimeo.com/12345')).toBeNull();
    expect(youtubeId('https://www.youtube.com/channel/UC123')).toBeNull();
    expect(youtubeId('https://www.youtube.com/watch?v=short')).toBeNull();
  });

  it('builds thumbnail and embed URLs', () => {
    expect(youtubeThumb('dQw4w9WgXcQ')).toBe(
      'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
    );
    expect(youtubeEmbed('dQw4w9WgXcQ')).toContain(
      'youtube-nocookie.com/embed/dQw4w9WgXcQ'
    );
  });
});

describe('colors', () => {
  it('validates hex colours', () => {
    expect(isHexColor('#ff6a3d')).toBe(true);
    expect(isHexColor('#FFF')).toBe(true);
    expect(isHexColor('ff6a3d')).toBe(false);
    expect(isHexColor('#ff6a3')).toBe(false);
    expect(isHexColor('red')).toBe(false);
  });

  it('normalises to six lower-case digits', () => {
    expect(normalizeHex('#FFF')).toBe('#ffffff');
    expect(normalizeHex(' #Ff6A3d ')).toBe('#ff6a3d');
    expect(normalizeHex('nope')).toBeNull();
  });
});
