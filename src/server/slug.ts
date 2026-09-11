/**
 * URL slugs for episodes and people.
 *
 * Public URLs are `/episodes/<slug>` and never contain a database id, so a
 * slug has to be stable, readable, and unique.
 */
export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      // Strip diacritics so "Señor" becomes "senor" rather than "seor".
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90)
      .replace(/-+$/g, '') || 'untitled'
  );
}

/**
 * Appends `-2`, `-3`, … until `exists` says the slug is free.
 * The caller supplies the existence check so this works for any table.
 */
export async function uniqueSlug(
  base: string,
  exists: (candidate: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base);
  if (!(await exists(root))) return root;

  for (let suffix = 2; suffix < 200; suffix++) {
    const candidate = `${root}-${suffix}`;
    if (!(await exists(candidate))) return candidate;
  }

  // Practically unreachable; a timestamp guarantees termination.
  return `${root}-${Date.now()}`;
}
