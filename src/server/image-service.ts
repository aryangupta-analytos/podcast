import sharp from 'sharp';
// Astro's own sharp service, taken from its public export map. Everything
// except `transform` is reused from it, so URL shapes, srcset generation and
// HTML attributes stay byte-for-byte what Astro would produce. Importing it
// does not load sharp — that only happens inside the `transform` we replace.
import astroSharpService from 'astro/assets/services/sharp';
import type { LocalImageService } from 'astro';

/**
 * The site's image service.
 *
 * Astro ships a sharp-backed service, but it does `await import('sharp')` from
 * inside its own package directory. Under pnpm that resolution goes through
 * Vite's SSR module runner, which intermittently cannot find sharp and reports
 * it as "MissingSharp" — every `/_image` request then returns 500 and every
 * image on the site disappears. It recurs whenever Vite rebuilds its module
 * graph, so it looks random.
 *
 * Importing sharp here instead means it resolves as an ordinary dependency of
 * this project, which always works. Everything except `transform` is delegated
 * to Astro's base service, so URL shapes, srcset generation and HTML
 * attributes stay exactly as they were.
 */
const service: LocalImageService = {
  ...astroSharpService,

  async transform(inputBuffer, transformOptions) {
    const { width, height, format, quality, fit, position } =
      transformOptions as {
        width?: number;
        height?: number;
        format?: string;
        quality?: number | string;
        fit?: keyof typeof FIT;
        position?: string;
      };

    // `cache(false)` keeps sharp from holding decoded frames between requests;
    // a long-running server would otherwise grow steadily.
    sharp.cache(false);

    let pipeline = sharp(inputBuffer, {
      failOn: 'none',
      pages: -1, // keep every frame of an animated GIF/WebP
      limitInputPixels: false
    });

    // Honour the EXIF orientation before it is stripped by re-encoding.
    pipeline.rotate();

    if (width || height) {
      pipeline.resize({
        width: width ? Math.round(width) : undefined,
        height: height ? Math.round(height) : undefined,
        fit: fit ? FIT[fit] : undefined,
        position: position ?? undefined
      });
    }

    const outputFormat = (format ?? 'webp') as keyof typeof sharp.format;
    const numericQuality =
      typeof quality === 'number'
        ? quality
        : typeof quality === 'string'
          ? QUALITY_NAMES[quality] ?? undefined
          : undefined;

    pipeline.toFormat(
      outputFormat,
      numericQuality === undefined ? undefined : { quality: numericQuality }
    );

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    return { data, format: info.format as never };
  }
};

/** Astro's fit names mapped onto sharp's. */
const FIT = {
  fill: 'fill',
  contain: 'inside',
  cover: 'cover',
  none: 'outside',
  'scale-down': 'inside',
  inside: 'inside',
  outside: 'outside'
} as const;

/** Astro allows named qualities as well as numbers. */
const QUALITY_NAMES: Record<string, number> = {
  low: 25,
  mid: 50,
  high: 80,
  max: 100
};

export default service;
