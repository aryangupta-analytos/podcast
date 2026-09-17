/**
 * Reads a submitted form body, accepting either a real form encoding or JSON.
 *
 * Every admin page handler wants `FormData` — `.get()`, `.getAll()`, string
 * values. This returns exactly that whichever way the body arrived, so a
 * handler never has to care how the browser sent it.
 *
 * The JSON path exists because some proxies refuse to forward HTML form
 * submissions. Cloudflare's free quick tunnels are the case in point: a POST
 * with `application/x-www-form-urlencoded` or `multipart/form-data` is rejected
 * at their edge with "Cross-site POST form submissions are forbidden" and never
 * reaches this server, while the identical POST as `application/json` is passed
 * straight through. Admin forms are therefore submitted by `fetch` as JSON (see
 * `src/scripts/admin-form-transport.ts`), which keeps the whole panel usable
 * through a tunnel without changing a single handler.
 *
 * This widens what the server accepts, not who may call it: the session check
 * and the Origin check in `src/middleware.ts` run first and are untouched.
 */
export async function readFormData(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return request.formData();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    // A malformed body is an empty submission; handlers already validate for
    // missing fields and will report that properly.
    return new FormData();
  }

  const form = new FormData();
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    return form;
  }

  for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
    // A multi-select or checkbox group arrives as an array and must stay one,
    // so `form.getAll(key)` returns every value the way it would from a form.
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item !== null && item !== undefined) form.append(key, String(item));
      }
    } else if (value !== null && value !== undefined) {
      form.append(key, String(value));
    }
  }

  return form;
}

/**
 * Reads an upload body, accepting multipart or JSON with the bytes base64'd.
 *
 * Same reason as `readFormData()`: a proxy that refuses multipart form posts
 * would otherwise make uploading a thumbnail through a tunnel impossible. The
 * JSON shape is `{ file: { name, type, data }, ...fields }` where `data` is
 * standard base64, and it is reassembled into a real `File` so the storage
 * layer — including the magic-byte sniffing in `storage/validate.ts` — sees
 * exactly what it would have seen from a multipart part.
 */
export async function readUploadData(request: Request): Promise<FormData> {
  const contentType = request.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return request.formData();
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const form = new FormData();

  for (const [key, value] of Object.entries(payload)) {
    if (key === 'file') continue;
    if (value !== null && value !== undefined) form.append(key, String(value));
  }

  const file = payload.file as
    | { name?: string; type?: string; data?: string }
    | undefined;

  if (file?.data) {
    const bytes = Buffer.from(file.data, 'base64');
    form.append(
      'file',
      new File([new Uint8Array(bytes)], file.name || 'upload', {
        type: file.type || 'application/octet-stream'
      })
    );
  }

  return form;
}
