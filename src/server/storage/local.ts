import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';

import { env } from '../env';
import type { PutOptions, StorageDriver, StoredFile } from './types';

/**
 * Writes uploads to a directory on disk and serves them from `/media/<key>`
 * (see src/pages/media/[...key].ts).
 *
 * Intended for local development and single-server deployments. On a
 * serverless host the filesystem is ephemeral, so production should set
 * STORAGE_DRIVER=s3.
 */
export function createLocalDriver(): StorageDriver {
  const root = resolve(process.cwd(), env.storageLocalDir);

  /**
   * Resolves a key to an absolute path, refusing anything that escapes the
   * storage root. Keys are generated server-side, but path traversal is cheap
   * to rule out and expensive to discover later.
   */
  function pathFor(key: string): string {
    const target = resolve(root, normalize(key));
    if (target !== root && !target.startsWith(root + sep)) {
      throw new Error(`[storage] Refusing key outside the storage root: ${key}`);
    }
    return target;
  }

  return {
    name: 'local',

    async put({ key, body, mimeType }: PutOptions): Promise<StoredFile> {
      const target = pathFor(key);
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, body);

      return {
        key,
        url: `/media/${key}`,
        bytes: body.byteLength,
        mimeType
      };
    },

    async delete(key: string): Promise<void> {
      await rm(pathFor(key), { force: true });
    },

    urlFor(key: string): string {
      return `/media/${key}`;
    }
  };
}

export function localStorageRoot(): string {
  return resolve(process.cwd(), env.storageLocalDir);
}

export { join };
