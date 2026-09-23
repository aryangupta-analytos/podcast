import { env } from './env';

/**
 * Copies a lead (contact message, newsletter signup) into the team's Google
 * Sheet through its Apps Script web app. The database is the system of record;
 * this is the copy the team watches, so a failure here never fails the form.
 *
 * Awaited with a timeout rather than fire-and-forget: a serverless function
 * can be frozen the moment its response is sent, which would drop the request.
 */
export async function sendToLeadsSheet(
  product: 'podcast' | 'podcast-newsletter',
  fields: Record<string, string>
): Promise<void> {
  const url = env.leadsWebhookUrl;
  const secret = env.leadsWebhookSecret;
  if (!url || !secret) return;

  try {
    await fetch(url, {
      method: 'POST',
      // text/plain: Apps Script parses the JSON body itself.
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ secret, product, ...fields }),
      redirect: 'follow',
      signal: AbortSignal.timeout(8000)
    });
  } catch {
    // Stored in the database and visible in the admin either way.
  }
}
