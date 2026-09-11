import type { APIRoute } from 'astro';

import { jsonError } from '../../../lib/api-errors';
import { createUploadTicket } from '../../../server/storage/direct';
import { UploadError } from '../../../server/storage';

export const prerender = false;

/**
 * Asks the server how a file should be uploaded. Returns either a signed URL
 * for a direct browser-to-storage PUT, or instructions to post through
 * /api/admin/upload. The client does not decide — the server does, based on
 * how storage is configured.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return jsonError(401, 'unauthorized', 'You are not signed in.');
  }

  let body: { kind?: string; contentType?: string; bytes?: number };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_body', 'Could not read the request.');
  }

  const kind = body.kind === 'audio' ? 'audio' : 'image';
  const contentType = String(body.contentType ?? '').slice(0, 100);
  const bytes = Number(body.bytes ?? 0);

  if (!Number.isFinite(bytes) || bytes <= 0) {
    return jsonError(400, 'invalid_size', 'That file appears to be empty.');
  }

  try {
    const ticket = await createUploadTicket({ kind, contentType, bytes });
    return Response.json(ticket);
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.status, 'upload_rejected', error.message);
    }
    console.error('[upload-url] failed', error);
    return jsonError(500, 'upload_failed', 'Could not start the upload.');
  }
};
