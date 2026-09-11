import type { APIRoute } from 'astro';

import { jsonError } from '../../../../lib/api-errors';
import { UploadError } from '../../../../server/storage';
import { registerDirectUpload } from '../../../../server/storage/direct';

export const prerender = false;

/** Records a file the browser uploaded straight to object storage. */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return jsonError(401, 'unauthorized', 'You are not signed in.');
  }

  let body: {
    key?: string;
    token?: string;
    filename?: string;
    durationSeconds?: number;
  };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_body', 'Could not read the request.');
  }

  if (!body.key || !body.token) {
    return jsonError(400, 'invalid_body', 'The upload reference is missing.');
  }

  try {
    const asset = await registerDirectUpload({
      key: body.key,
      token: body.token,
      filename: String(body.filename ?? 'upload'),
      durationSeconds: Number(body.durationSeconds) || undefined,
      uploadedBy: user.id
    });

    return Response.json({
      id: asset.id,
      url: asset.url,
      kind: asset.kind,
      bytes: asset.bytes,
      mimeType: asset.mimeType,
      durationSeconds: asset.durationSeconds,
      filename: asset.originalFilename
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.status, 'upload_rejected', error.message);
    }
    console.error('[media/register] failed', error);
    return jsonError(500, 'register_failed', 'Could not record the upload.');
  }
};
