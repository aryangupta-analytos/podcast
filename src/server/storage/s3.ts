import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env } from '../env';
import type { PutOptions, StorageDriver, StoredFile } from './types';

/**
 * Any S3-compatible bucket: Cloudflare R2, AWS S3, Supabase Storage,
 * Backblaze B2, MinIO. Uses multipart upload so large podcast audio does not
 * have to fit in one request.
 */
export function createS3Driver(): StorageDriver {
  const { bucket, region, endpoint, accessKeyId, secretAccessKey, publicUrl } =
    env.s3;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      '[storage] STORAGE_DRIVER=s3 requires S3_BUCKET, S3_ACCESS_KEY_ID and ' +
        'S3_SECRET_ACCESS_KEY. See .env.example.'
    );
  }

  const client = new S3Client({
    region,
    ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    credentials: { accessKeyId, secretAccessKey }
  });

  const base = (publicUrl ?? `https://${bucket}.s3.${region}.amazonaws.com`).replace(
    /\/+$/,
    ''
  );

  return {
    name: 's3',

    async put({
      key,
      body,
      mimeType,
      cacheControl
    }: PutOptions): Promise<StoredFile> {
      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: mimeType,
          // Uploaded media is content-addressed, so it never changes under a
          // given key and can be cached forever.
          CacheControl: cacheControl ?? 'public, max-age=31536000, immutable'
        }
      });

      await upload.done();

      return { key, url: `${base}/${key}`, bytes: body.byteLength, mimeType };
    },

    async delete(key: string): Promise<void> {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },

    urlFor(key: string): string {
      return `${base}/${key}`;
    },

    /**
     * A pre-signed PUT the browser uses to send the bytes straight to the
     * bucket.
     *
     * This is what makes large audio uploads possible on a serverless host:
     * a platform like Vercel caps a function's request body at a few
     * megabytes, so a 100 MB episode can never travel through the API route.
     * Going direct also means the episode is not paid for twice in bandwidth.
     */
    async presignPut({ key, contentType }) {
      const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable'
      });

      const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

      return {
        uploadUrl,
        // These must match the signed command exactly or S3 rejects the PUT.
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable'
        },
        key,
        publicUrl: `${base}/${key}`
      };
    },

    async headObject(key: string) {
      try {
        const result = await client.send(
          new HeadObjectCommand({ Bucket: bucket, Key: key })
        );
        return {
          bytes: Number(result.ContentLength ?? 0),
          contentType: result.ContentType
        };
      } catch {
        return null;
      }
    }
  };
}
