import type { APIRoute } from 'astro';

import { jsonError } from '../../../lib/api-errors';
import { env } from '../../../server/env';
import { formatBytes, uploadAudio, uploadImage, UploadError } from '../../../server/storage';

export const prerender = false;

/**
 * Uploads one file.
 *
 * Authentication is enforced by src/middleware.ts for every /api/admin path,
 * and re-checked here so this endpoint is never reachable unauthenticated even
 * if the middleware matcher changes.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user;
  if (!user) {
    return jsonError(401, 'unauthorized', 'You are not signed in.');
  }

  // Reject an oversized body before reading it into memory.
  const declaredLength = Number(request.headers.get('content-length') ?? '0');
  const ceiling = env.maxAudioBytes + 1024 * 1024;
  if (declaredLength > ceiling) {
    return jsonError(
      413,
      'too_large',
      `That file is larger than the ${formatBytes(env.maxAudioBytes)} limit.`
    );
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, 'invalid_body', 'Could not read the uploaded file.');
  }

  const file = form.get('file');
  const kind = String(form.get('kind') ?? 'image');

  if (!(file instanceof File)) {
    return jsonError(400, 'missing_file', 'No file was included in the upload.');
  }

  try {
    if (kind === 'audio') {
      const rawDuration = Number(form.get('duration'));
      const { asset } = await uploadAudio(file, {
        uploadedBy: user.id,
        durationSeconds: Number.isFinite(rawDuration) ? rawDuration : undefined
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
    }

    const { asset } = await uploadImage(file, {
      uploadedBy: user.id,
      alt: String(form.get('alt') ?? '')
    });

    return Response.json({
      id: asset.id,
      url: asset.url,
      kind: asset.kind,
      bytes: asset.bytes,
      mimeType: asset.mimeType,
      width: asset.width,
      height: asset.height,
      filename: asset.originalFilename
    });
  } catch (error) {
    if (error instanceof UploadError) {
      return jsonError(error.status, 'upload_rejected', error.message);
    }

    console.error('[upload] failed', error);
    return jsonError(
      500,
      'upload_failed',
      'The upload could not be saved. Please try again.'
    );
  }
};
