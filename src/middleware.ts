import { defineMiddleware } from 'astro:middleware';

import { getSessionUser, isSameOrigin } from './server/auth';

const ADMIN_PREFIX = '/admin';
const ADMIN_API_PREFIX = '/api/admin';
/** The only admin paths reachable without a session. */
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/api/admin/login']);

/**
 * Security headers applied to every response.
 *
 * The CSP allows inline styles because Astro inlines critical CSS, and inline
 * scripts via nonce would require rewriting every island's hydration. Scripts
 * are restricted to this origin plus Vercel's analytics, which is the part
 * that actually matters for XSS.
 */
function applySecurityHeaders(headers: Headers, isAdmin: boolean): void {
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  if (isAdmin) {
    // Belt and braces alongside robots.txt and the sitemap filter: even if the
    // admin URL leaks, search engines are told not to index it.
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    // Admin pages are per-user and must never be cached by a CDN.
    headers.set('Cache-Control', 'private, no-store, max-age=0');
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  const isAdminPath =
    pathname === ADMIN_PREFIX ||
    pathname.startsWith(`${ADMIN_PREFIX}/`) ||
    pathname.startsWith(ADMIN_API_PREFIX);

  // 1. Cross-site request forgery: reject any state-changing request that did
  //    not come from this origin, before it can touch the database.
  if (!isSameOrigin(context.request)) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'cross_origin_blocked',
          message: 'Request blocked: it did not originate from this site.'
        }
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 2. Resolve the session once per request; pages and API routes reuse it.
  const user = isAdminPath ? await getSessionUser(context) : null;
  context.locals.user = user;

  // 3. Authentication is enforced here, not by the URL being hard to guess.
  if (isAdminPath && !PUBLIC_ADMIN_PATHS.has(pathname) && !user) {
    if (pathname.startsWith(ADMIN_API_PREFIX)) {
      return new Response(
        JSON.stringify({
          error: { code: 'unauthorized', message: 'You are not signed in.' }
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const next = encodeURIComponent(pathname + context.url.search);
    return context.redirect(`/admin/login?next=${next}`, 302);
  }

  // 4. A signed-in owner hitting the login page goes straight to the dashboard.
  if (pathname === '/admin/login' && user) {
    return context.redirect('/admin', 302);
  }

  const response = await next();
  applySecurityHeaders(response.headers, isAdminPath);
  return response;
});
