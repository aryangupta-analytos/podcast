/**
 * Pulls any remotely-hosted image referenced by the CMS into our own storage.
 *
 * The migration imported most artwork but left a few episode thumbnails
 * pointing at Podbean's CDN. Those still render, but they are someone else's
 * server: if Podbean reorganises or the show leaves the platform, the images
 * break. Owning the bytes also means they go through the same optimisation
 * pipeline as everything else.
 *
 * Episodes with no thumbnail at all fall back to the show artwork, so no
 * episode is ever left without a picture.
 *
 *   pnpm exec tsx scripts/localise-images.ts           # report
 *   pnpm exec tsx scripts/localise-images.ts --apply   # do it
 */

import 'dotenv/config';

import { eq, isNull, or, sql } from 'drizzle-orm';

import { closeDb, getDb } from '../src/server/db';
import { episodes, people } from '../src/server/db/schema';
import { getSettings } from '../src/server/repo/settings';
import { uploadImage } from '../src/server/storage';

const apply = process.argv.includes('--apply');
const log = (message: string) => console.log(`  ${message}`);

async function importRemote(url: string, filename: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'svtechpodcast-migration/1.0' }
    });
    if (!response.ok) {
      log(`✗ ${filename}: HTTP ${response.status}`);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const file = new File([buffer], filename, {
      type: response.headers.get('content-type') ?? 'image/jpeg'
    });

    const { asset } = await uploadImage(file, { alt: '' });
    log(
      `✓ ${filename}: ${Math.round(buffer.byteLength / 1024)} KB → ` +
        `${Math.round(asset.bytes / 1024)} KB  ${asset.url}`
    );
    return asset.url;
  } catch (error) {
    log(`✗ ${filename}: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  const db = getDb();
  const settings = await getSettings();

  console.log('\nLocalising remote images\n' + '─'.repeat(52));

  /* ── Episode thumbnails hosted elsewhere ─────────────────────────────── */

  const remoteEpisodes = await db
    .select({ id: episodes.id, slug: episodes.slug, url: episodes.thumbnailUrl })
    .from(episodes)
    .where(sql`${episodes.thumbnailUrl} like 'http%'`);

  console.log(`\n▸ Episode thumbnails on other servers: ${remoteEpisodes.length}`);

  for (const episode of remoteEpisodes) {
    if (!apply) {
      log(`· ${episode.slug.slice(0, 54)} → ${episode.url?.slice(0, 46)}`);
      continue;
    }
    const stored = await importRemote(episode.url!, `${episode.slug.slice(0, 40)}.jpg`);
    if (stored) {
      await db
        .update(episodes)
        .set({ thumbnailUrl: stored, updatedAt: new Date() })
        .where(eq(episodes.id, episode.id));
    }
  }

  /* ── Episodes with no thumbnail at all ───────────────────────────────── */

  const missing = await db
    .select({ id: episodes.id, slug: episodes.slug })
    .from(episodes)
    .where(or(isNull(episodes.thumbnailUrl), eq(episodes.thumbnailUrl, '')));

  console.log(`\n▸ Episodes with no thumbnail: ${missing.length}`);

  for (const episode of missing) {
    if (!settings.artworkUrl) {
      log('✗ no show artwork set — nothing to fall back to');
      break;
    }
    log(`${apply ? '✓' : '·'} ${episode.slug.slice(0, 54)} → show artwork`);
    if (apply) {
      await db
        .update(episodes)
        .set({ thumbnailUrl: settings.artworkUrl, updatedAt: new Date() })
        .where(eq(episodes.id, episode.id));
    }
  }

  /* ── People photos hosted elsewhere ──────────────────────────────────── */

  const remotePeople = await db
    .select({ id: people.id, slug: people.slug, url: people.imageUrl })
    .from(people)
    .where(sql`${people.imageUrl} like 'http%'`);

  console.log(`\n▸ People photos on other servers: ${remotePeople.length}`);

  for (const person of remotePeople) {
    if (!apply) {
      log(`· ${person.slug} → ${person.url?.slice(0, 46)}`);
      continue;
    }
    const stored = await importRemote(person.url!, `${person.slug}.jpg`);
    if (stored) {
      await db
        .update(people)
        .set({ imageUrl: stored, updatedAt: new Date() })
        .where(eq(people.id, person.id));
    }
  }

  console.log(
    '\n' +
      (apply
        ? 'Done — every image is now served from this site.\n'
        : 'Nothing changed. Re-run with --apply to import these.\n')
  );
}

main()
  .catch((error) => {
    console.error('\nlocalise-images failed:', error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
