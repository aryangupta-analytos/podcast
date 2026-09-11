/**
 * The only image widths this site ever requests.
 *
 * Shared by `astro.config.mjs` (which declares them to Vercel's image CDN) and
 * by `SmartImage.astro` (which rounds every requested size up to one of them).
 * Vercel serves only the widths it was configured with, so a value that exists
 * in one place and not the other is a broken image in production — hence one
 * list, imported by both.
 *
 * `.mjs` so the Astro config, which is not TypeScript, can import it too.
 */
export const IMAGE_WIDTHS = [64, 96, 128, 192, 256, 384, 512, 640, 960, 1280, 1920];

/** Smallest allowed width that still covers `wanted`. */
export function snapWidth(wanted) {
  return IMAGE_WIDTHS.find((w) => w >= wanted) ?? IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1];
}

/**
 * The srcset widths for an image displayed at `displayWidth` CSS pixels,
 * covering 1x and 2x screens without ever requesting an unlisted width.
 */
export function srcsetWidths(displayWidth) {
  return [...new Set([snapWidth(displayWidth), snapWidth(displayWidth * 2)])];
}
