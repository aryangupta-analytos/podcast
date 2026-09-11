import { asc, eq } from 'drizzle-orm';

import type { Show } from '../../lib/types';
import { getDb } from '../db';
import { links, siteSettings, type LinkRow, type SiteSettings } from '../db/schema';
import { env } from '../env';

/**
 * Site settings and links are read on literally every page render, so they are
 * memoised for a short window. The window is small enough that an admin save
 * shows up almost immediately, and the cache is cleared explicitly on write so
 * the owner never has to wonder whether their edit took.
 */
const CACHE_MS = 5_000;

let settingsCache: { value: SiteSettings; at: number } | null = null;
let linksCache: { value: LinkRow[]; at: number } | null = null;

export function invalidateSettingsCache(): void {
  settingsCache = null;
  linksCache = null;
}

/** The singleton settings row, created on first read if the table is empty. */
export async function getSettings(): Promise<SiteSettings> {
  if (settingsCache && Date.now() - settingsCache.at < CACHE_MS) {
    return settingsCache.value;
  }

  const db = getDb();
  let rows = await db.select().from(siteSettings).where(eq(siteSettings.id, 1)).limit(1);

  if (!rows[0]) {
    rows = await db.insert(siteSettings).values({ id: 1 }).returning();
  }

  settingsCache = { value: rows[0], at: Date.now() };
  return rows[0];
}

export async function updateSettings(
  patch: Partial<Omit<SiteSettings, 'id'>>
): Promise<SiteSettings> {
  const db = getDb();
  await getSettings(); // guarantees the row exists

  const [row] = await db
    .update(siteSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(siteSettings.id, 1))
    .returning();

  invalidateSettingsCache();
  return row;
}

/** Show identity in the shape the vendored Starpod components expect. */
export async function getShowInfo(): Promise<Show> {
  const settings = await getSettings();
  return {
    title: settings.showTitle,
    description: settings.description,
    image: settings.artworkUrl ?? '/artwork-placeholder.svg',
    link: env.siteUrl
  };
}

/* ────────────────────────────────────────────────────────────────────────────
 * Links
 * ────────────────────────────────────────────────────────────────────────── */

export type LinkGroup = 'platform' | 'social' | 'nav';

async function allLinks(): Promise<LinkRow[]> {
  if (linksCache && Date.now() - linksCache.at < CACHE_MS) return linksCache.value;

  const rows = await getDb()
    .select()
    .from(links)
    .orderBy(asc(links.group), asc(links.sortOrder));

  linksCache = { value: rows, at: Date.now() };
  return rows;
}

export async function getLinks(
  group: LinkGroup,
  { includeHidden = false }: { includeHidden?: boolean } = {}
): Promise<LinkRow[]> {
  const rows = await allLinks();
  return rows.filter((row) => row.group === group && (includeHidden || row.isVisible));
}

/** Platform links keyed by name — how the Platforms component consumes them. */
export async function getPlatforms(): Promise<Record<string, string>> {
  const rows = await getLinks('platform');
  return Object.fromEntries(rows.map((row) => [row.platform, row.url]));
}

export async function listAllLinks(): Promise<LinkRow[]> {
  return allLinks();
}

export async function createLink(input: {
  group: LinkGroup;
  platform: string;
  label: string;
  url: string;
  sortOrder?: number;
  isVisible?: boolean;
}): Promise<LinkRow> {
  const [row] = await getDb()
    .insert(links)
    .values({
      group: input.group,
      platform: input.platform,
      label: input.label,
      url: input.url,
      sortOrder: input.sortOrder ?? 0,
      isVisible: input.isVisible ?? true
    })
    .returning();

  invalidateSettingsCache();
  return row;
}

export async function updateLink(
  id: string,
  patch: Partial<Omit<LinkRow, 'id'>>
): Promise<void> {
  await getDb().update(links).set(patch).where(eq(links.id, id));
  invalidateSettingsCache();
}

export async function deleteLink(id: string): Promise<void> {
  await getDb().delete(links).where(eq(links.id, id));
  invalidateSettingsCache();
}
