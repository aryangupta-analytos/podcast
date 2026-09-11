import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { normalize, resolve, sep } from 'node:path';
import { Readable } from 'node:stream';

import type { APIRoute } from 'astro';

import { CACHE_IMMUTABLE } from '../../lib/cache';
import { env } from '../../server/env';
import { localStorageRoot } from '../../server/storage/local';

const MIME_BY_EXTENSION: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  avif: 'image/avif',
  svg: 'image/svg+xml',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  flac: 'audio/flac'
};

/**
 * Serves files stored by the local storage driver.
 *
 * Only used when STORAGE_DRIVER=local — with S3 the URLs point straight at the
 * bucket's CDN and this route is never hit.
 *
 * Range requests are honoured because audio players rely on them to seek
 * without downloading a whole episode.
 */
export const GET: APIRoute = async ({ params, request }) => {
  if (env.storageDriver !== 'local') {
    return new Response('Not found', { status: 404 });
  }

  const key = params.key;
  if (!key) return new Response('Not found', { status: 404 });

  const root = localStorageRoot();
  const target = resolve(root, normalize(key));

  // Refuse anything that resolves outside the storage root.
  if (target !== root && !target.startsWith(root + sep)) {
    return new Response('Not found', { status: 404 });
  }

  let info;
  try {
    info = await stat(target);
    if (!info.isFile()) throw new Error('not a file');
  } catch {
    return new Response('Not found', { status: 404 });
  }

  const extension = key.split('.').pop()?.toLowerCase() ?? '';
  const contentType = MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';

  const baseHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Cache-Control': CACHE_IMMUTABLE,
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff'
  };

  const range = request.headers.get('range');

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Number(match[2]) : info.size - 1;

      if (start >= info.size || end >= info.size || start > end) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${info.size}` }
        });
      }

      const stream = createReadStream(target, { start, end });
      return new Response(Readable.toWeb(stream) as ReadableStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${info.size}`,
          'Content-Length': String(end - start + 1)
        }
      });
    }
  }

  const stream = createReadStream(target);
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    headers: { ...baseHeaders, 'Content-Length': String(info.size) }
  });
};
