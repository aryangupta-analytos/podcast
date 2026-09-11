import type { APIContext } from 'astro';
import { eq, sql } from 'drizzle-orm';

import { getDb } from '../db';
import { users } from '../db/schema';
import { env } from '../env';
import { hashPassword, verifyPassword } from './password';
import {
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  getSessionUser,
  purgeExpiredSessions,
  type SessionUser
} from './session';

export { hashPassword, validatePasswordStrength, verifyPassword } from './password';
export {
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  getSessionUser,
  type SessionUser
} from './session';

const MAX_FAILED_ATTEMPTS = 8;
const LOCKOUT_MS = 1000 * 60 * 15;

export type LoginResult =
  | { ok: true; user: SessionUser }
  | { ok: false; error: string };

/**
 * Verifies credentials and starts a session.
 *
 * Always returns the same message for "no such user" and "wrong password" so
 * the form cannot be used to enumerate accounts, and always spends time on a
 * hash so the two cases are not distinguishable by timing either.
 */
export async function login(
  email: string,
  password: string,
  context: Pick<APIContext, 'cookies' | 'request' | 'clientAddress'>
): Promise<LoginResult> {
  const db = getDb();
  const GENERIC = 'Incorrect email or password.';

  const normalized = email.trim().toLowerCase();
  const found = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);

  const user = found[0];

  if (!user) {
    // Burn comparable time so a missing account looks like a wrong password.
    await verifyPassword(password, 'scrypt$65536$8$1$00$00');
    return { ok: false, error: GENERIC };
  }

  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      ok: false,
      error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`
    };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const attempts = user.failedAttempts + 1;
    await db
      .update(users)
      .set({
        failedAttempts: attempts,
        lockedUntil:
          attempts >= MAX_FAILED_ATTEMPTS
            ? new Date(Date.now() + LOCKOUT_MS)
            : null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    return { ok: false, error: GENERIC };
  }

  await db
    .update(users)
    .set({
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, user.id));

  await createSession(user.id, context.cookies, {
    userAgent: context.request.headers.get('user-agent'),
    ipAddress: context.clientAddress ?? null
  });

  // Cheap housekeeping on a rare path.
  void purgeExpiredSessions().catch(() => {});

  return {
    ok: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  };
}

export async function logout(context: Pick<APIContext, 'cookies'>) {
  await destroySession(context.cookies);
}

/** Changes a password and signs every other device out. */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  const found = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const user = found[0];
  if (!user) return { ok: false, error: 'Account not found.' };

  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    return { ok: false, error: 'Your current password is not correct.' };
  }

  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), updatedAt: new Date() })
    .where(eq(users.id, userId));

  await destroyAllSessionsForUser(userId);
  return { ok: true };
}

/**
 * Rejects a state-changing request that did not originate from this site.
 *
 * Session cookies are SameSite=Lax, which already blocks cross-site POSTs from
 * carrying them. This is the belt to that suspenders: an explicit Origin check,
 * the approach OWASP recommends when a framework has no built-in token. It
 * needs no hidden field in every form, so there is no way to forget one.
 */
export function isSameOrigin(request: Request): boolean {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;

  const origin = request.headers.get('origin');
  const target = request.headers.get('host');

  // No Origin header at all on a mutating request: reject rather than guess.
  if (!origin || !target) return false;

  try {
    return new URL(origin).host === target;
  } catch {
    return false;
  }
}

export { env };
export type { APIContext };

/**
 * Guard for admin pages. Returns the user, or a Response to return immediately
 * (a redirect to the login page carrying the requested path).
 */
export async function requireUser(
  context: Pick<APIContext, 'cookies' | 'request' | 'url' | 'redirect'>
): Promise<{ user: SessionUser } | { response: Response }> {
  const user = await getSessionUser(context);
  if (user) return { user };

  const next = encodeURIComponent(context.url.pathname + context.url.search);
  return { response: context.redirect(`/admin/login?next=${next}`, 302) };
}
