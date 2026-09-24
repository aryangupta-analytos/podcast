# Vendored Starpod

`src/components`, `src/layouts`, `src/styles`, `src/assets`, `src/svgs`, and
parts of `src/lib` are vendored from the MIT-licensed
[`starpod`](https://github.com/shipshapecode/starpod) npm package, **v1.1.0**.

Why vendored rather than installed: the package injects its own routes from
`node_modules` and reads every episode from an RSS feed at build time. This
site is CMS-driven (Postgres) with an editable homepage and rebuild-free
publishing, which the packaged integration cannot express. Vendoring keeps
Starpod's design system, player, and components intact while letting the data
layer come from the database.

What changed vs upstream v1.1.0:
- `src/lib/rss.ts` removed. Episode/show data now comes from `src/server/repo/*`.
- `virtual:starpod/*` imports replaced with direct relative imports.
- Pages moved from the integration's injected routes into real `src/pages/`.
- Site identity (`starpod.config.ts`) replaced by the `site_settings` table.

## Redesign (September 2026)

The public site was re-skinned on a single navy theme with a top header
and full footer, replacing Starpod's sidebar shell and its OS-driven
dark/light mode. What that changed relative to the vendored v1.1.0 files:

- **Removed:** `InfoCard.astro`, `Hosts.astro`, `ShowArtwork.astro` (and the
  `atropos` dependency), `Dots.astro`, `Platforms.astro`, `LargePlatforms.astro`,
  `EpisodeList.astro`, `home/Hero.astro`, `home/FeaturedEpisode.astro`,
  `home/AboutSection.astro`, `home/PersonGrid.astro`, the `*-light` assets in
  `src/assets` and `src/svgs`, and the platform SVGs in `src/svgs`.
- **Rewritten:** `layouts/Layout.astro` (header/main/footer shell; the
  ClientRouter stall fallback is kept verbatim), `Breadcrumbs.astro`,
  `SocialLinks.astro`, `NotFoundContent.astro`, both illustrations,
  `episode/CreatorsAndGuests.astro`, and every page under `src/pages`.
- **Converted to one theme:** `SearchDialog.tsx`, `SearchButton.tsx`,
  `FullPlayButton.tsx`, `Player.tsx` (no more sidebar offset),
  `player/PlayButton.tsx`, `player/PlaybackRateButton.tsx`,
  `player/Slider/styles.css`, `ContactForm.tsx`, and all of `src/styles`.
  Design tokens now live in `src/styles/theme.css`; `tailwind.css` only bridges
  them. The old OKLCH `--color-dark-*` / `--color-light-*` tokens are gone.
- **Typography:** Inter and Fraunces were replaced by Manrope for every
  role (headings, body, navigation); Oswald remains for the header wordmark.
- **`FullPlayButton.tsx`:** gained an optional `label` prop (the featured
  card's "Listen to episode"); default wording unchanged.
- **Added (not vendored):** `components/site/*`, `components/episode/EpisodeCard.astro`,
  `components/episode/PlatformButtons.astro`, `components/people/*`,
  `components/video/*`, `components/home/*`, `components/EmptyState.astro`.

The `Episode` / `Show` shapes in `src/lib/types.ts` are unchanged, so the
player and search components still consume the same data.

Upstream LICENSE is preserved at `LICENSE-starpod.md`.

To diff against upstream, fetch the same version again:

```bash
npm pack starpod@1.1.0 && tar -xzf starpod-1.1.0.tgz
```

The original Starpod-based project this was adapted from (the whiskey.fm
site) is unmodified at `Downloads/www-starpod-main`. It is kept outside this
repository on purpose: anything inside the project root is traced into the
deployment bundle.
