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

`newsletter_subscribers` holds signups from the homepage band (`POST
/api/newsletter`); the owner views and exports them at `/admin/subscribers`.
`site_settings.accent1..4` are the owner-editable brand accents; every other
colour is fixed in `src/styles/theme.css`.

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
- **The header is server-rendered on every request and must not be
  `transition:persist`ed.** Its active nav link is computed from
  `Astro.url.pathname` in `SiteHeader.astro`; persisting the header across
  client-side navigations would freeze that state on whichever page loaded
  first. Only the audio player and the search dialog persist.
- **One theme, no `dark:`.** The public site is a single navy theme. Colours
  come from the tokens in `src/styles/theme.css` (bridged into Tailwind as
  `bg-ink`, `text-heading`, `bg-accent-2`, …). Never reintroduce `dark:`
  variants or `prefers-color-scheme` blocks outside `admin.css`; the four
  accents are the only colours the owner can change, via `site_settings`.
- **A new `site_settings` column must also be added to the homepage form.** The
  handler in `src/pages/admin/homepage.astro` writes every field on every save,
  so a column that exists in the schema but not in that form is silently reset
  to its empty value the next time the owner clicks Save.
- **Videos are episodes.** There is no videos table: `/videos` and the homepage
  row list published episodes whose `youtubeUrl` parses (`src/lib/youtube.ts`),
  and `LiteYouTube.tsx` embeds them on click. The YouTube thumbnail is the one
  sanctioned bare `<img>` — it is a remote asset, not CMS media.
- **Bundled carousel/tab scripts re-init on `astro:page-load`** and guard with a
  `data-ready` flag, because the ClientRouter swaps the DOM without reloading
  scripts. Any new interactive Astro component must do the same.
- **The nav fallback in `Layout.astro` must stay `is:inline`.** Astro would
  bundle it otherwise, and its whole job is to survive a module that fails to
  load. It only cancels on `astro:before-swap` / `astro:page-load`; cancelling
  on `astro:before-preparation` disarms it before the failure it guards against.
- **Admin forms post JSON, not form encodings.** Every admin form is submitted
  by `fetch` as `application/json` (`src/components/admin/FormTransport.astro`),
  and handlers read it with `readFormData()` / `readUploadData()` from
  `src/server/read-form.ts` rather than `request.formData()` directly. This is
  not decoration: Cloudflare's free quick tunnels reject a POST carrying
  `application/x-www-form-urlencoded` or `multipart/form-data` at their edge
  ("Cross-site POST form submissions are forbidden") so it never reaches the
  origin, and the whole admin panel becomes unusable through a shared URL. JSON
  is forwarded untouched. A new admin page must use the helper; calling
  `request.formData()` works locally and fails through a tunnel, which is the
  worst way for it to fail. The CSRF Origin check in `src/middleware.ts` is
  unaffected and still rejects cross-site posts of any encoding.
- **A file input inside an admin form must stay unnamed** unless the form really
  should post the bytes. The upload islands leave theirs unnamed on purpose —
  they upload to `/api/admin/upload` and write the id into a hidden field — and
  `FormTransport` falls back to a native (tunnel-blocked) submit the moment it
  sees a *named* file input holding a file.
- **When dev behaves oddly, check the production build before debugging.** The
  Vite dev server re-optimises dependencies mid-session and invalidates chunks
  a loaded page still holds; `pnpm build:node && pnpm preview:prod` answers
  "is this real?" in under a minute.

## Environment variables

`DATABASE_URL`, `SESSION_SECRET`, `PUBLIC_SITE_URL`, `STORAGE_DRIVER`,
`STORAGE_LOCAL_DIR`, `S3_BUCKET`, `S3_REGION`, `S3_ENDPOINT`,
`S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`, `MAX_AUDIO_BYTES`,
`MAX_IMAGE_BYTES`, `DISCORD_WEBHOOK`. All documented in `.env.example`.
- **`X-Frame-Options` must stay `SAMEORIGIN`, not `DENY`.** In development the
  ClientRouter loads the next page in a hidden same-origin iframe whenever that
  page has a `client:only` island (the audio player is one). `DENY` blocks the
  frame, the router's navigation never completes, and the fallback in
  `Layout.astro` turns every click into a full reload — which also drops the
  playing episode. `SAMEORIGIN` keeps third-party framing blocked.
- **Do not use `client:only` on anything in `Layout.astro`.** In development the
  ClientRouter loads the *next* page a second time in a hidden iframe whenever
  that page contains a `client:only` island, and waits up to a second for it to
  hydrate before swapping. With the audio player as `client:only`, every
  navigation on the site paid that cost. It is `client:load` now (it renders
  nothing on the server until an episode is chosen) and still persists across
  navigation.
