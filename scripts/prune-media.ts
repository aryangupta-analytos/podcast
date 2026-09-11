/**
 * Finds stored files that no longer have a database row and offers to remove
 * them.
 *
 * Deleting through the admin panel removes both the row and the file, so this
 * should normally find nothing. Orphans appear when rows are removed directly
 * in SQL, or when an upload is interrupted after the bytes land but before the
 * row is written.
 *
 *   pnpm exec tsx scripts/prune-media.ts          # report only
 *   pnpm exec tsx scripts/prune-media.ts --delete # actually remove them
 *
 * Only the local storage driver can be walked from here. With S3, list the
 * bucket with your provider's tooling and compare against `storage_key`.
 */

import 'dotenv/config';

import { readdir, rm, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

import { closeDb, getDb } from '../src/server/db';
import { mediaAssets } from '../src/server/db/schema';
import { env } from '../src/server/env';
import { localStorageRoot } from '../src/server/storage/local';

const shouldDelete = process.argv.includes('--delete');

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

async function main() {
  if (env.storageDriver !== 'local') {
    console.log(
      '\nSTORAGE_DRIVER is not "local". This script only walks the local\n' +
        'storage directory. For S3, list the bucket and compare object keys\n' +
        'against the storage_key column.\n'
    );
    return;
  }

  const root = localStorageRoot();
  const files = await walk(root);
  // Storage keys always use forward slashes, whatever the platform.
  const keys = files.map((file) => relative(root, file).split(sep).join('/'));

  const known = new Set(
    (await getDb().select({ key: mediaAssets.storageKey }).from(mediaAssets)).map(
      (row) => row.key
    )
  );

  const orphans = keys.filter((key) => !known.has(key));

  console.log(`\n${files.length} files on disk, ${known.size} recorded in the database.`);

  if (orphans.length === 0) {
    console.log('No orphaned files. Nothing to do.\n');
    return;
  }

  let total = 0;
  console.log(`\n${orphans.length} orphaned file${orphans.length === 1 ? '' : 's'}:`);

  for (const key of orphans) {
    const info = await stat(join(root, key)).catch(() => null);
    const size = info?.size ?? 0;
    total += size;
    console.log(`  ${shouldDelete ? 'deleting' : '       '} ${key}  ${formatBytes(size)}`);
    if (shouldDelete) await rm(join(root, key), { force: true });
  }

  console.log(
    shouldDelete
      ? `\nRemoved ${orphans.length} files, freeing ${formatBytes(total)}.\n`
      : `\n${formatBytes(total)} could be freed. Re-run with --delete to remove them.\n`
  );
}

main()
  .catch((error) => {
    console.error('\nprune-media failed:', error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
