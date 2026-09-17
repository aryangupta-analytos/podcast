import type { APIRoute } from 'astro';

import { jsonError } from '../../lib/api-errors';
import { createRateLimiter, isEmail } from '../../server/rate-limit';
import { subscribe } from '../../server/repo/newsletter';

const isRateLimited = createRateLimiter({ windowMs: 60_000, max: 5 });

const ok = () =>
  new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });

/**
 * Newsletter signup. Always answers `{ ok: true }` for a well-formed address,
 * whether or not it was already on the list, so the endpoint cannot be used
 * to check who is subscribed.
 */
export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (isRateLimited(clientAddress ?? 'unknown')) {
    return jsonError(
      429,
      'rate_limited',
      'Too many attempts. Please wait a minute and try again.'
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

  const email = String(payload.email ?? '').trim();
  // Bots fill every field they find; a human never sees this one.
  const honeypot = String(payload.website ?? '').trim();
  if (honeypot) return ok();

  if (!isEmail(email) || email.length > 320) {
    return jsonError(400, 'invalid_email', 'Please enter a valid email address.');
  }

  await subscribe(email, 'site');
  return ok();
};
