# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What this is

The Silicon Valley Tech Podcast website plus its admin CMS. Migrated from a Wix
site and a Podbean feed; built on vendored Starpod source with a Postgres CMS.

Read [README.md](README.md) first — it covers the stack, the deployment
requirements, and why Starpod is vendored rather than installed.

## Commands

- **Dev:** `pnpm dev` (:4321) — needs `pnpm db:up` first
- **Build:** `pnpm build` (`astro check` then `astro build`) — Vercel adapter
- **Run the real build locally:** `pnpm build:node && pnpm preview:prod`
- **Tests:** `pnpm test` (Vitest, `tests/unit/`)
- **Lint:** `pnpm lint` / `pnpm lint:fix`
- **Schema:** `pnpm db:push` after editing `src/server/db/schema.ts`
- **Seed:** `pnpm db:seed` (idempotent; `--force` overwrites settings/people)
- **Admin account:** `pnpm admin:create`

## Architecture rules

These are the constraints that keep the project coherent. Breaking one is
usually a mistake, not a shortcut.

1. **Pages never write SQL.** Every query lives in `src/server/repo/`. A page or
   API route calls a repository function.
2. **`src/server/` is server-only.** Nothing in it may be imported by a `.tsx`
   client island — it holds the database connection and secrets.
3. **No content is hardcoded in components.** Anything the owner might
   reasonably want to change comes from `site_settings`, `people`, `episodes` or
   `links`. If you find yourself typing show copy into a component, add a field.
4. **Vendored Starpod files stay close to upstream.** `src/components/`,
   `src/layouts/`, `src/styles/`, `src/assets/`, `src/svgs/` came from
   `starpod@1.1.0`. Change them only where the CMS requires it, and record it in
   `src/VENDORED.md`.
5. **Auth is enforced in `src/middleware.ts`,** not by URLs being unguessable.
   Any new `/admin` or `/api/admin` route is protected automatically; do not
   add a route that works around it.
6. **Owner-authored HTML is sanitized on write,** via `sanitizeHtml()` in
   `src/server/sanitize.ts`, before it reaches the database — never on render.
7. **CMS images render through `SmartImage.astro`, never a bare `<img>`.**
   A raw `<img>` serves the stored original — a 146 KB file to paint a 48×48
   avatar. `SmartImage` resizes to the display size and emits a srcset. The
   width ladder in `src/lib/image-sizes.mjs` is shared with `astro.config.mjs`
   because Vercel's image CDN rejects any width it was not configured with; add
   a size in one place and you must add it in the other. (A raw `<img>` inside
   a Preact island is fine — those are client-side previews of local files.)
8. **Listing queries are paginated and batched.** No query may load the whole
   archive, and per-row lookups in a loop (N+1) are a bug — see `guestsFor()` in
   `src/server/repo/episodes.ts` for the pattern.

## Data model

One singleton `site_settings` row holds all homepage/about/contact copy.
`people` holds hosts, team and guests in one table (`kind` distinguishes them),
so a person's photo and bio live in exactly one place. `episodes` links to
guests through `episode_people`. `media_assets` stores metadata only — bytes
live in object storage.

Episode numbers are deliberately **not** unique: the real back catalogue reuses
a few. The slug is the canonical identity.

## Uploads

Two paths, chosen by the server in `src/server/storage/direct.ts`:

- **Direct** (S3 configured): browser PUTs to a presigned URL, then registers
  the key. Required because serverless request bodies are capped at a few MB and
  episodes are far larger.
- **Proxy** (local disk): file posted to `/api/admin/upload`.

Images always go through the proxy so sharp can re-encode them; large ones are
downscaled in the browser first (`src/components/admin/upload-client.ts`).

File types are identified by magic bytes in `src/server/storage/validate.ts`,
never by filename or the browser's content type.

## Gotchas

- **`import.meta.env` is undefined under `tsx`.** `src/server/env.ts` handles
  both; use it rather than reading env vars directly.
- **Raw `sql` templates don't serialize `Date`.** Use drizzle operators (`gt`,
  `lt`, `eq`) for date comparisons.
- **`@apply` needs the Tailwind theme in scope.** Site CSS is imported *inside*
  `src/styles/global.css`, not as a separate stylesheet, for this reason.
- **Nothing extra belongs in the project root.** Files there are traced into the
  Vercel function bundle; keep scratch copies outside the repo.
- **`STORAGE_DRIVER=local` in production loses files.** The app warns; the fix
  is an S3-compatible bucket.
- **Images go through our own image service** (`src/server/image-service.ts`),
  not Astro's. Astro's imports sharp from inside its own package, which pnpm +
  Vite's SSR runner intermittently fails to resolve — every `/_image` returns
  500 and every picture on the site disappears at once. Ours imports sharp as a
  normal project dependency.
- **`SmartImage` makes site-relative URLs absolute** against the *request*
  origin. The image service fetches the file itself, and a bare `/media/...`
  path is not fetchable from a server process. Use the request origin, not
  `Astro.site` — they differ on any non-canonical port or host.
- **The sidebar carries `transition:persist`, so its DOM survives navigation.**
  Anything in it derived from the current URL — the active nav link above all —
  is therefore stale after a client-side navigation and has to be recomputed on
  `astro:page-load`. Server-rendered state alone is not enough. The same script
  saves and restores the sidebar's own scroll position, because a full page load
  resets it and the nav links sit near the bottom of a tall column.
- **The nav fallback in `Layout.astro` must stay `is:inline`.** Astro would
  bundle it otherwise, and its whole job is to survive a module that fails to
  load. It only cancels on `astro:before-swap` / `astro:page-load`; cancelling
  on `astro:before-preparation` disarms it before the failure it guards against.
- **When dev behaves oddly, check the production build before debugging.** The
  Vite dev server re-optimises dependencies mid-session and invalidates chunks
  a loaded page still holds; `pnpm build:node && pnpm preview:prod` answers
  "is this real?" in under a minute.

## Environment variables

`DATABASE_URL`, `SESSION_SECRET`, `PUBLIC_SITE_URL`, `STORAGE_DRIVER`,
`STORAGE_LOCAL_DIR`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, `MAX_AUDIO_BYTES`,
`MAX_IMAGE_BYTES`, `DISCORD_WEBHOOK`. All documented in `.env.example`.
