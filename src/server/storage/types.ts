export interface StoredFile {
  /** Key within the bucket/directory, e.g. `audio/2026/09/9f3c….mp3`. */
  key: string;
  /** URL the browser fetches. A CDN URL when S3_PUBLIC_URL is configured. */
  url: string;
  bytes: number;
  mimeType: string;
}

export interface PutOptions {
  key: string;
  body: Buffer | Uint8Array;
  mimeType: string;
  /** Cache-Control for the object. Uploaded media is immutable. */
  cacheControl?: string;
}

export interface PresignedUpload {
  /** URL the browser PUTs the bytes to. */
  uploadUrl: string;
  /** Headers the browser must send with that PUT. */
  headers: Record<string, string>;
  key: string;
  /** Where the file will be readable once the PUT completes. */
  publicUrl: string;
}

export interface StorageDriver {
  readonly name: 'local' | 's3';
  put(options: PutOptions): Promise<StoredFile>;
  delete(key: string): Promise<void>;
  /** Resolves a stored key back to its public URL. */
  urlFor(key: string): string;
  /**
   * Issues a short-lived URL the browser can upload straight to, bypassing the
   * application server. Only implemented by drivers that can do it — the local
   * driver has nowhere to point a browser at, so it returns null and callers
   * fall back to uploading through the API route.
   */
  presignPut?(options: {
    key: string;
    contentType: string;
    maxBytes: number;
  }): Promise<PresignedUpload | null>;
  /** Confirms an object exists and reports its size, after a direct upload. */
  headObject?(key: string): Promise<{ bytes: number; contentType?: string } | null>;
}
