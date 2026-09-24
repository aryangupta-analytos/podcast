import {
  and,
  asc,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  lt,
  ne,
  or,
  sql,
  type SQL
} from 'drizzle-orm';

import type { Episode, EpisodeGuest, Paginated } from '../../lib/types';
import { getDb } from '../db';
import {
  episodePeople,
  episodes,
  people,
  siteSettings,
  type EpisodeRow,
  type NewEpisode
} from '../db/schema';
import { slugify, uniqueSlug } from '../slug';

/* ────────────────────────────────────────────────────────────────────────────
 * Mapping
 * ────────────────────────────────────────────────────────────────────────── */

export function toEpisode(row: EpisodeRow, guests: EpisodeGuest[] = []): Episode {
  return {
    id: row.id,
    title: row.title,
    published: row.publishDate.getTime(),
    description: row.description,
    duration: row.durationSeconds ?? 0,
    content: row.showNotes,
    episodeImage: row.thumbnailUrl ?? undefined,
    episodeNumber: row.episodeNumber != null ? String(row.episodeNumber) : undefined,
    episodeSlug: row.slug,
    episodeThumbnail: row.thumbnailUrl ?? undefined,
    season: row.season ?? undefined,
    audio: {
      src: row.audioUrl ?? '',
      type: row.audioMimeType
    },
    guests,
    links: {
      spotify: row.spotifyUrl ?? undefined,
      youtube: row.youtubeUrl ?? undefined,
      apple: row.appleUrl ?? undefined,
      other: row.otherUrl ?? undefined
    },
    status: row.status,
    isFeatured: row.isFeatured,
    seriesId: row.seriesId ?? undefined
  };
}

/**
 * Loads guests for a set of episodes in one query.
 *
 * The alternative — a query per episode — is the classic N+1 that makes a
 * listing page slow as the archive grows, so the list endpoints always batch.
 */
export async function guestsFor(episodeIds: string[]): Promise<Map<string, EpisodeGuest[]>> {
  const map = new Map<string, EpisodeGuest[]>();
  if (episodeIds.length === 0) return map;

  const rows = await getDb()
    .select({
      episodeId: episodePeople.episodeId,
      sortOrder: episodePeople.sortOrder,
      id: people.id,
      slug: people.slug,
      name: people.name,
      title: people.title,
      imageUrl: people.imageUrl,
      placeholder: people.placeholder,
      linkedin: people.linkedin,
      twitter: people.twitter,
      website: people.website
    })
    .from(episodePeople)
    .innerJoin(people, eq(people.id, episodePeople.personId))
    .where(inArray(episodePeople.episodeId, episodeIds))
    .orderBy(asc(episodePeople.sortOrder), asc(people.name));

  for (const row of rows) {
    const list = map.get(row.episodeId) ?? [];
    list.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      title: row.title,
      imageUrl: row.imageUrl,
      placeholder: row.placeholder,
      linkedin: row.linkedin,
      twitter: row.twitter,
      website: row.website
    });
    map.set(row.episodeId, list);
  }

  return map;
}

const PUBLISHED = eq(episodes.status, 'published');

/**
 * Published episodes are also hidden until their publish date passes, so an
 * episode can be scheduled by setting a future date.
 */
const LIVE: SQL = and(PUBLISHED, sql`${episodes.publishDate} <= now()`)!;

/** Manual `sortOrder` wins when set; otherwise newest first. */
const ARCHIVE_ORDER = [
  sql`${episodes.sortOrder} asc nulls last`,
  desc(episodes.publishDate)
];

/* ────────────────────────────────────────────────────────────────────────────
 * Public reads
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * One page of the public archive.
 *
 * Only ever loads `perPage` rows — the archive stays the same speed at episode
 * 20 and at episode 500.
 */
export async function getPublishedEpisodes({
  page = 1,
  perPage = 12,
  excludeId
}: { page?: number; perPage?: number; excludeId?: string } = {}): Promise<
  Paginated<Episode>
> {
  const db = getDb();
  const where = excludeId ? and(LIVE, ne(episodes.id, excludeId))! : LIVE;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(episodes)
      .where(where)
      .orderBy(...ARCHIVE_ORDER)
      .limit(perPage)
      .offset((page - 1) * perPage),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(episodes)
      .where(where)
  ]);

  const guests = await guestsFor(rows.map((r) => r.id));

  return {
    items: rows.map((row) => toEpisode(row, guests.get(row.id) ?? [])),
    page,
    perPage,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / perPage))
  };
}

/** The N most recent published episodes, for the homepage. */
export async function getLatestEpisodes(limit = 6, excludeId?: string): Promise<Episode[]> {
  const { items } = await getPublishedEpisodes({ page: 1, perPage: limit, excludeId });
  return items;
}

/** Live episodes that carry a YouTube link. */
const HAS_VIDEO: SQL = and(
  LIVE,
  isNotNull(episodes.youtubeUrl),
  ne(episodes.youtubeUrl, '')
)!;

/**
 * One page of episodes that have a video — the /videos archive and the
 * homepage "latest videos" row. Same cost profile as `getPublishedEpisodes`.
 */
export async function getEpisodesWithVideo({
  page = 1,
  perPage = 12
}: { page?: number; perPage?: number } = {}): Promise<Paginated<Episode>> {
  const db = getDb();

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(episodes)
      .where(HAS_VIDEO)
      .orderBy(desc(episodes.publishDate))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(episodes).where(HAS_VIDEO)
  ]);

  const guests = await guestsFor(rows.map((r) => r.id));

  return {
    items: rows.map((row) => toEpisode(row, guests.get(row.id) ?? [])),
    page,
    perPage,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / perPage))
  };
}

/** How many live episodes have a video — the header hides "Videos" at zero. */
export async function countVideos(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(episodes)
    .where(HAS_VIDEO);
  return row?.count ?? 0;
}

export async function getLatestVideos(limit = 4): Promise<Episode[]> {
  const { items } = await getEpisodesWithVideo({ page: 1, perPage: limit });
  return items;
}

/**
 * The episode the homepage highlights: whichever the owner pinned, falling
 * back to the newest published one so the section is never empty.
 */
export async function getFeaturedEpisode(): Promise<Episode | null> {
  const db = getDb();

  const pinnedId = (
    await db
      .select({ id: siteSettings.featuredEpisodeId })
      .from(siteSettings)
      .limit(1)
  )[0]?.id;

  if (pinnedId) {
    const found = await getEpisodeById(pinnedId);
    if (found && found.status === 'published') return found;
  }

  const rows = await db
    .select()
    .from(episodes)
    .where(and(LIVE, eq(episodes.isFeatured, true)))
    .orderBy(desc(episodes.publishDate))
    .limit(1);

  if (rows[0]) {
    const guests = await guestsFor([rows[0].id]);
    return toEpisode(rows[0], guests.get(rows[0].id) ?? []);
  }

  const latest = await getLatestEpisodes(1);
  return latest[0] ?? null;
}

/** Looks up a published episode by its public slug, or by episode number. */
export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const db = getDb();
  const asNumber = Number.parseInt(slug, 10);

  const match =
    /^\d+$/.test(slug) && Number.isFinite(asNumber)
      ? or(eq(episodes.slug, slug), eq(episodes.episodeNumber, asNumber))!
      : eq(episodes.slug, slug);

  const rows = await db
    .select()
    .from(episodes)
    .where(and(LIVE, match))
    // Episode numbers are not unique in the back catalogue, so a number
    // lookup resolves to the most recent episode carrying it.
    .orderBy(desc(episodes.publishDate))
    .limit(1);

  if (!rows[0]) return null;
  const guests = await guestsFor([rows[0].id]);
  return toEpisode(rows[0], guests.get(rows[0].id) ?? []);
}

/** Previous/next links on an episode page, by publish date. */
export async function getAdjacentEpisodes(episode: Episode) {
  const db = getDb();
  const at = new Date(episode.published);

  const [newer, older] = await Promise.all([
    db
      .select({ slug: episodes.slug, title: episodes.title })
      .from(episodes)
      .where(and(LIVE, gt(episodes.publishDate, at)))
      .orderBy(asc(episodes.publishDate))
      .limit(1),
    db
      .select({ slug: episodes.slug, title: episodes.title })
      .from(episodes)
      .where(and(LIVE, lt(episodes.publishDate, at)))
      .orderBy(desc(episodes.publishDate))
      .limit(1)
  ]);

  return { newer: newer[0] ?? null, older: older[0] ?? null };
}

/** Full-text-ish search across title and description, for the search dialog. */
export async function searchEpisodes(query: string, limit = 20): Promise<Episode[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const pattern = `%${trimmed.replace(/[%_\\]/g, '\\$&')}%`;

  const rows = await getDb()
    .select()
    .from(episodes)
    .where(
      and(
        LIVE,
        or(
          sql`${episodes.title} ilike ${pattern}`,
          sql`${episodes.description} ilike ${pattern}`
        )
      )
    )
    .orderBy(desc(episodes.publishDate))
    .limit(limit);

  const guests = await guestsFor(rows.map((r) => r.id));
  return rows.map((row) => toEpisode(row, guests.get(row.id) ?? []));
}

/** Every live episode, slug + date only — for the sitemap and the RSS feed. */
export async function getAllLiveEpisodesForFeed(): Promise<EpisodeRow[]> {
  return getDb()
    .select()
    .from(episodes)
    .where(LIVE)
    .orderBy(desc(episodes.publishDate));
}

/* ────────────────────────────────────────────────────────────────────────────
 * Admin reads and writes
 * ────────────────────────────────────────────────────────────────────────── */

export async function getEpisodeById(id: string): Promise<Episode | null> {
  const rows = await getDb().select().from(episodes).where(eq(episodes.id, id)).limit(1);
  if (!rows[0]) return null;
  const guests = await guestsFor([rows[0].id]);
  return toEpisode(rows[0], guests.get(rows[0].id) ?? []);
}

export async function getEpisodeRow(id: string): Promise<EpisodeRow | null> {
  const rows = await getDb().select().from(episodes).where(eq(episodes.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Admin listing — includes drafts, newest first, optionally filtered. */
export async function listEpisodesForAdmin({
  page = 1,
  perPage = 20,
  status,
  search
}: {
  page?: number;
  perPage?: number;
  status?: 'draft' | 'published' | 'unpublished';
  search?: string;
} = {}): Promise<Paginated<Episode>> {
  const db = getDb();
  const filters: SQL[] = [];

  if (status) filters.push(eq(episodes.status, status));
  if (search?.trim()) {
    const pattern = `%${search.trim().replace(/[%_\\]/g, '\\$&')}%`;
    filters.push(sql`${episodes.title} ilike ${pattern}`);
  }

  const where = filters.length ? and(...filters) : undefined;

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(episodes)
      .where(where)
      .orderBy(desc(episodes.publishDate), desc(episodes.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(episodes).where(where)
  ]);

  const guests = await guestsFor(rows.map((r) => r.id));

  return {
    items: rows.map((row) => toEpisode(row, guests.get(row.id) ?? [])),
    page,
    perPage,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / perPage))
  };
}

export async function getEpisodeCounts() {
  const rows = await getDb()
    .select({ status: episodes.status, count: sql<number>`count(*)::int` })
    .from(episodes)
    .groupBy(episodes.status);

  const counts = { draft: 0, published: 0, unpublished: 0, total: 0 };
  for (const row of rows) {
    counts[row.status] = row.count;
    counts.total += row.count;
  }
  return counts;
}

export interface EpisodeInput {
  title: string;
  slug?: string;
  description?: string;
  showNotes?: string;
  audioUrl?: string | null;
  audioMimeType?: string;
  audioBytes?: number | null;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  episodeNumber?: number | null;
  season?: number | null;
  publishDate?: Date;
  spotifyUrl?: string | null;
  youtubeUrl?: string | null;
  appleUrl?: string | null;
  otherUrl?: string | null;
  status?: 'draft' | 'published' | 'unpublished';
  isFeatured?: boolean;
  guestIds?: string[];
  seriesId?: string | null;
}

export async function createEpisode(input: EpisodeInput): Promise<Episode> {
  const db = getDb();

  const slug = await uniqueSlug(input.slug?.trim() || slugify(input.title), (candidate) =>
    slugExists(candidate)
  );

  const values: NewEpisode = {
    slug,
    title: input.title.trim(),
    description: input.description?.trim() ?? '',
    showNotes: input.showNotes ?? '',
    audioUrl: input.audioUrl ?? null,
    audioMimeType: input.audioMimeType ?? 'audio/mpeg',
    audioBytes: input.audioBytes ?? null,
    durationSeconds: input.durationSeconds ?? null,
    thumbnailUrl: input.thumbnailUrl ?? null,
    episodeNumber: input.episodeNumber ?? null,
    season: input.season ?? null,
    publishDate: input.publishDate ?? new Date(),
    spotifyUrl: input.spotifyUrl ?? null,
    youtubeUrl: input.youtubeUrl ?? null,
    appleUrl: input.appleUrl ?? null,
    otherUrl: input.otherUrl ?? null,
    status: input.status ?? 'draft',
    isFeatured: input.isFeatured ?? false,
    seriesId: input.seriesId ?? null
  };

  const [row] = await db.insert(episodes).values(values).returning();

  if (values.isFeatured) await clearOtherFeatured(row.id);
  await setEpisodeGuests(row.id, input.guestIds ?? []);

  return (await getEpisodeById(row.id))!;
}

export async function updateEpisode(
  id: string,
  input: Partial<EpisodeInput>
): Promise<Episode | null> {
  const db = getDb();
  const existing = await getEpisodeRow(id);
  if (!existing) return null;

  const patch: Partial<NewEpisode> = { updatedAt: new Date() };

  if (input.title !== undefined) patch.title = input.title.trim();
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.showNotes !== undefined) patch.showNotes = input.showNotes;
  if (input.audioUrl !== undefined) patch.audioUrl = input.audioUrl;
  if (input.audioMimeType !== undefined) patch.audioMimeType = input.audioMimeType;
  if (input.audioBytes !== undefined) patch.audioBytes = input.audioBytes;
  if (input.durationSeconds !== undefined) patch.durationSeconds = input.durationSeconds;
  if (input.thumbnailUrl !== undefined) patch.thumbnailUrl = input.thumbnailUrl;
  if (input.episodeNumber !== undefined) patch.episodeNumber = input.episodeNumber;
  if (input.season !== undefined) patch.season = input.season;
  if (input.publishDate !== undefined) patch.publishDate = input.publishDate;
  if (input.spotifyUrl !== undefined) patch.spotifyUrl = input.spotifyUrl;
  if (input.youtubeUrl !== undefined) patch.youtubeUrl = input.youtubeUrl;
  if (input.appleUrl !== undefined) patch.appleUrl = input.appleUrl;
  if (input.otherUrl !== undefined) patch.otherUrl = input.otherUrl;
  if (input.status !== undefined) patch.status = input.status;
  if (input.isFeatured !== undefined) patch.isFeatured = input.isFeatured;
  if (input.seriesId !== undefined) patch.seriesId = input.seriesId;

  // Changing the slug breaks existing links, so it only changes when the owner
  // edits the field explicitly — never as a side effect of retitling.
  if (input.slug !== undefined && input.slug.trim() && input.slug !== existing.slug) {
    patch.slug = await uniqueSlug(slugify(input.slug), (candidate) =>
      slugExists(candidate, id)
    );
  }

  await db.update(episodes).set(patch).where(eq(episodes.id, id));

  if (patch.isFeatured) await clearOtherFeatured(id);
  if (input.guestIds !== undefined) await setEpisodeGuests(id, input.guestIds);

  return getEpisodeById(id);
}

export async function deleteEpisode(id: string): Promise<void> {
  const db = getDb();
  // Clear the pin first so the settings row never points at a missing episode.
  await db
    .update(siteSettings)
    .set({ featuredEpisodeId: null })
    .where(eq(siteSettings.featuredEpisodeId, id));
  await db.delete(episodes).where(eq(episodes.id, id));
}

export async function setEpisodeStatus(
  id: string,
  status: 'draft' | 'published' | 'unpublished'
): Promise<void> {
  await getDb()
    .update(episodes)
    .set({ status, updatedAt: new Date() })
    .where(eq(episodes.id, id));
}

export async function setFeaturedEpisode(id: string | null): Promise<void> {
  const db = getDb();
  await db.update(episodes).set({ isFeatured: false }).where(eq(episodes.isFeatured, true));
  if (id) {
    await db.update(episodes).set({ isFeatured: true }).where(eq(episodes.id, id));
  }
  await db.update(siteSettings).set({ featuredEpisodeId: id }).where(eq(siteSettings.id, 1));
}

/** Moves an episode up or down in the archive ordering. */
export async function reorderEpisode(id: string, direction: 'up' | 'down'): Promise<void> {
  const db = getDb();
  const ordered = await db
    .select({ id: episodes.id })
    .from(episodes)
    .orderBy(...ARCHIVE_ORDER);

  const index = ordered.findIndex((row) => row.id === id);
  if (index === -1) return;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= ordered.length) return;

  const reordered = [...ordered];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Rewrite the whole ordering so positions stay dense and predictable.
  await Promise.all(
    reordered.map((row, position) =>
      db.update(episodes).set({ sortOrder: position }).where(eq(episodes.id, row.id))
    )
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Internals
 * ────────────────────────────────────────────────────────────────────────── */

async function slugExists(slug: string, exceptId?: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: episodes.id })
    .from(episodes)
    .where(exceptId ? and(eq(episodes.slug, slug), ne(episodes.id, exceptId)) : eq(episodes.slug, slug))
    .limit(1);
  return rows.length > 0;
}

async function clearOtherFeatured(keepId: string): Promise<void> {
  await getDb()
    .update(episodes)
    .set({ isFeatured: false })
    .where(and(eq(episodes.isFeatured, true), ne(episodes.id, keepId)));
}

async function setEpisodeGuests(episodeId: string, personIds: string[]): Promise<void> {
  const db = getDb();
  await db.delete(episodePeople).where(eq(episodePeople.episodeId, episodeId));
  if (personIds.length === 0) return;

  await db.insert(episodePeople).values(
    personIds.map((personId, index) => ({
      episodeId,
      personId,
      role: 'guest' as const,
      sortOrder: index
    }))
  );
}

/**
 * Headline numbers for the homepage: how many episodes are live, how many
 * different guests have appeared on them, and the year of the first one.
 * Three aggregate queries, none of which touch a row's content.
 */
export async function getShowStats(): Promise<{
  episodes: number;
  guests: number;
  since: number | null;
}> {
  const db = getDb();
  const live = and(eq(episodes.status, 'published'), sql`${episodes.publishDate} <= now()`);

  const [[episodeRow], [guestRow]] = await Promise.all([
    db
      .select({
        count: sql<number>`count(*)::int`,
        first: sql<Date | null>`min(${episodes.publishDate})`
      })
      .from(episodes)
      .where(live),
    db
      .select({ count: sql<number>`count(distinct ${episodePeople.personId})::int` })
      .from(episodePeople)
      .innerJoin(episodes, eq(episodes.id, episodePeople.episodeId))
      .innerJoin(people, eq(people.id, episodePeople.personId))
      .where(and(live, eq(people.kind, 'guest')))
  ]);

  const first = episodeRow?.first ? new Date(episodeRow.first) : null;
  return {
    episodes: episodeRow?.count ?? 0,
    guests: guestRow?.count ?? 0,
    since: first && !Number.isNaN(first.getTime()) ? first.getUTCFullYear() : null
  };
}
