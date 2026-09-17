import { randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';

import sharp from 'sharp';

import { getDb } from '../db';
import { mediaAssets, type MediaAsset } from '../db/schema';
import { env } from '../env';
import { createLocalDriver } from './local';
import type { StorageDriver } from './types';
import {
  formatBytes,
  sniffAudio,
  sniffImage,
  UploadError
} from './validate';

export { UploadError, formatBytes } from './validate';
export type { StorageDriver, StoredFile } from './types';

let driver: StorageDriver | undefined;

/**
 * Async so the S3 driver — and the ~3 MB AWS SDK behind it — is only loaded
 * when it is actually the configured driver. A local-disk deployment never
 * pays for it in bundle size or cold-start time.
 */
export async function getStorage(): Promise<StorageDriver> {
  if (!driver) {
    if (env.storageDriver === 's3') {
      const { createS3Driver } = await import('./s3');
      driver = createS3Driver();
    } else {
      if (env.isProduction) {
        // Worth shouting about: on a serverless host the filesystem is wiped
        // between invocations, so uploads would silently vanish.
        console.warn(
          '[storage] STORAGE_DRIVER=local in production. Uploaded files are ' +
            'stored on an ephemeral filesystem and WILL be lost. Set ' +
            'STORAGE_DRIVER=s3 with the S3_* variables before going live.'
        );
      }
      driver = createLocalDriver();
    }
  }
  return driver;
}

/** `images/2026/09/<uuid>.webp` — date-partitioned so a bucket stays browsable. */
function buildKey(prefix: 'images' | 'audio', extension: string): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${prefix}/${year}/${month}/${randomUUID()}.${extension}`;
}

/** Largest dimension we ever need; originals above this are downscaled once. */
const MAX_IMAGE_DIMENSION = 2000;

export interface UploadResult {
  asset: MediaAsset;
}

/**
 * Validates, optimizes and stores an image, then records its metadata.
 *
 * Every upload is re-encoded to WebP through sharp. That strips EXIF (so a
 * guest photo cannot leak GPS coordinates), neutralises anything malicious
 * hiding in the original container, and typically cuts the file to a third of
 * its size.
 */
export async function uploadImage(
  file: File,
  options: { uploadedBy?: string; alt?: string } = {}
): Promise<UploadResult> {
  if (file.size === 0) throw new UploadError('That file is empty.');
  if (file.size > env.maxImageBytes) {
    throw new UploadError(
      `That image is ${formatBytes(file.size)}. The limit is ${formatBytes(env.maxImageBytes)}.`,
      413
    );
  }

  const input = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImage(input);
  if (!sniffed) {
    throw new UploadError(
      'That does not look like an image. Use a JPG, PNG, WebP, AVIF or GIF file.'
    );
  }

  let pipeline = sharp(input, { animated: sniffed.mimeType === 'image/gif' });
  const metadata = await pipeline.metadata();

  if (
    (metadata.width ?? 0) > MAX_IMAGE_DIMENSION ||
    (metadata.height ?? 0) > MAX_IMAGE_DIMENSION
  ) {
    pipeline = pipeline.resize(MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION, {
      fit: 'inside',
      withoutEnlargement: true
    });
  }

  const output = await pipeline
    .rotate() // honour EXIF orientation before the tag is dropped
    .webp({ quality: 82, effort: 4 })
    .toBuffer({ resolveWithObject: true });

  const key = buildKey('images', 'webp');
  const storage = await getStorage();
  const stored = await storage.put({
    key,
    body: output.data,
    mimeType: 'image/webp'
  });

  const [asset] = await getDb()
    .insert(mediaAssets)
    .values({
      storageKey: stored.key,
      url: stored.url,
      kind: 'image',
      originalFilename: sanitizeFilename(file.name),
      mimeType: 'image/webp',
      bytes: output.info.size,
      width: output.info.width,
      height: output.info.height,
      alt: options.alt?.slice(0, 300) ?? null,
      uploadedBy: options.uploadedBy ?? null
    })
    .returning();

  return { asset };
}

/**
 * Validates and stores a podcast audio file.
 *
 * Audio is stored byte-for-byte — re-encoding would cost quality and minutes
 * of CPU for no benefit. `durationSeconds` comes from the browser, which has
 * already decoded the file to show the owner its length; it is clamped to a
 * sane range rather than trusted outright.
 */
export async function uploadAudio(
  file: File,
  options: { uploadedBy?: string; durationSeconds?: number } = {}
): Promise<UploadResult> {
  if (file.size === 0) throw new UploadError('That file is empty.');
  if (file.size > env.maxAudioBytes) {
    throw new UploadError(
      `That audio file is ${formatBytes(file.size)}. The limit is ${formatBytes(env.maxAudioBytes)}.`,
      413
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const sniffed = sniffAudio(buffer);
  if (!sniffed) {
    throw new UploadError(
      'That does not look like an audio file. Use MP3, M4A, WAV, OGG or FLAC.'
    );
  }

  const key = buildKey('audio', sniffed.extension);
  const storage = await getStorage();
  const stored = await storage.put({
    key,
    body: buffer,
    mimeType: sniffed.mimeType
  });

  // 24 hours is a generous ceiling for a podcast episode; anything outside the
  // range is treated as unknown rather than written as nonsense.
  const duration = options.durationSeconds;
  const durationSeconds =
    typeof duration === 'number' && Number.isFinite(duration) && duration > 0 && duration < 86400
      ? Math.round(duration)
      : null;

  const [asset] = await getDb()
    .insert(mediaAssets)
    .values({
      storageKey: stored.key,
      url: stored.url,
      kind: 'audio',
      originalFilename: sanitizeFilename(file.name),
      mimeType: sniffed.mimeType,
      bytes: buffer.byteLength,
      durationSeconds,
      uploadedBy: options.uploadedBy ?? null
    })
    .returning();

  return { asset };
}

/** Removes the stored bytes and the metadata row. */
export async function deleteAsset(asset: MediaAsset): Promise<void> {
  // Delete the object first; if that fails the row stays and the file is still
  // findable, which is recoverable. The reverse would orphan the bytes.
  const storage = await getStorage();
  await storage.delete(asset.storageKey);
  await getDb().delete(mediaAssets).where(eq(mediaAssets.id, asset.id));
}

/** Keeps the original name readable in the library without letting it near a path. */
function sanitizeFilename(name: string): string {
  return (
    name
      .replace(/[/\\]/g, '_')
      .replace(/[^\w.\- ]/g, '')
      .trim()
      .slice(0, 200) || 'upload'
  );
}
