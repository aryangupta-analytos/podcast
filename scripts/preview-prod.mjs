/**
 * Runs the Node-adapter production build.
 *
 * This is the real output — bundled, hashed assets, no dev-server module
 * loading — so it is the right place to confirm behaviour before deploying.
 * The Vite dev server resolves and re-optimises modules on the fly, which has
 * its own failure modes; "works in dev" and "works when shipped" are separate
 * questions, and this answers the second one.
 *
 *   pnpm build:node && pnpm preview:prod
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// The Node adapter writes dist/server/index.mjs; some versions used entry.mjs,
// so accept either rather than break on an adapter upgrade.
const candidates = ['dist/server/index.mjs', 'dist/server/entry.mjs'];
const entry = candidates.find((candidate) => existsSync(candidate));

if (!entry) {
  console.error(
    `\nNo production build found (looked for ${candidates.join(', ')}).\n` +
      `Build it first:\n\n  pnpm build:node\n`
  );
  process.exit(1);
}

const port = process.env.PORT ?? '4321';
const host = process.env.HOST ?? '127.0.0.1';

console.log(`\n  Serving the production build from ${entry}`);
console.log(`  http://localhost:${port}\n`);

const result = spawnSync(process.execPath, [entry], {
  stdio: 'inherit',
  env: { ...process.env, HOST: host, PORT: port }
});

process.exit(result.status ?? 1);
