import preact from '@astrojs/preact';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, fontProviders } from 'astro/config';

import { IMAGE_WIDTHS } from './src/lib/image-sizes.mjs';

const site = process.env.PUBLIC_SITE_URL || 'http://localhost:4321';

// Server-rendered: episodes and homepage content come from Postgres, so
// publishing from the admin panel is visible immediately with no rebuild.
// Public pages set their own Cache-Control so the CDN still does the heavy
// lifting; see src/lib/cache.ts.
export default defineConfig({
  site,
  output: 'server',
  /*
    Vercel is the deployment target. `ADAPTER=node` swaps in the Node adapter so
    the production build can be run locally with `pnpm preview:prod` — the dev
    server has its own module-loading behaviour, so "does it work in dev" and
    "does it work when shipped" are different questions.
  */
  adapter:
    process.env.ADAPTER === 'node'
      ? node({ mode: 'standalone' })
      : vercel({
          imageService: true,
          imagesConfig: {
            formats: ['image/avif', 'image/webp'],
            minimumCacheTTL: 31536000,
            remotePatterns: [{ protocol: 'https' }, { protocol: 'http' }],
            // Must stay in sync with SmartImage — see src/lib/image-sizes.mjs.
            sizes: IMAGE_WIDTHS
          },
          webAnalytics: { enabled: true }
        }),
  // The sitemap is generated from the database at /sitemap.xml, because
  // episode and people URLs exist as rows, not as files. The admin panel is
  // absent from it by construction.
  integrations: [preact()],
  image: {
    remotePatterns: [{ protocol: 'https' }, { protocol: 'http' }],
    /*
      Our own sharp-backed service. Astro's built-in one imports sharp from
      inside its own package, which pnpm + Vite's SSR runner intermittently
      cannot resolve — surfacing as "MissingSharp" and a 500 from every
      /_image request, i.e. every image on the site vanishing at once.
      See src/server/image-service.ts.
    */
    service: { entrypoint: './src/server/image-service.ts' }
  },
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter',
      cssVariable: '--astro-font-inter',
      formats: ['woff2'],
      styles: ['normal'],
      subsets: ['latin'],
      weights: ['300 900'],
      options: { experimental: { variableAxis: { opsz: ['14..32'] } } }
    },
    {
      // Display serif for headlines. Variable weight and optical size so the
      // same file serves a 14px card title and a 72px hero headline.
      provider: fontProviders.google(),
      name: 'Fraunces',
      cssVariable: '--astro-font-fraunces',
      formats: ['woff2'],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      weights: ['300 900'],
      fallbacks: ['Georgia', 'serif'],
      options: { experimental: { variableAxis: { opsz: ['9..144'] } } }
    },
    {
      // Condensed, heavy face for the header wordmark only.
      provider: fontProviders.google(),
      name: 'Oswald',
      cssVariable: '--astro-font-oswald',
      formats: ['woff2'],
      styles: ['normal'],
      subsets: ['latin'],
      weights: ['700'],
      fallbacks: ['Impact', 'Arial Narrow', 'sans-serif']
    }
  ],
  build: { inlineStylesheets: 'always' },
  prefetch: { prefetchAll: true, defaultStrategy: 'viewport' },
  trailingSlash: 'never',
  vite: {
    plugins: [tailwindcss()],
    // sharp is a native module. Left to itself Vite tries to process it for
    // SSR and the import fails, which surfaces as Astro's "MissingSharp" error
    // and a 500 from every /_image request. Keeping it external hands the
    // import straight to Node, where it loads fine.
    //
    // In production on Vercel the adapter swaps in Vercel's image CDN and
    // sharp is not used at request time at all — this is what makes local
    // development match it.
    // Vite 7 reads externals from the environment config; the legacy
    // top-level `ssr.external` key is ignored, which is why setting only that
    // appeared to work until the module cache was rebuilt.
    ssr: { external: ['sharp'] },
    environments: {
      ssr: { resolve: { external: ['sharp'] } }
    },
    optimizeDeps: {
      exclude: ['sharp'],
      /*
        Pre-bundle every client dependency up front.
        Vite re-optimizes when it discovers a new dependency mid-session, which
        invalidates the hashed chunks a loaded page is still holding. Astro's
        ClientRouter calls preventDefault() on a link click and then imports its
        router chunk — when that chunk 504s because it was just re-optimized,
        the click is cancelled and nothing navigates. Listing the deps here
        means the optimizer settles on the first run instead.
      */
      /*
        Only the ClientRouter's own modules. Vite discovers these when the first
        page is requested and re-optimizes at that moment, invalidating the
        chunk the page is already holding — which breaks the very navigation
        they implement.

        Preact is deliberately NOT listed: the Astro integration swaps in
        `preact/dist/client-dev.js` during development, and pre-bundling it
        here stops every island from hydrating.
      */
      include: [
        'astro/virtual-modules/transitions-router.js',
        'astro/virtual-modules/transitions-types.js',
        'astro/virtual-modules/transitions-events.js',
        'astro/virtual-modules/transitions-swap-functions.js'
      ]
    }
  }
});
