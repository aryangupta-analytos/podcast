import { describe, expect, it } from 'vitest';

import { topicsFrom } from '../../src/lib/episode-topics';

describe('topicsFrom', () => {
  it('reads the first list as plain text', () => {
    const html =
      '<p>Intro</p><ul><li class="x"><p>His journey &amp; lessons.</p></li><li> More about\n capitalism. </li></ul>' +
      '<ul><li>Second list</li></ul>';
    expect(topicsFrom(html)).toEqual(['His journey & lessons.', 'More about capitalism.']);
  });

  it('drops empty items and caps the count', () => {
    expect(topicsFrom('<ul><li>&nbsp;</li><li>A</li><li>B</li></ul>', 1)).toEqual(['A']);
  });

  it('returns nothing without a list', () => {
    expect(topicsFrom('<p>No list</p>')).toEqual([]);
    expect(topicsFrom(null)).toEqual([]);
  });
});
