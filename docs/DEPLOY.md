# Deploying to Vercel

Repository: <https://github.com/aryangupta-analytos/svtechpodcast> (private)

Three accounts are involved. All have free tiers that comfortably cover this
site. Work through them in order — Vercel needs the other two to exist first.

Total time: about 20 minutes.

---

## 1. Database — Neon (~3 min)

The entire site reads from Postgres: every episode, every word of homepage
copy, every login. Without it the site has nothing to render.

1. Sign up at <https://neon.tech> and create a project.
   Name it `svtechpodcast`, region closest to your listeners (US East is a
   sensible default).
2. Neon shows a **connection string** on the dashboard. Copy it. It looks like:

   ```
   postgresql://neondb_owner:xxxxx@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

3. Create the tables and load the content, from this project directory:

   ```bash
   DATABASE_URL="<paste the connection string>" pnpm db:push
   DATABASE_URL="<paste the connection string>" pnpm db:seed
   DATABASE_URL="<paste the connection string>" pnpm admin:create
   ```

   `db:seed` re-imports the Wix and Podbean content into the new database.
   `admin:create` asks for the email and password you will sign in with.

   **Use a new password here.** The local one was generated during development
   and has been shared in plain text; it must not protect a public site.

---

## 2. Media storage — Cloudflare R2 (~7 min)

Vercel wipes its filesystem between requests, so uploads have to go somewhere
permanent. R2 is S3-compatible and — unlike S3 — charges nothing for bandwidth,
which matters when you are serving audio.

1. Sign up at <https://dash.cloudflare.com>, open **R2**, create a bucket named
   `svtechpodcast-media`.
2. **Settings → Public access → Allow Access**. Cloudflare gives the bucket a
   public URL like `https://pub-xxxxxxxx.r2.dev`. Copy it.
3. **Settings → CORS policy**, add this. The browser uploads audio straight to
   the bucket, and without this the browser refuses:

   ```json
   [
     {
       "AllowedOrigins": ["https://your-site.vercel.app"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type", "cache-control"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Come back and add your real domain here once Vercel has given you one.
4. **R2 → Manage API Tokens → Create API Token**, permission **Object Read &
   Write**, scoped to this bucket. Copy the Access Key ID and Secret Access Key
   — the secret is shown once.
5. Note your account ID from the R2 page; the endpoint is
   `https://<account-id>.r2.cloudflarestorage.com`.

---

## 3. Vercel (~5 min)

1. Go to <https://vercel.com/new>, sign in with GitHub, and import
   **aryangupta-analytos/svtechpodcast**.
2. Framework preset is detected as Astro. Leave the build settings alone.
3. Add these environment variables before the first deploy:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | The Neon connection string from step 1 |
   | `SESSION_SECRET` | Generate a fresh one — see below |
   | `PUBLIC_SITE_URL` | `https://your-site.vercel.app` (update after step 4) |
   | `STORAGE_DRIVER` | `s3` |
   | `S3_BUCKET` | `svtechpodcast-media` |
   | `S3_REGION` | `auto` |
   | `S3_ENDPOINT` | `https://<account-id>.r2.cloudflarestorage.com` |
   | `S3_ACCESS_KEY_ID` | From step 2 |
   | `S3_SECRET_ACCESS_KEY` | From step 2 |
   | `S3_PUBLIC_URL` | The `https://pub-xxxx.r2.dev` URL from step 2 |

   Generate the session secret with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
   ```

   It signs admin session cookies. It must be different from the local one, and
   changing it later signs everyone out — which is the fastest way to revoke
   access if you ever need to.

4. Deploy. Vercel gives you a URL. Put that URL into `PUBLIC_SITE_URL`, add it
   to the R2 CORS policy from step 2, and redeploy so canonical links, the RSS
   feed and uploads all point at the right place.

---

## 4. Move the existing images across

The 14 migrated episodes keep their audio on Podbean's CDN, so they play
immediately. The images, though, are currently on this machine in `storage/`
and need to be in R2.

The simplest route is to re-run the migration against production, which
downloads them from the original sources straight into the new bucket:

```bash
DATABASE_URL="<neon url>" \
STORAGE_DRIVER=s3 \
S3_BUCKET=svtechpodcast-media \
S3_REGION=auto \
S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com" \
S3_ACCESS_KEY_ID="..." \
S3_SECRET_ACCESS_KEY="..." \
S3_PUBLIC_URL="https://pub-xxxx.r2.dev" \
pnpm db:seed --force
```

Then confirm nothing is still pointing at another server:

```bash
DATABASE_URL="<neon url>" ... pnpm exec tsx scripts/localise-images.ts
```

---

## 5. Check it

- Open the site. The homepage, episode archive and an episode page should all
  load, and audio should play.
- Sign in at `/admin/login` with the account from step 1.
- Add a test episode with a real audio file. If the upload completes and plays,
  storage is wired correctly — that is the step most likely to be misconfigured.
- Delete the test episode.

## 6. Tell the podcast directories

The site publishes its own feed at `https://your-site/rss.xml`, built from the
database. Submit that URL to Apple Podcasts, Spotify and Podbean. After that,
publishing an episode in the admin is all it takes to reach subscribers — the
feed updates itself.

The address is shown in the admin under **Social Links**.

---

## A custom domain

In Vercel: **Settings → Domains → Add**, enter `svtechpodcast.com`, and follow
the DNS instructions. Then update `PUBLIC_SITE_URL` and the R2 CORS origin to
the new domain and redeploy.

---

## If something breaks

**Every image is broken.** `S3_PUBLIC_URL` is wrong, or the bucket is not
public. Open an image URL directly in a browser to see which.

**Uploads fail with a CORS error.** The site's origin is missing from the R2
CORS policy in step 2, or it lists `http://` where the site is `https://`.

**The site loads but has no content.** `DATABASE_URL` points at an empty
database — run `pnpm db:seed` against it.

**Cannot sign in.** Run `pnpm admin:create` against the production
`DATABASE_URL`; re-running it on an existing email resets that password.

**Uploaded files disappear.** `STORAGE_DRIVER` is still `local`. The app logs a
warning about this on boot.

## Self-hosted (current production): svtechpodcast.com on the EC2 box

The site runs as a Docker container behind the shared nginx on
`3.147.113.64` (ubuntu@, key `new-analytos.pem`). The database is the Neon
project `podcast`; uploads live in the Docker volume `svtechpodcast_svtech_uploads`.

- Code: `~/svtechpodcast` (clone of github.com/aryangupta-analytos/podcast, `main`)
- Secrets: `~/svtechpodcast/.env.production` (DATABASE_URL, SESSION_SECRET, …)
- nginx: `/etc/nginx/sites-enabled/svtechpodcast`; certificate by certbot, auto-renewed
- App port: `127.0.0.1:4321` (container `svtech-podcast`, restarts automatically)

Deploy a new version:

```bash
ssh -i new-analytos.pem ubuntu@3.147.113.64
cd ~/svtechpodcast && git pull && docker compose -f docker-compose.prod.yml up -d --build
```

Logs: `docker logs -f svtech-podcast`. The Vercel deployment at
podcast-weld-alpha.vercel.app is a preview only and shares the same database.
