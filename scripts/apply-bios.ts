/**
 * Fills in the researched starter bios from `scripts/lib/bios.ts`.
 *
 *   pnpm db:bios            # only people whose bio is still empty
 *   pnpm db:bios --force    # overwrite existing bios too
 *
 * Without --force an edit the owner made in the admin panel is never touched.
 */

import 'dotenv/config';

import { sql } from 'drizzle-orm';

import { closeDb, getDb } from '../src/server/db';
import { people } from '../src/server/db/schema';
import { updatePerson } from '../src/server/repo/people';
import { sanitizeHtml } from '../src/server/sanitize';
import { BIOS } from './lib/bios';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function main() {
  const db = getDb();
  const force = process.argv.includes('--force');

  for (const entry of BIOS) {
    const found = await db
      .select({ id: people.id, bio: people.bio })
      .from(people)
      .where(sql`lower(${people.name}) = ${entry.name.toLowerCase()}`)
      .limit(1);

    if (!found[0]) {
      console.log(`· ${entry.name}: not in the database`);
      continue;
    }
    if (found[0].bio && !force) {
      console.log(`· ${entry.name}: already has a bio`);
      continue;
    }

    const html = `<ul>${entry.points.map((point) => `<li>${escape(point)}</li>`).join('')}</ul>`;
    await updatePerson(found[0].id, { bio: sanitizeHtml(html) });
    console.log(`✓ ${entry.name}`);
  }
}

main()
  .catch((error) => {
    console.error(`\n✗ ${(error as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
