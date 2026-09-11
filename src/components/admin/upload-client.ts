/**
 * Client half of the upload pipeline, shared by the episode form and the media
 * library.
 *
 * Two paths, chosen by the server:
 *
 *  - **direct** — the browser PUTs the bytes straight to object storage using a
 *    signed URL, then tells the server where they landed. This is the only way
 *    a 100 MB episode can be uploaded on a serverless host, where a function's
 *    request body is capped at a few megabytes.
 *  - **proxy** — the file is posted to the API route, which validates and (for
 *    images) optimizes it. Used for images always, and for audio when storage
 *    is a local directory.
 *
 * Large images are downscaled here before either path, so a 12 MP phone photo
 * does not need a large request body just to become a 200 KB thumbnail.
 */

export interface UploadedAsset {
  id?: string;
  url: string;
  filename: string;
  bytes: number;
  mimeType: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
}

export interface UploadHandlers {
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Longest edge we keep. Anything bigger is downscaled before upload. */
const MAX_EDGE = 2000;
/** Images under this are sent untouched — re-encoding them would not help. */
const RESIZE_THRESHOLD_BYTES = 1.5 * 1024 * 1024;

/**
 * Reads an audio file's length. The browser has to decode the header anyway to
 * preview it, so this costs nothing and saves a server-side media parser.
 */
export function readAudioDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (value?: number) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () =>
      done(Number.isFinite(audio.duration) ? audio.duration : undefined);
    audio.onerror = () => done(undefined);
    audio.src = url;
    setTimeout(() => done(undefined), 8000);
  });
}

/** Downscales an oversized image in the browser. Returns the original on failure. */
async function downscaleImage(file: File): Promise<File> {
  if (file.size <= RESIZE_THRESHOLD_BYTES || file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));

    // Already small enough in pixel terms; leave the bytes alone.
    if (scale === 1 && file.size <= RESIZE_THRESHOLD_BYTES * 3) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', 0.9)
    );

    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', {
      type: 'image/webp'
    });
  } catch {
    // A format the browser cannot decode (HEIC, say) is left to the server.
    return file;
  }
}

function xhrSend(
  xhr: XMLHttpRequest,
  body: XMLHttpRequestBodyInit,
  { onProgress, signal }: UploadHandlers
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => resolve({ status: xhr.status, text: xhr.responseText });
    xhr.onerror = () => reject(new Error('The upload failed — check your connection.'));
    xhr.onabort = () => reject(new DOMException('Upload cancelled', 'AbortError'));

    signal?.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(body);
  });
}

function messageFrom(text: string, fallback: string): string {
  try {
    return JSON.parse(text)?.error?.message ?? fallback;
  } catch {
    return fallback;
  }
}

export async function uploadFile(
  original: File,
  kind: 'image' | 'audio',
  handlers: UploadHandlers = {}
): Promise<UploadedAsset> {
  const file = kind === 'image' ? await downscaleImage(original) : original;

  const durationSeconds =
    kind === 'audio' ? await readAudioDuration(file) : undefined;

  // Ask the server which path to use.
  //
  // A dead dev server or a dropped connection surfaces here as the browser's
  // bare "Failed to fetch", which tells the owner nothing. Translate it.
  let ticketResponse: Response;
  try {
    ticketResponse = await fetch('/api/admin/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, contentType: file.type, bytes: file.size }),
      signal: handlers.signal
    });
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw error;
    throw new Error(
      'Could not reach the server. Check that the site is running and that you are still signed in, then try again.'
    );
  }

  if (ticketResponse.status === 401) {
    throw new Error('Your session expired. Reload the page and sign in again.');
  }

  if (!ticketResponse.ok) {
    throw new Error(
      messageFrom(await ticketResponse.text(), 'Could not start the upload.')
    );
  }

  const ticket = await ticketResponse.json();

  /* ── Direct to object storage ───────────────────────────────────────── */
  if (ticket.mode === 'direct') {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', ticket.uploadUrl);
    for (const [name, value] of Object.entries(ticket.headers as Record<string, string>)) {
      xhr.setRequestHeader(name, value);
    }

    const put = await xhrSend(xhr, file, handlers);
    if (put.status < 200 || put.status >= 300) {
      throw new Error('Storage rejected the upload. Please try again.');
    }

    let registered: Response;
    try {
      registered = await fetch('/api/admin/media/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: ticket.key,
          token: ticket.token,
          filename: file.name,
          durationSeconds
        }),
        signal: handlers.signal
      });
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') throw error;
      throw new Error(
        'The file uploaded but could not be saved. Check your connection and try again.'
      );
    }

    if (!registered.ok) {
      throw new Error(
        messageFrom(await registered.text(), 'The upload could not be saved.')
      );
    }

    return registered.json();
  }

  /* ── Through the API route ──────────────────────────────────────────── */
  if (typeof ticket.maxBytes === 'number' && file.size > ticket.maxBytes) {
    const mb = Math.round(ticket.maxBytes / 1024 / 1024);
    throw new Error(`That file is too large. The limit is ${mb} MB.`);
  }

  const body = new FormData();
  body.append('file', file);
  body.append('kind', kind);
  if (durationSeconds) body.append('duration', String(Math.round(durationSeconds)));

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/admin/upload');

  const posted = await xhrSend(xhr, body, handlers);
  if (posted.status < 200 || posted.status >= 300) {
    throw new Error(messageFrom(posted.text, 'The upload failed. Please try again.'));
  }

  return JSON.parse(posted.text);
}
