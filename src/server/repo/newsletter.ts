import { desc, eq, isNull, sql } from 'drizzle-orm';

import type { Paginated } from '../../lib/types';
import { getDb } from '../db';
import { newsletterSubscribers, type NewsletterSubscriber } from '../db/schema';
import { env } from '../env';
import { sendToLeadsSheet } from '../leads-sheet';

/** Postgres error code for a unique-constraint violation. */
const UNIQUE_VIOLATION = '23505';

/**
 * Adds an address to the list. Returns whether a row was created; an address
 * that is already subscribed is left untouched and reported as `created:
 * false`. A previously unsubscribed address is resubscribed.
 */
export async function subscribe(
  email: string,
  source = 'site'
): Promise<{ created: boolean }> {
  const db = getDb();
  const clean = email.trim().slice(0, 320);

  try {
    await db.insert(newsletterSubscribers).values({ email: clean, source });
    await sendToLeadsSheet('podcast-newsletter', {
      email: clean,
      source: `podcast-${source}`,
      page_url: env.siteUrl
    });
    return { created: true };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code !== UNIQUE_VIOLATION) throw error;
  }

  await db
    .update(newsletterSubscribers)
    .set({ unsubscribedAt: null })
    .where(sql`lower(${newsletterSubscribers.email}) = lower(${clean})`);

  return { created: false };
}

export async function listSubscribers({
  page = 1,
  perPage = 50
}: { page?: number; perPage?: number } = {}): Promise<
  Paginated<NewsletterSubscriber>
> {
  const db = getDb();

  const [rows, [{ count }]] = await Promise.all([
    db
      .select()
      .from(newsletterSubscribers)
      .orderBy(desc(newsletterSubscribers.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage),
    db.select({ count: sql<number>`count(*)::int` }).from(newsletterSubscribers)
  ]);

  return {
    items: rows,
    page,
    perPage,
    total: count,
    totalPages: Math.max(1, Math.ceil(count / perPage))
  };
}

/**
 * Every active address, for the CSV export.
 *
 * This is deliberately unpaginated: an export is only useful whole. It selects
 * two narrow columns and is only reachable from the admin panel.
 */
export async function listAllSubscribersForExport(): Promise<
  Array<{ email: string; createdAt: Date }>
> {
  return getDb()
    .select({
      email: newsletterSubscribers.email,
      createdAt: newsletterSubscribers.createdAt
    })
    .from(newsletterSubscribers)
    .where(isNull(newsletterSubscribers.unsubscribedAt))
    .orderBy(desc(newsletterSubscribers.createdAt));
}

export async function countSubscribers(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(newsletterSubscribers)
    .where(isNull(newsletterSubscribers.unsubscribedAt));
  return row?.count ?? 0;
}

export async function deleteSubscriber(id: string): Promise<void> {
  await getDb().delete(newsletterSubscribers).where(eq(newsletterSubscribers.id, id));
}
