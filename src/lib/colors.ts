/** `#rgb` or `#rrggbb`, case-insensitive. */
export function isHexColor(value: string): boolean {
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim());
}

/** Lower-cased six-digit form, or null when the input is not a hex colour. */
export function normalizeHex(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!isHexColor(trimmed)) return null;
  if (trimmed.length === 4) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return trimmed;
}
