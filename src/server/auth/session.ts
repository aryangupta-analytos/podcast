import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import type { APIContext, AstroCookies } from 'astro';
import { and, eq, lt } from 'drizzle-orm';

import { getDb } from '../db';
import { sessions, users, type User } from '../db/schema';
import { env } from '../env';

export const SESSION_COOKIE = '__Host-svtp_session';
/** Falls back to a non-__Host name over plain HTTP, which __Host- forbids. */
export const SESSION_COOKIE_DEV = 'svtp_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days
/** Sessions older than this are re-issued so a stolen cookie expires sooner. */
const ROLL_AFTER_MS = 1000 * 60 * 60 * 24; // 1 day

function cookieName() {
  return env.isProduction ? SESSION_COOKIE : SESSION_COOKIE_DEV;
}

/** The cookie carries `<token>.<hmac>`; only the token's hash is stored. */
function sign(token: string): string {
  return createHmac('sha256', env.sessionSecret).update(token).digest('base64url');
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function parseCookieValue(value: string): string | null {
  const index = value.lastIndexOf('.');
  if (index <= 0) return null;

  const token = value.slice(0, index);
  const signature = value.slice(index + 1);
  const expected = sign(token);

  // Constant-time compare; lengths must match first or timingSafeEqual throws.
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  return token;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'editor';
}

function toSessionUser(user: User): SessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role
  };
}

/** Creates a session row and sets the cookie. Call only after a verified login. */
export async function createSession(
  userId: string,
  cookies: AstroCookies,
  meta: { userAgent?: string | null; ipAddress?: string | null } = {}
): Promise<void> {
  const db = getDb();
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id: hashToken(token),
    userId,
    expiresAt,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
    ipAddress: meta.ipAddress ?? null
  });

  cookies.set(cookieName(), `${token}.${sign(token)}`, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: 'lax',
    path: '/',
    expires: expiresAt
  });
}

/**
 * Resolves the current user from the session cookie, or null. Deletes expired
 * sessions it encounters and rolls long-lived ones onto a fresh token.
 */
export async function getSessionUser(
  context: Pick<APIContext, 'cookies' | 'request'>
): Promise<SessionUser | null> {
  const raw = context.cookies.get(cookieName())?.value;
  if (!raw) return null;

  const token = parseCookieValue(raw);
  if (!token) {
    context.cookies.delete(cookieName(), { path: '/' });
    return null;
  }

  const db = getDb();
  const id = hashToken(token);

  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, id))
    .limit(1);

  const row = rows[0];
  if (!row) {
    context.cookies.delete(cookieName(), { path: '/' });
    return null;
  }

  if (row.session.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    context.cookies.delete(cookieName(), { path: '/' });
    return null;
  }

  // Slide the expiry so an active editor is not logged out mid-edit, but only
  // once a day so this is not a write on every request.
  const age = Date.now() - row.session.createdAt.getTime();
  if (age > ROLL_AFTER_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    context.cookies.set(cookieName(), raw, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      path: '/',
      expires: expiresAt
    });
  }

  return toSessionUser(row.user);
}

/** Destroys the current session and clears the cookie. */
export async function destroySession(cookies: AstroCookies): Promise<void> {
  const raw = cookies.get(cookieName())?.value;
  if (raw) {
    const token = parseCookieValue(raw);
    if (token) {
      await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
    }
  }
  cookies.delete(cookieName(), { path: '/' });
}

/** Invalidates every session for a user — used when the password changes. */
export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping: drop expired rows. Cheap enough to run on login. */
export async function purgeExpiredSessions(): Promise<void> {
  await getDb().delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export { and };
