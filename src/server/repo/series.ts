import { and, asc, desc, eq, ne, sql } from 'drizzle-orm';

import type { Episode } from '../../lib/types';
import { slugify, uniqueSlug } from '../slug';
import { getDb } from '../db';
import { episodes, series, type Series } from '../db/schema';
import { guestsFor, toEpisode } from './episodes';

export interface SeriesInput {
  name: string;
  slug?: string;
  tagline?: string;
  description?: string;
  accent?: number;
  imageUrl?: string | null;
  ctaText?: string;
  isVisible?: boolean;
}

export async function listSeries({ includeHidden = false } = {}): Promise<Series[]> {
  return getDb()
    .select()
    .from(series)
    .where(includeHidden ? undefined : eq(series.isVisible, true))
    .orderBy(asc(series.sortOrder), asc(series.name));
}

export async function getSeriesBySlug(slug: string): Promise<Series | null> {
  const rows = await getDb().select().from(series).where(eq(series.slug, slug)).limit(1);
  return rows[0] ?? null;
}

export async function getSeriesById(id: string): Promise<Series | null> {
  const rows = await getDb().select().from(series).where(eq(series.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Live episode count per series, for the cards. One grouped query. */
export async function countEpisodesBySeries(): Promise<Map<string, number>> {
  const rows = await getDb()
    .select({ seriesId: episodes.seriesId, count: sql<number>`count(*)::int` })
    .from(episodes)
    .where(and(eq(episodes.status, 'published'), sql`${episodes.publishDate} <= now()`))
    .groupBy(episodes.seriesId);
  return new Map(rows.filter((r) => r.seriesId).map((r) => [r.seriesId!, r.count]));
}

export async function getEpisodesForSeries(seriesId: string, limit = 24): Promise<Episode[]> {
  const rows = await getDb()
    .select()
    .from(episodes)
    .where(
      and(
        eq(episodes.seriesId, seriesId),
        eq(episodes.status, 'published'),
        sql`${episodes.publishDate} <= now()`
      )
    )
    .orderBy(desc(episodes.publishDate))
    .limit(limit);
  const guests = await guestsFor(rows.map((r) => r.id));
  return rows.map((row) => toEpisode(row, guests.get(row.id) ?? []));
}

async function slugExists(slug: string, exceptId?: string): Promise<boolean> {
  const rows = await getDb()
    .select({ id: series.id })
    .from(series)
    .where(exceptId ? and(eq(series.slug, slug), ne(series.id, exceptId)) : eq(series.slug, slug))
    .limit(1);
  return rows.length > 0;
}

const clampAccent = (n: number | undefined) => Math.min(4, Math.max(1, n ?? 1));

export async function createSeries(input: SeriesInput): Promise<Series> {
  const db = getDb();
  const slug = await uniqueSlug(slugify(input.slug?.trim() || input.name), (c) => slugExists(c));
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(series);
  const [row] = await db
    .insert(series)
    .values({
      slug,
      name: input.name.trim(),
      tagline: input.tagline?.trim() ?? '',
      description: input.description ?? '',
      accent: clampAccent(input.accent),
      imageUrl: input.imageUrl ?? null,
      ctaText: input.ctaText?.trim() ?? 'Be a guest on this series',
      isVisible: input.isVisible ?? true,
      sortOrder: count
    })
    .returning();
  return row;
}

export async function updateSeries(id: string, input: Partial<SeriesInput>): Promise<void> {
  const patch: Partial<typeof series.$inferInsert> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name.trim();
  if (input.tagline !== undefined) patch.tagline = input.tagline.trim();
  if (input.description !== undefined) patch.description = input.description;
  if (input.accent !== undefined) patch.accent = clampAccent(input.accent);
  if (input.imageUrl !== undefined) patch.imageUrl = input.imageUrl;
  if (input.ctaText !== undefined) patch.ctaText = input.ctaText.trim();
  if (input.isVisible !== undefined) patch.isVisible = input.isVisible;
  if (input.slug !== undefined && input.slug.trim()) {
    patch.slug = await uniqueSlug(slugify(input.slug), (c) => slugExists(c, id));
  }
  await getDb().update(series).set(patch).where(eq(series.id, id));
}

export async function deleteSeries(id: string): Promise<void> {
  await getDb().delete(series).where(eq(series.id, id));
}

export async function reorderSeries(id: string, direction: 'up' | 'down'): Promise<void> {
  const all = await listSeries({ includeHidden: true });
  const i = all.findIndex((s) => s.id === id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  const db = getDb();
  await Promise.all(all.map((s, n) => db.update(series).set({ sortOrder: n }).where(eq(series.id, s.id))));
}
