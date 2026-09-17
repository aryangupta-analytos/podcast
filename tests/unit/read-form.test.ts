import { describe, expect, it } from 'vitest';

import { readFormData, readUploadData } from '../../src/server/read-form';

function jsonRequest(body: unknown) {
  return new Request('https://example.test/admin/x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('readFormData', () => {
  it('still reads an ordinary form post', async () => {
    const body = new URLSearchParams({ email: 'a@b.c', password: 'secret' });
    const form = await readFormData(
      new Request('https://example.test/admin/login', { method: 'POST', body })
    );
    expect(form.get('email')).toBe('a@b.c');
    expect(form.get('password')).toBe('secret');
  });

  it('reads a JSON body as if it were a form', async () => {
    const form = await readFormData(jsonRequest({ email: 'a@b.c', action: 'delete' }));
    expect(form.get('email')).toBe('a@b.c');
    expect(form.get('action')).toBe('delete');
  });

  it('keeps an array as repeated values, like a checkbox group', async () => {
    const form = await readFormData(jsonRequest({ guests: ['ann', 'bo', 'cy'] }));
    expect(form.getAll('guests')).toEqual(['ann', 'bo', 'cy']);
  });

  it('coerces non-strings the way a form would', async () => {
    const form = await readFormData(jsonRequest({ number: 12, featured: true }));
    expect(form.get('number')).toBe('12');
    expect(form.get('featured')).toBe('true');
  });

  it('drops null and undefined rather than writing "null"', async () => {
    const form = await readFormData(jsonRequest({ a: null, b: 'kept' }));
    expect(form.has('a')).toBe(false);
    expect(form.get('b')).toBe('kept');
  });

  it('treats a malformed body as an empty submission', async () => {
    const request = new Request('https://example.test/admin/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json'
    });
    await expect(readFormData(request)).resolves.toBeInstanceOf(FormData);
  });
});

describe('readUploadData', () => {
  it('rebuilds a real File from base64 so magic-byte checks still work', async () => {
    // The first bytes of a PNG — what validate.ts sniffs for.
    const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const form = await readUploadData(
      jsonRequest({
        kind: 'image',
        alt: 'a photo',
        file: { name: 'x.png', type: 'image/png', data: png.toString('base64') }
      })
    );

    const file = form.get('file');
    expect(file).toBeInstanceOf(File);
    expect((file as File).name).toBe('x.png');
    expect((file as File).type).toBe('image/png');
    expect(Buffer.from(await (file as File).arrayBuffer())).toEqual(png);
    expect(form.get('kind')).toBe('image');
    expect(form.get('alt')).toBe('a photo');
  });
});
