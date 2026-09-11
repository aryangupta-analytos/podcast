import type { PersonInput } from '../repo/people';
import { sanitizeHtml } from '../sanitize';

const str = (form: FormData, key: string) => String(form.get(key) ?? '').trim();

function optionalUrl(
  form: FormData,
  key: string,
  label: string,
  errors: string[]
): string | null {
  const value = str(form, key);
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

export function parsePersonForm(form: FormData): {
  input: PersonInput;
  errors: string[];
} {
  const errors: string[] = [];

  const name = str(form, 'name');
  if (!name) errors.push('A person needs a name.');
  if (name.length > 120) errors.push('That name is too long.');

  const rawKind = str(form, 'kind');
  const kind: PersonInput['kind'] =
    rawKind === 'host' || rawKind === 'team' ? rawKind : 'guest';

  // The bio is authored in the rich-text field, so it arrives as HTML.
  const bio = sanitizeHtml(String(form.get('bio') ?? ''));
  if (bio.length > 8000) errors.push('The bio is too long.');

  const rawPlaceholder = str(form, 'placeholder');
  const placeholder = ['monogram', 'neutral', 'figure-a', 'figure-b'].includes(
    rawPlaceholder
  )
    ? rawPlaceholder
    : 'monogram';

  // An uploaded photo is a site-relative path; a pasted one must be a real URL.
  const rawImage = str(form, 'imageUrl');
  const imageUrl = rawImage.startsWith('/')
    ? rawImage
    : optionalUrl(form, 'imageUrl', 'The photo URL', errors);

  return {
    input: {
      name,
      kind,
      title: str(form, 'title') || null,
      bio: bio || null,
      placeholder,
      imageUrl,
      linkedin: optionalUrl(form, 'linkedin', 'The LinkedIn link', errors),
      website: optionalUrl(form, 'website', 'The website link', errors),
      twitter: optionalUrl(form, 'twitter', 'The X / Twitter link', errors),
      github: optionalUrl(form, 'github', 'The GitHub link', errors),
      isVisible: form.get('isVisible') === 'on'
    },
    errors
  };
}
