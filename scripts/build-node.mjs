/**
 * Builds the site with the Node adapter so it can be run locally exactly as it
 * would be in production.
 *
 * A wrapper rather than `ADAPTER=node astro build` in package.json because that
 * syntax does not work in PowerShell, and this project is developed on Windows.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

// `astro` lives in node_modules/.bin, which is not on PATH for a spawned
// process; resolve the package's own CLI instead of relying on the shell.
const require = createRequire(import.meta.url);
const astro = fileURLToPath(
  new URL('bin/astro.mjs', pathToFileURL(require.resolve('astro/package.json')))
);

const result = spawnSync(process.execPath, [astro, 'build'], {
  stdio: 'inherit',
  env: { ...process.env, ADAPTER: 'node' }
});

process.exit(result.status ?? 1);
