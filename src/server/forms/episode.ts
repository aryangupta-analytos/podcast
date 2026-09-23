import type { EpisodeInput } from '../repo/episodes';
import { findOrCreateGuest } from '../repo/people';
import { sanitizeHtml } from '../sanitize';

export interface ParsedEpisodeForm {
  input: EpisodeInput;
  errors: string[];
}

const str = (form: FormData, key: string): string =>
  String(form.get(key) ?? '').trim();

const optionalStr = (form: FormData, key: string): string | null => {
  const value = str(form, key);
  return value === '' ? null : value;
};

const optionalInt = (form: FormData, key: string): number | null => {
  const value = str(form, key);
  if (value === '') return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Accepts an http(s) URL or rejects it.
 *
 * A `javascript:` URL in an episode's "Spotify link" would become a stored XSS
 * the moment someone clicks it, so the scheme is checked rather than the text.
 */
function safeUrl(value: string | null, label: string, errors: string[]): string | null {
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push(`${label} must start with http:// or https://`);
      return null;
    }
    return url.toString();
  } catch {
    errors.push(`${label} is not a valid web address.`);
    return null;
  }
}

/** A site-relative path or an absolute http(s) URL — used for uploaded media. */
function safeMediaUrl(
  value: string | null,
  label: string,
  errors: string[]
): string | null {
  if (!value) return null;
  if (value.startsWith('/')) return value;
  return safeUrl(value, label, errors);
}

/**
 * Turns the Add/Edit Episode form into a validated `EpisodeInput`.
 *
 * Every field is re-validated here regardless of what the browser enforced:
 * the HTML constraints are a convenience for the owner, not a security
 * boundary.
 */
export async function parseEpisodeForm(form: FormData): Promise<ParsedEpisodeForm> {
  const errors: string[] = [];

  const title = str(form, 'title');
  if (!title) errors.push('An episode needs a title.');
  if (title.length > 300) errors.push('The title must be under 300 characters.');

  const description = str(form, 'description');
  if (description.length > 1000) {
    errors.push('The short description must be under 1000 characters.');
  }

  const rawStatus = str(form, 'status');
  const status: EpisodeInput['status'] =
    rawStatus === 'published' || rawStatus === 'unpublished' ? rawStatus : 'draft';

  const audioUrl = safeMediaUrl(optionalStr(form, 'audioUrl'), 'Audio', errors);
  if (status === 'published' && !audioUrl) {
    errors.push('An episode needs an audio file before it can be published.');
  }

  const rawDate = str(form, 'publishDate');
  let publishDate = new Date();
  if (rawDate) {
    const parsed = new Date(rawDate);
    if (Number.isNaN(parsed.getTime())) {
      errors.push('The publish date is not a valid date.');
    } else {
      publishDate = parsed;
    }
  }

  const episodeNumber = optionalInt(form, 'episodeNumber');
  if (episodeNumber !== null && (episodeNumber < 0 || episodeNumber > 100000)) {
    errors.push('The episode number must be between 0 and 100000.');
  }

  const season = optionalInt(form, 'season');
  if (season !== null && (season < 0 || season > 1000)) {
    errors.push('The season must be between 0 and 1000.');
  }

  // Guests: names come from the picker; a new name creates the person.
  const guestIds: string[] = [];
  const guestNames = form
    .getAll('guestName')
    .map((value) => String(value).trim())
    .filter(Boolean);

  for (const name of guestNames) {
    if (name.length > 120) {
      errors.push(`"${name.slice(0, 30)}…" is too long to be a guest name.`);
      continue;
    }

    const photo = safeUrl(
      optionalStr(form, `guestPhoto:${name}`),
      `${name}'s photo URL`,
      errors
    );

    const person = await findOrCreateGuest(name, { imageUrl: photo });
    guestIds.push(person.id);
  }

  const seriesId = optionalStr(form, 'seriesId');

  const input: EpisodeInput = {
    title,
    seriesId: seriesId && /^[0-9a-f-]{36}$/i.test(seriesId) ? seriesId : null,
    slug: optionalStr(form, 'slug') ?? undefined,
    description,
    // Show notes are owner-authored HTML, sanitized so a pasted snippet can
    // never introduce a script into every visitor's page.
    showNotes: sanitizeHtml(String(form.get('showNotes') ?? '')),
    audioUrl,
    audioMimeType: optionalStr(form, 'audioMimeType') ?? 'audio/mpeg',
    audioBytes: optionalInt(form, 'audioBytes'),
    durationSeconds: optionalInt(form, 'durationSeconds'),
    thumbnailUrl: safeMediaUrl(optionalStr(form, 'thumbnailUrl'), 'Thumbnail', errors),
    episodeNumber,
    season,
    publishDate,
    spotifyUrl: safeUrl(optionalStr(form, 'spotifyUrl'), 'Spotify link', errors),
    youtubeUrl: safeUrl(optionalStr(form, 'youtubeUrl'), 'YouTube link', errors),
    appleUrl: safeUrl(optionalStr(form, 'appleUrl'), 'Apple Podcasts link', errors),
    otherUrl: safeUrl(optionalStr(form, 'otherUrl'), 'Other link', errors),
    status,
    isFeatured: form.get('isFeatured') === 'on',
    guestIds
  };

  return { input, errors };
}
