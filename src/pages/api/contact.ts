import type { APIRoute } from 'astro';

import { jsonError } from '../../lib/api-errors';
import { saveContactMessage } from '../../server/repo/contact';

/** Rough per-IP throttle so the form cannot be used to flood the inbox. */
const recent = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 3;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);

  // Keep the map from growing without bound on a long-lived server.
  if (recent.size > 5000) recent.clear();

  return hits.length > MAX_PER_WINDOW;
}

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isRateLimited(clientAddress ?? 'unknown')) {
    return jsonError(
      429,
      'rate_limited',
      'Too many messages. Please wait a minute and try again.'
    );
  }

  let payload: Record<string, unknown>;
  try {
    const contentType = request.headers.get('content-type') ?? '';
    payload = contentType.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return jsonError(400, 'invalid_body', 'Could not read the submitted form.');
  }

  const name = String(payload.name ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const message = String(payload.message ?? '').trim();
  // Bots fill every field they find; a human never sees this one.
  const honeypot = String(payload.website ?? '').trim();

  if (honeypot) {
    // Pretend it worked rather than telling the bot it was caught.
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!name || name.length > 200) {
    return jsonError(400, 'invalid_name', 'Please enter your name.');
  }
  if (!isEmail(email) || email.length > 320) {
    return jsonError(400, 'invalid_email', 'Please enter a valid email address.');
  }
  if (message.length < 5 || message.length > 5000) {
    return jsonError(
      400,
      'invalid_message',
      'Please write a message between 5 and 5000 characters.'
    );
  }

  await saveContactMessage({ name, email, message });

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
