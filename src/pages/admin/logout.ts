import type { APIRoute } from 'astro';

import { logout } from '../../server/auth';

/** POST only: a link or prefetch must never be able to sign the owner out. */
export const POST: APIRoute = async (context) => {
  await logout(context);
  return context.redirect('/admin/login', 303);
};

export const GET: APIRoute = ({ redirect }) => redirect('/admin', 302);
