/**
 * One-off: replaces every site image with the new show artwork (Sunil S Ranka
 * solo, several colour variants) and hides Shawn Flynn, who is no longer on
 * the artwork. Reads new-artwork/src-*.png, writes webp files into
 * public/media/images/artwork/, then points episodes, people and settings at
 * them.
 *
 *   pnpm tsx scripts/apply-artwork.ts
 */
import 'dotenv/config';

import { mkdir, readdir, rm } from 'node:fs/promises';
import { asc, eq, sql } from 'drizzle-orm';
import sharp from 'sharp';

import { closeDb, getDb } from '../src/server/db';
import { episodes, people, siteSettings } from '../src/server/db/schema';
import { invalidateSettingsCache } from '../src/server/repo/settings';

const OUT = 'public/media/images/artwork';
const BASE = '/media/images/artwork';

async function main() {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  const urls: string[] = [];

  const save = async (img: sharp.Sharp, name: string) => {
    await img.resize(1200, 1200, { fit: 'cover' }).webp({ quality: 84 }).toFile(`${OUT}/${name}.webp`);
    urls.push(`${BASE}/${name}.webp`);
  };

  // Full-size variants: white-on-dark, yellow, blue, cyan.
  for (const [i, name] of ['white', 'yellow', 'blue', 'cyan'].entries()) {
    await save(sharp(`new-artwork/src-${i + 1}.png`), name);
  }

  // The 3x2 grid: yellow, blue, teal / purple, red, white-dark. Crop inside
  // the yellow gutters.
  const grid = sharp('new-artwork/src-5.png');
  const { width = 0, height = 0 } = await grid.metadata();
  const tw = Math.floor(width / 3);
  const th = Math.floor(height / 2);
  const inset = Math.round(tw * 0.035);
  const names = ['grid-yellow', 'grid-blue', 'grid-teal', 'grid-purple', 'grid-red', 'grid-white'];
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const tile = sharp('new-artwork/src-5.png').extract({
        left: c * tw + inset,
        top: r * th + inset,
        width: tw - inset * 2,
        height: th - inset * 2
      });
      await save(tile, names[r * 3 + c]);
    }
  }

  // Interleaved so neighbouring episodes never share a similar colour.
  const order = ['yellow', 'blue', 'grid-red', 'grid-white', 'cyan', 'grid-purple', 'white', 'grid-teal', 'grid-yellow', 'grid-blue'];
  urls.sort((a, b) => order.findIndex((n) => a.endsWith(`/${n}.webp`)) - order.findIndex((n) => b.endsWith(`/${n}.webp`)));

  const db = getDb();
  const rows = await db.select({ id: episodes.id }).from(episodes).orderBy(asc(episodes.publishDate));
  for (const [i, row] of rows.entries()) {
    await db.update(episodes).set({ thumbnailUrl: urls[i % urls.length] }).where(eq(episodes.id, row.id));
  }

  const main = `${BASE}/yellow.webp`;
  await db.update(siteSettings).set({
    artworkUrl: main,
    heroImageUrl: main,
    aboutImageUrl: `${BASE}/blue.webp`,
    ctaImageUrl: `${BASE}/cyan.webp`,
    ogImageUrl: main
  });

  await db.update(people).set({ imageUrl: null });
  await db.update(people).set({ imageUrl: `${BASE}/white.webp` }).where(sql`lower(${people.name}) like 'sunil%'`);
  await db.update(people).set({ isVisible: false }).where(sql`lower(${people.name}) like 'shawn flynn%'`);
  invalidateSettingsCache();

  console.log(`${urls.length} artwork files, ${rows.length} episodes updated`);
  console.log((await readdir(OUT)).join(', '));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => closeDb());
