import { desc, eq, sql } from 'drizzle-orm';

import { getDb } from '../db';
import { contactMessages, type ContactMessage } from '../db/schema';
import { env } from '../env';

export async function saveContactMessage(input: {
  name: string;
  email: string;
  message: string;
}): Promise<ContactMessage> {
  const [row] = await getDb()
    .insert(contactMessages)
    .values({
      name: input.name.trim().slice(0, 200),
      email: input.email.trim().slice(0, 320),
      message: input.message.trim().slice(0, 5000)
    })
    .returning();

  // Optional notification. A webhook failure must never fail the submission —
  // the message is already safely stored and visible in the admin panel.
  const webhook = env.discordWebhook;
  if (webhook) {
    void fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `**New contact message**\nFrom: ${row.name} <${row.email}>\n\n${row.message}`.slice(
          0,
          1900
        )
      })
    }).catch(() => {});
  }

  return row;
}

export async function listContactMessages(limit = 100): Promise<ContactMessage[]> {
  return getDb()
    .select()
    .from(contactMessages)
    .orderBy(desc(contactMessages.createdAt))
    .limit(limit);
}

export async function countUnreadMessages(): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`count(*)::int` })
    .from(contactMessages)
    .where(eq(contactMessages.isRead, false));
  return row?.count ?? 0;
}

export async function markMessageRead(id: string, isRead = true): Promise<void> {
  await getDb().update(contactMessages).set({ isRead }).where(eq(contactMessages.id, id));
}

export async function deleteContactMessage(id: string): Promise<void> {
  await getDb().delete(contactMessages).where(eq(contactMessages.id, id));
}
