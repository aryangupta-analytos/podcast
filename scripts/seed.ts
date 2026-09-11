/**
 * One-time migration: pulls the legacy Wix site's content and the show's
 * Podbean feed into the CMS database.
 *
 * Safe to re-run. Everything is matched on a natural key (a person's name, an
 * episode's feed GUID, a link's URL), so a second run updates rather than
 * duplicates — and never clobbers an edit the owner has since made in the
 * admin panel unless --force is passed.
 *
 *   pnpm db:seed            # add what is missing, leave existing rows alone
 *   pnpm db:seed --force    # also overwrite site settings and people
 */

import 'dotenv/config';

import { and, eq, sql } from 'drizzle-orm';

import { closeDb, getDb } from '../src/server/db';
import {
  episodePeople,
  episodes,
  links,
  mediaAssets,
  people
} from '../src/server/db/schema';
import { createPerson, findOrCreateGuest, updatePerson } from '../src/server/repo/people';
import { createEpisode, updateEpisode } from '../src/server/repo/episodes';
import { getSettings, updateSettings } from '../src/server/repo/settings';
import { uploadImage } from '../src/server/storage';
import {
  ABOUT_BODY,
  CONTACT,
  HERO,
  IMAGES,
  LINKS,
  PEOPLE,
  PODBEAN_FEED,
  parseGuestFromTitle,
  SHOW_DESCRIPTION,
  SHOW_TITLE,
  TAGLINE
} from './lib/migrate-content';
import { fetchFeed } from './lib/rss-import';

const force = process.argv.includes('--force');

const log = (message: string) => console.log(`  ${message}`);
const step = (message: string) => console.log(`\n▸ ${message}`);

/**
 * Downloads a remote image and stores it through the normal media pipeline, so
 * migrated images are optimized, EXIF-stripped and recorded exactly like ones
 * the owner uploads later. Returns null if the source is unreachable — a
 * missing photo must not abort the whole migration.
 */
async function importImage(url: string, filename: string): Promise<string | null> {
  // Re-running the migration must not pile up duplicate copies of the same
  // photo. The filenames here are deterministic, so an existing asset with the
  // same name is the same image.
  const existing = await getDb()
    .select({ url: mediaAssets.url })
    .from(mediaAssets)
    .where(eq(mediaAssets.originalFilename, filename))
    .limit(1);

  if (existing[0] && !force) {
    log(`· ${filename} already imported`);
    return existing[0].url;
  }

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
    log(`✓ ${filename} → ${asset.url} (${Math.round(asset.bytes / 1024)} KB)`);
    return asset.url;
  } catch (error) {
    log(`✗ ${filename}: ${(error as Error).message}`);
    return null;
  }
}

async function main() {
  console.log('\nMigrating svtechpodcast content\n' + '─'.repeat(48));

  const db = getDb();

  /* ── Images ──────────────────────────────────────────────────────────── */

  step('Importing images from the Wix site');
  const imageUrls: Partial<Record<keyof typeof IMAGES, string>> = {};

  for (const [key, url] of Object.entries(IMAGES) as Array<
    [keyof typeof IMAGES, string]
  >) {
    const stored = await importImage(url, `${key}.jpg`);
    if (stored) imageUrls[key] = stored;
  }

  /* ── Site settings ───────────────────────────────────────────────────── */

  step('Writing site settings');
  const existing = await getSettings();
  const settingsAreDefault = existing.heroTitle === '' && existing.tagline === '';

  if (settingsAreDefault || force) {
    await updateSettings({
      showTitle: SHOW_TITLE,
      tagline: TAGLINE,
      description: SHOW_DESCRIPTION,
      artworkUrl: imageUrls.artwork ?? existing.artworkUrl,

      heroEyebrow: HERO.eyebrow,
      heroTitle: HERO.title,
      heroDescription: HERO.description,
      heroImageUrl: imageUrls.logo ?? existing.heroImageUrl,
      heroCtaText: HERO.ctaText,
      heroCtaUrl: HERO.ctaUrl,
      heroSecondaryCtaText: HERO.secondaryCtaText,
      heroSecondaryCtaUrl: HERO.secondaryCtaUrl,

      featuredHeading: 'Featured Episode',
      latestHeading: 'Latest Episodes',
      teamHeading: 'The Team',
      guestsHeading: 'Recent Guests',
      aboutHeading: 'About The Show',

      aboutTitle: 'About the show',
      aboutBody: ABOUT_BODY,

      contactHeading: 'Contact us',
      contactBody: CONTACT.body,
      contactEmail: CONTACT.email,
      contactPhone: CONTACT.phone,

      footerText: `© ${new Date().getFullYear()} ${SHOW_TITLE}`,

      metaTitle: `${SHOW_TITLE} — ${TAGLINE}`,
      metaDescription: SHOW_DESCRIPTION,
      ogImageUrl: imageUrls.artwork ?? existing.ogImageUrl
    });
    log(force ? '✓ settings overwritten (--force)' : '✓ settings written');
  } else {
    log('· settings already customised — left alone (use --force to overwrite)');
  }

  /* ── Links ───────────────────────────────────────────────────────────── */

  step('Writing platform and social links');
  for (const [index, link] of LINKS.entries()) {
    // Matched on group + URL: the same YouTube channel is legitimately both a
    // listening platform and a social profile.
    const match = await db
      .select({ id: links.id })
      .from(links)
      .where(and(eq(links.group, link.group), eq(links.url, link.url)))
      .limit(1);

    if (match[0]) {
      log(`· ${link.group}/${link.label} already present`);
      continue;
    }

    await db.insert(links).values({ ...link, sortOrder: index });
    log(`✓ ${link.group}/${link.label}`);
  }

  /* ── People ──────────────────────────────────────────────────────────── */

  step('Writing hosts and team');
  for (const [index, person] of PEOPLE.entries()) {
    const found = await db
      .select()
      .from(people)
      .where(sql`lower(${people.name}) = ${person.name.toLowerCase()}`)
      .limit(1);

    const imageUrl = person.imageKey ? (imageUrls[person.imageKey] ?? null) : null;

    if (found[0]) {
      if (force) {
        await updatePerson(found[0].id, {
          title: person.title,
          kind: person.kind,
          linkedin: person.linkedin ?? null,
          sortOrder: index,
          ...(imageUrl ? { imageUrl } : {})
        });
        log(`✓ ${person.name} updated`);
      } else {
        log(`· ${person.name} already present`);
      }
      continue;
    }

    await createPerson({
      name: person.name,
      title: person.title,
      kind: person.kind,
      linkedin: person.linkedin ?? null,
      imageUrl,
      bio: person.bio ?? null,
      sortOrder: index
    });
    log(`✓ ${person.name}`);
  }

  /* ── Episodes ────────────────────────────────────────────────────────── */

  step(`Importing episodes from ${PODBEAN_FEED}`);
  const feed = await fetchFeed(PODBEAN_FEED);
  log(`found ${feed.episodes.length} episodes in the feed`);

  // Fall back to the feed's own artwork if the Wix cover did not import.
  const defaultThumbnail =
    imageUrls.artwork ??
    (feed.imageUrl ? await importImage(feed.imageUrl, 'feed-artwork.jpg') : null);

  if (!imageUrls.artwork && defaultThumbnail) {
    await updateSettings({ artworkUrl: defaultThumbnail });
  }

  let created = 0;
  let skipped = 0;

  // Oldest first, so episode ordering and slug suffixes are deterministic.
  const ordered = [...feed.episodes].sort(
    (a, b) => a.publishDate.getTime() - b.publishDate.getTime()
  );

  for (const item of ordered) {
    // `otherUrl` holds the original Podbean page and doubles as the import key.
    const already = item.link
      ? await db
          .select({ id: episodes.id })
          .from(episodes)
          .where(eq(episodes.otherUrl, item.link))
          .limit(1)
      : [];

    if (already[0]) {
      skipped++;
      continue;
    }

    const guest = parseGuestFromTitle(item.title);
    const guestIds: string[] = [];

    if (guest) {
      const person = await findOrCreateGuest(guest.name, { title: guest.title });
      guestIds.push(person.id);
    }

    const episode = await createEpisode({
      title: item.title,
      description: item.description,
      showNotes: item.showNotes,
      // Audio stays on Podbean's CDN: the files already have a fast, free home
      // and re-hosting them would buy nothing. New episodes upload to our own
      // storage.
      audioUrl: item.audioUrl,
      audioMimeType: item.audioMimeType,
      audioBytes: item.audioBytes,
      durationSeconds: item.durationSeconds,
      thumbnailUrl: item.imageUrl ?? defaultThumbnail,
      episodeNumber: item.episodeNumber,
      season: item.season,
      publishDate: item.publishDate,
      otherUrl: item.link,
      status: 'published',
      guestIds
    });

    created++;
    log(
      `✓ ${episode.episodeNumber ? `#${episode.episodeNumber} ` : ''}${episode.title.slice(0, 60)}` +
        (guest ? `  [guest: ${guest.name}]` : '')
    );
  }

  log(`${created} imported, ${skipped} already present`);

  /* ── Featured episode ────────────────────────────────────────────────── */

  step('Setting the featured episode');
  const settings = await getSettings();

  if (!settings.featuredEpisodeId || force) {
    const newest = await db
      .select({ id: episodes.id, title: episodes.title })
      .from(episodes)
      .where(eq(episodes.status, 'published'))
      .orderBy(sql`${episodes.publishDate} desc`)
      .limit(1);

    if (newest[0]) {
      await db.update(episodes).set({ isFeatured: false });
      await db
        .update(episodes)
        .set({ isFeatured: true })
        .where(eq(episodes.id, newest[0].id));
      await updateSettings({ featuredEpisodeId: newest[0].id });
      log(`✓ ${newest[0].title.slice(0, 60)}`);
    }
  } else {
    log('· a featured episode is already set');
  }

  /* ── Summary ─────────────────────────────────────────────────────────── */

  const [counts] = await db
    .select({
      episodes: sql<number>`(select count(*) from ${episodes})::int`,
      people: sql<number>`(select count(*) from ${people})::int`,
      guests: sql<number>`(select count(*) from ${people} where kind = 'guest')::int`,
      credits: sql<number>`(select count(*) from ${episodePeople})::int`,
      links: sql<number>`(select count(*) from ${links})::int`
    })
    .from(sql`(select 1) as x`);

  console.log('\n' + '─'.repeat(48));
  console.log(`Episodes:      ${counts.episodes}`);
  console.log(`People:        ${counts.people} (${counts.guests} guests)`);
  console.log(`Episode-guest: ${counts.credits} links`);
  console.log(`Links:         ${counts.links}`);
  console.log('\nDone. Create an admin account with:  pnpm admin:create\n');
}

main()
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
