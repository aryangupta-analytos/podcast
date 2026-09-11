import { and, desc, eq, sql } from 'drizzle-orm';

import type { Paginated } from '../../lib/types';
import { getDb } from '../db';
import { mediaAssets, type MediaAsset } from '../db/schema';

export async function listMedia({
  kind,
  page = 1,
  perPage = 40
}: {
  kind?: 'image' | 'audio';
  page?: number;
  perPage?: number;
} = {}): Promise<Paginated<MediaAsset>> {
  const db = getDb();
  const where = kind ? eq(mediaAssets.kind, kind) : undefined;

  const [items, [{ count }]] = await Promise.all([
    db
      .select()
      .from(mediaAssets)
      .where(where)
      .orderBy(desc(mediaAssets.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(mediaAssets).where(where)
  ]);

  return {
    items,
    page,
    perPage,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / perPage))
  };
}

export async function getMediaById(id: string): Promise<MediaAsset | null> {
  const rows = await getDb()
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getMediaByUrl(url: string): Promise<MediaAsset | null> {
  const rows = await getDb()
    .select()
    .from(mediaAssets)
    .where(eq(mediaAssets.url, url))
    .limit(1);
  return rows[0] ?? null;
}

export async function updateMediaAlt(id: string, alt: string): Promise<void> {
  await getDb()
    .update(mediaAssets)
    .set({ alt: alt.slice(0, 300) })
    .where(eq(mediaAssets.id, id));
}

export async function getMediaStats() {
  const rows = await getDb()
    .select({
      kind: mediaAssets.kind,
      count: sql<number>`count(*)::int`,
      bytes: sql<number>`coalesce(sum(${mediaAssets.bytes}), 0)::bigint`
    })
    .from(mediaAssets)
    .groupBy(mediaAssets.kind);

  const stats = {
    image: { count: 0, bytes: 0 },
    audio: { count: 0, bytes: 0 }
  };
  for (const row of rows) {
    stats[row.kind] = { count: row.count, bytes: Number(row.bytes) };
  }
  return stats;
}

export { and };
