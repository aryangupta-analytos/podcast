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

Upstream LICENSE is preserved at `LICENSE-starpod.md`.

To diff against upstream, fetch the same version again:

```bash
npm pack starpod@1.1.0 && tar -xzf starpod-1.1.0.tgz
```

The original Starpod-based project this was adapted from (the whiskey.fm
site) is unmodified at `Downloads/www-starpod-main`. It is kept outside this
repository on purpose: anything inside the project root is traced into the
deployment bundle.
