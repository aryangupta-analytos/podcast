# The Silicon Valley Tech Podcast

The podcast website and its admin panel. Built on the design system from
[Starpod](https://github.com/shipshapecode/starpod), with a Postgres-backed CMS
so the show's owner can publish episodes without touching code.

- **Public site** — homepage, episode archive, episode pages, people pages,
  about, contact, RSS feed, sitemap.
- **Admin panel** at `/admin` — add and edit episodes, upload audio and images,
  edit every part of the homepage, manage hosts, team and guests, manage links,
  read contact messages.

If you are the show's owner and just want to publish an episode, read
[docs/OWNER-GUIDE.md](docs/OWNER-GUIDE.md) instead — it has no code in it.

## Quick start

```bash
pnpm install
docker compose up -d          # Postgres on localhost:55432
cp .env.example .env          # then set SESSION_SECRET (see below)
pnpm db:push                  # create the tables
pnpm db:seed                  # import the Wix + Podbean content
pnpm admin:create             # create your login
pnpm dev                      # http://localhost:4321
```

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Stack

| Layer     | Choice                        | Why                                                     |
| --------- | ----------------------------- | ------------------------------------------------------- |
| Framework | Astro 6, server-rendered      | Publishing is live immediately; no rebuild per episode   |
| UI        | Astro components + Preact     | Almost no JavaScript ships; islands only where needed    |
| Styling   | Tailwind 4 (public site)      | Inherited from Starpod, unchanged                        |
| Database  | Postgres via Drizzle ORM      | Typed queries, plain SQL underneath, easy to host        |
| Storage   | Pluggable: local disk or S3   | Runs with no cloud account; flips to a CDN via env vars  |
| Auth      | Own session cookies + scrypt  | One owner account, no third-party dependency             |

### Why Starpod is vendored, not installed

The `starpod` npm package generates a whole podcast site from an RSS feed at
build time. That is excellent for a feed-driven site and wrong for this one: it
injects its pages from `node_modules` (so the homepage cannot be made editable),
reads every episode from a feed (so there is no CMS), and builds statically (so
publishing needs a redeploy).

So its MIT-licensed source is vendored into `src/` — components, layout, styles,
player, search — and only the data layer is replaced. Details and the diff
against upstream are in [src/VENDORED.md](src/VENDORED.md).

## Layout

```
src/
  components/          Starpod components, adapted to read from the database
    admin/             Admin-only islands: uploaders, guest picker
    home/              Homepage sections
  layouts/             Layout.astro (public), AdminLayout.astro (admin)
  pages/
    index.astro        Homepage — every section comes from the CMS
    episodes/          Archive and episode pages
    people/            Host, team and guest pages
    admin/             The admin panel. Protected by src/middleware.ts
    api/               Public: search, contact. Admin: uploads
    rss.xml.ts         The podcast feed, generated from the database
  server/              Server-only. Never imported by a client component.
    auth/              Password hashing, sessions, login
    db/                Drizzle schema and connection
    repo/              All database queries live here
    forms/             Form parsing and validation
    storage/           Media pipeline: local and S3 drivers
    sanitize.ts        HTML sanitizer for owner-authored rich text
  middleware.ts        Auth enforcement, CSRF origin check, security headers
scripts/
  seed.ts              One-time content migration (safe to re-run)
  create-admin.ts      Create or reset the admin account
tests/unit/            Vitest — sanitizer, passwords, slugs, guest parsing
```

The rule that keeps this maintainable: **pages never write SQL**. They call a
function in `src/server/repo/`, which is the only place queries live.

## Commands

| Command             | What it does                                        |
| ------------------- | --------------------------------------------------- |
| `pnpm dev`          | Dev server on :4321                                 |
| `pnpm build`        | Type-check then build for production                |
| `pnpm test`         | Unit tests                                          |
| `pnpm lint`         | ESLint                                              |
| `pnpm db:up`        | Start local Postgres                                |
| `pnpm db:push`      | Apply the schema to the database                    |
| `pnpm db:studio`    | Browse the database in a GUI                        |
| `pnpm db:seed`      | Import the legacy Wix + Podbean content             |
| `pnpm admin:create` | Create an admin account, or reset a password        |
| `pnpm media:prune`  | Report stored files with no database row (`--delete`) |
| `pnpm build:node`   | Build with the Node adapter, for running locally     |
| `pnpm preview:prod` | Serve that build on :4321 — the real thing          |

## Checking a change properly

`pnpm dev` is for editing. Before believing anything about how the site
behaves — navigation, images, hydration — run the real build:

```bash
pnpm build:node
pnpm preview:prod       # http://localhost:4321
```

The dev server re-optimises its dependency bundle whenever it meets a new
import, which invalidates chunks the open page is still holding. That produces
failures with no equivalent in the shipped site, so "broken in dev" and "broken"
are different claims.

## Deploying

The app targets Vercel (`@astrojs/vercel` is already configured). Two things
must be set up before going live.

### 1. A Postgres database

Create one on [Neon](https://neon.tech), [Supabase](https://supabase.com) or
anywhere else, and set `DATABASE_URL`. Then apply the schema:

```bash
DATABASE_URL="postgres://…" pnpm db:push
DATABASE_URL="postgres://…" pnpm db:seed
DATABASE_URL="postgres://…" pnpm admin:create
```

### 2. Object storage — required, not optional

`STORAGE_DRIVER=local` writes uploads to the server's filesystem. On Vercel
that filesystem is wiped between requests, so **uploads would silently
disappear**. The app logs a warning if it detects this combination.

Create an S3-compatible bucket — [Cloudflare R2](https://developers.cloudflare.com/r2/)
is the best fit for podcast audio because it charges nothing for bandwidth — and
set:

```
STORAGE_DRIVER=s3
S3_BUCKET=svtechpodcast-media
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=…
S3_SECRET_ACCESS_KEY=…
S3_PUBLIC_URL=https://media.svtechpodcast.com
S3_REGION=auto
```

The bucket needs public read access on objects and a CORS rule allowing `PUT`
from your site's origin, because the browser uploads audio straight to it:

```json
[
  {
    "AllowedOrigins": ["https://svtechpodcast.com"],
    "AllowedMethods": ["PUT"],
    "AllowedHeaders": ["content-type", "cache-control"],
    "MaxAgeSeconds": 3600
  }
]
```

### 3. Environment variables on Vercel

Set `DATABASE_URL`, `SESSION_SECRET` (a fresh one, not the local value),
`PUBLIC_SITE_URL`, and the `S3_*` variables. Nothing else is required.

### Submit the feed

The site publishes its own podcast feed at `/rss.xml`, built from the database.
Point Apple Podcasts, Spotify and Podbean at it — after that, publishing an
episode in the admin panel is all it takes for listeners to receive it. The URL
is shown in the admin under **Social Links**.

## How uploads work

Audio files are far larger than a serverless function's request body limit
(~4.5 MB on Vercel), so the path depends on what is configured:

- **S3 configured** — the browser asks the server for a short-lived signed URL
  and uploads straight to the bucket, then tells the server where the file
  landed. The server verifies it issued that key (HMAC) and confirms the object
  exists before recording it.
- **Local disk** — the file is posted to `/api/admin/upload`, which validates
  and stores it. Fine for development.

Images always go through the server so they are re-encoded to WebP, downscaled,
and stripped of EXIF. Large images are downscaled in the browser first so they
fit through the request limit.

## Security

- Admin routes and `/api/admin/*` are enforced in `src/middleware.ts`. Hiding
  the URL is not the control — authentication is.
- Passwords are scrypt-hashed (N=2¹⁶) with a per-password salt. Sessions are
  random tokens stored as SHA-256 hashes with an HMAC-signed cookie
  (`HttpOnly`, `SameSite=Lax`, `Secure` and `__Host-` prefixed in production).
- Every state-changing request is rejected unless its `Origin` matches the site.
- Repeated failed logins lock an account for 15 minutes.
- Uploads are identified by magic bytes, never by filename or the
  browser-supplied content type.
- Owner-authored HTML is sanitized with an allowlist (`src/server/sanitize.ts`).
- `/admin` is absent from the sitemap, disallowed in `robots.txt`, sent with
  `X-Robots-Tag: noindex`, and never linked from a public page.

## Performance

- Public pages are server-rendered and sent with
  `s-maxage=60, stale-while-revalidate=600`, so the CDN serves almost every
  visitor while a publish still appears within seconds.
- No listing query ever loads the whole archive — the homepage loads only the
  configured number of episodes, and the archive is paginated.
- Episode guests are loaded in one batched query, not one per episode.
- Search runs on the server and returns at most eight rows, rather than
  shipping the catalogue to the browser.
- Every CMS image renders through `SmartImage.astro`, which resizes it to the
  size it is actually displayed at and emits a 1x/2x srcset. Serving stored
  originals instead costs 5.1 MB across the main pages; this costs 172 KB. In
  production the resizing runs on Vercel's image CDN and is cached at the edge.
  The width ladder lives in `src/lib/image-sizes.mjs` and is imported by both
  the component and `astro.config.mjs` — Vercel only serves widths it was
  configured with, so the two must never drift apart.
- Uploaded originals are stored as WebP and served `immutable`; audio is served
  from object storage with range requests so players can seek.

## Licence

Site code: MIT. Vendored Starpod source: MIT, see `LICENSE-starpod.md`.
