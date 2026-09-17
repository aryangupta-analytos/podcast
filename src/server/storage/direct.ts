import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

import { getDb } from '../db';
import { mediaAssets, type MediaAsset } from '../db/schema';
import { env } from '../env';
import { getStorage } from './index';
import { UploadError } from './validate';

/**
 * Direct browser-to-storage uploads.
 *
 * The proxy path (POST the file to /api/admin/upload) is simple and keeps
 * validation server-side, but it cannot carry a podcast episode on a
 * serverless host: the request body limit is a few megabytes. So when object
 * storage is configured, the browser is handed a short-lived signed URL and
 * uploads straight to the bucket.
 *
 * The risk that introduces is that the server no longer sees the bytes, so it
 * cannot be told "this file is at key X" by a client that made X up. Two
 * things prevent that:
 *
 *  1. The key is generated here and returned with an HMAC. Registration
 *     requires the matching signature, so only a key this server issued can be
 *     registered.
 *  2. Before the metadata row is written, the object is checked in the bucket —
 *     its real size is read from storage rather than believed from the client.
 */

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/mpeg',
  'audio/mp3',
  'audio/mp4',
  'audio/m4a',
  'audio/x-m4a',
  'audio/wav',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac'
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'm4a',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac'
};

function signKey(key: string): string {
  return createHmac('sha256', env.sessionSecret)
    .update(`upload:${key}`)
    .digest('base64url');
}

function verifyKey(key: string, signature: string): boolean {
  const expected = Buffer.from(signKey(key));
  const provided = Buffer.from(signature);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export interface DirectUploadTicket {
  mode: 'direct';
  uploadUrl: string;
  headers: Record<string, string>;
  key: string;
  token: string;
  publicUrl: string;
}

export interface ProxyUploadTicket {
  mode: 'proxy';
  /** Largest file the proxy route will accept, so the UI can say so up front. */
  maxBytes: number;
}

export type UploadTicket = DirectUploadTicket | ProxyUploadTicket;

/**
 * Decides how a given file should be uploaded and, for direct uploads, issues
 * the signed URL.
 *
 * Only audio goes direct. Images keep going through the server so they are
 * re-encoded, downscaled and stripped of EXIF — that processing is the whole
 * point of the image pipeline, and images are small enough to fit through it.
 */
export async function createUploadTicket(options: {
  kind: 'image' | 'audio';
  contentType: string;
  bytes: number;
}): Promise<UploadTicket> {
  const { kind, contentType, bytes } = options;

  if (kind === 'image') {
    return { mode: 'proxy', maxBytes: env.maxImageBytes };
  }

  if (bytes > env.maxAudioBytes) {
    throw new UploadError(
      `That audio file is larger than the ${Math.round(env.maxAudioBytes / 1024 / 1024)} MB limit.`,
      413
    );
  }

  const normalized = contentType.split(';')[0].trim().toLowerCase();
  if (!ALLOWED_AUDIO_TYPES.has(normalized)) {
    throw new UploadError(
      'That file type is not supported. Use MP3, M4A, WAV, OGG or FLAC.'
    );
  }

  const storage = await getStorage();
  if (!storage.presignPut) {
    // Local disk: there is nowhere for the browser to PUT to, so fall back.
    return { mode: 'proxy', maxBytes: env.maxAudioBytes };
  }

  const now = new Date();
  const key = `audio/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${randomUUID()}.${
    EXTENSION_BY_TYPE[normalized] ?? 'mp3'
  }`;

  const presigned = await storage.presignPut({
    key,
    contentType: normalized,
    maxBytes: env.maxAudioBytes
  });

  if (!presigned) return { mode: 'proxy', maxBytes: env.maxAudioBytes };

  return {
    mode: 'direct',
    uploadUrl: presigned.uploadUrl,
    headers: presigned.headers,
    key: presigned.key,
    token: signKey(presigned.key),
    publicUrl: presigned.publicUrl
  };
}

/**
 * Records a directly-uploaded file, after verifying the server issued the key
 * and the object really landed in the bucket.
 */
export async function registerDirectUpload(options: {
  key: string;
  token: string;
  filename: string;
  durationSeconds?: number;
  uploadedBy: string;
}): Promise<MediaAsset> {
  const { key, token, filename, durationSeconds, uploadedBy } = options;

  if (!verifyKey(key, token)) {
    throw new UploadError('That upload could not be verified.', 403);
  }

  const storage = await getStorage();
  const head = await storage.headObject?.(key);

  if (!head || head.bytes === 0) {
    throw new UploadError(
      'The upload did not finish. Please try again.',
      409
    );
  }

  if (head.bytes > env.maxAudioBytes) {
    // The signed URL let it through; refuse to adopt it and clean up.
    await storage.delete(key).catch(() => {});
    throw new UploadError('That audio file is over the size limit.', 413);
  }

  const duration =
    typeof durationSeconds === 'number' &&
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    durationSeconds < 86400
      ? Math.round(durationSeconds)
      : null;

  const [asset] = await getDb()
    .insert(mediaAssets)
    .values({
      storageKey: key,
      url: storage.urlFor(key),
      kind: 'audio',
      originalFilename:
        filename.replace(/[/\\]/g, '_').replace(/[^\w.\- ]/g, '').trim().slice(0, 200) ||
        'upload',
      mimeType: head.contentType ?? 'audio/mpeg',
      bytes: head.bytes,
      durationSeconds: duration,
      uploadedBy
    })
    .returning();

  return asset;
}
