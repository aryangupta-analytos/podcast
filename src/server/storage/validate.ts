/**
 * File-type validation by content, not by name.
 *
 * A browser-supplied `Content-Type` and a file extension are both attacker
 * controlled, so neither is trusted here: the first bytes of the buffer decide
 * what the file actually is, and anything unrecognised is rejected.
 */

export type AllowedImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif' | 'image/gif';
export type AllowedAudioType = 'audio/mpeg' | 'audio/mp4' | 'audio/wav' | 'audio/ogg' | 'audio/flac';

export interface SniffResult {
  mimeType: string;
  extension: string;
  kind: 'image' | 'audio';
}

const startsWith = (buf: Uint8Array, bytes: number[], offset = 0) =>
  bytes.every((b, i) => buf[offset + i] === b);

const ascii = (buf: Uint8Array, text: string, offset = 0) =>
  [...text].every((c, i) => buf[offset + i] === c.charCodeAt(0));

/** Identifies an image by magic bytes. Returns null for anything else. */
export function sniffImage(buf: Uint8Array): SniffResult | null {
  if (buf.length < 16) return null;

  // JPEG: FF D8 FF
  if (startsWith(buf, [0xff, 0xd8, 0xff])) {
    return { mimeType: 'image/jpeg', extension: 'jpg', kind: 'image' };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { mimeType: 'image/png', extension: 'png', kind: 'image' };
  }
  // GIF87a / GIF89a
  if (ascii(buf, 'GIF8')) {
    return { mimeType: 'image/gif', extension: 'gif', kind: 'image' };
  }
  // RIFF….WEBP
  if (ascii(buf, 'RIFF') && ascii(buf, 'WEBP', 8)) {
    return { mimeType: 'image/webp', extension: 'webp', kind: 'image' };
  }
  // ISO-BMFF: ….ftypavif / ftypavis
  if (ascii(buf, 'ftyp', 4) && (ascii(buf, 'avif', 8) || ascii(buf, 'avis', 8))) {
    return { mimeType: 'image/avif', extension: 'avif', kind: 'image' };
  }

  return null;
}

/** Identifies an audio file by magic bytes. Returns null for anything else. */
export function sniffAudio(buf: Uint8Array): SniffResult | null {
  if (buf.length < 16) return null;

  // MP3 with an ID3 tag, or a raw MPEG frame sync (FF Ex/Fx).
  if (ascii(buf, 'ID3')) {
    return { mimeType: 'audio/mpeg', extension: 'mp3', kind: 'audio' };
  }
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    return { mimeType: 'audio/mpeg', extension: 'mp3', kind: 'audio' };
  }
  // M4A / AAC in an MP4 container
  if (ascii(buf, 'ftyp', 4)) {
    const brand = String.fromCharCode(...buf.slice(8, 12));
    if (['M4A ', 'M4B ', 'mp42', 'isom', 'M4V '].includes(brand)) {
      return { mimeType: 'audio/mp4', extension: 'm4a', kind: 'audio' };
    }
  }
  // RIFF….WAVE
  if (ascii(buf, 'RIFF') && ascii(buf, 'WAVE', 8)) {
    return { mimeType: 'audio/wav', extension: 'wav', kind: 'audio' };
  }
  // Ogg
  if (ascii(buf, 'OggS')) {
    return { mimeType: 'audio/ogg', extension: 'ogg', kind: 'audio' };
  }
  // FLAC
  if (ascii(buf, 'fLaC')) {
    return { mimeType: 'audio/flac', extension: 'flac', kind: 'audio' };
  }

  return null;
}

export class UploadError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

/** Human-readable size, for error messages the owner will actually read. */
export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / 1024 / 1024)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} bytes`;
}
