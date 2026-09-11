/**
 * Creates (or resets) the admin account.
 *
 *   pnpm admin:create
 *   pnpm admin:create -- --email you@example.com --name "Your Name"
 *
 * The password is never passed as an argument — it would end up in the shell
 * history and the process list. It is read from stdin with echo off, or
 * generated and printed once.
 */

import 'dotenv/config';

import { randomBytes } from 'node:crypto';
import { createInterface } from 'node:readline';

import { sql } from 'drizzle-orm';

import { hashPassword, validatePasswordStrength } from '../src/server/auth/password';
import { closeDb, getDb } from '../src/server/db';
import { users } from '../src/server/db/schema';

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

/** Reads a line from the terminal without echoing it. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const input = process.stdin as NodeJS.ReadStream & { isTTY?: boolean };

    process.stdout.write(question);

    // Suppress echo for the duration of the answer.
    const onData = () => process.stdout.write('');
    if (input.isTTY) {
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput =
        onData;
    }

    rl.question('', (answer) => {
      rl.close();
      process.stdout.write('\n');
      resolve(answer);
    });
  });
}

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const db = getDb();

  const email = (flag('email') ?? (await prompt('Admin email: '))) || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error(`"${email}" is not a valid email address.`);
  }

  const name =
    (flag('name') ?? (await prompt('Display name: '))) || 'Podcast Owner';

  let password = process.env.ADMIN_PASSWORD ?? '';
  let generated = false;

  if (!password && process.stdin.isTTY) {
    password = await promptHidden('Password (leave blank to generate one): ');
  }

  if (!password) {
    // 24 random bytes ≈ 192 bits — far beyond anything guessable, and the
    // owner is expected to store it in a password manager.
    password = randomBytes(18).toString('base64url');
    generated = true;
  }

  const problem = validatePasswordStrength(password);
  if (problem) throw new Error(problem);

  const passwordHash = await hashPassword(password);

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${email.toLowerCase()}`)
    .limit(1);

  if (existing[0]) {
    await db
      .update(users)
      .set({
        passwordHash,
        name,
        failedAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(sql`lower(${users.email}) = ${email.toLowerCase()}`);
    console.log(`\n✓ Password reset for ${email}`);
  } else {
    await db
      .insert(users)
      .values({ email, name, passwordHash, role: 'owner' });
    console.log(`\n✓ Admin account created for ${email}`);
  }

  if (generated) {
    console.log(`\n  Password: ${password}`);
    console.log('  Save it now — it is not stored anywhere in readable form.');
  }

  console.log('\n  Sign in at /admin/login\n');
}

main()
  .catch((error) => {
    console.error(`\n✗ ${(error as Error).message}\n`);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
