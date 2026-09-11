import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions
} from 'node:crypto';
import { promisify } from 'node:util';

/**
 * `promisify` collapses scrypt's overloads onto the three-argument form, which
 * drops the options parameter this module depends on. The cast restores the
 * signature that is actually being called.
 */
const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: ScryptOptions
) => Promise<Buffer>;

/**
 * scrypt parameters. N=2^16 with r=8 costs ~64 MB and ~100 ms per hash on a
 * modern CPU — deliberately slow, so a stolen database is not a usable
 * password list. Stored alongside the hash so these can be raised later
 * without invalidating existing passwords.
 */
const N = 2 ** 16;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;
// scrypt needs memory proportional to 128 * N * r; Node's default 32 MB cap is
// too small for N=2^16, so raise it explicitly.
const MAX_MEMORY = 256 * 1024 * 1024;

/**
 * Hashes a password with a per-password random salt.
 * Format: `scrypt$N$r$p$<salt-hex>$<hash-hex>`
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = await scryptAsync(password.normalize('NFKC'), salt, KEY_LENGTH, {
    N,
    r,
    p,
    maxmem: MAX_MEMORY
  });

  return [
    'scrypt',
    N,
    r,
    p,
    salt.toString('hex'),
    derived.toString('hex')
  ].join('$');
}

/**
 * Constant-time password check. Returns false rather than throwing on a
 * malformed stored hash so a corrupt row can't be distinguished by timing or
 * by an error page.
 */
export async function verifyPassword(
  password: string,
  stored: string
): Promise<boolean> {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

    const [, nRaw, rRaw, pRaw, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');

    const derived = await scryptAsync(
      password.normalize('NFKC'),
      salt,
      expected.length,
      {
        N: Number(nRaw),
        r: Number(rRaw),
        p: Number(pRaw),
        maxmem: MAX_MEMORY
      }
    );

    return derived.length === expected.length && timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/** Minimum policy for a new or changed password. */
export function validatePasswordStrength(password: string): string | null {
  if (password.length < 12) {
    return 'Password must be at least 12 characters.';
  }
  if (password.length > 200) {
    return 'Password must be under 200 characters.';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }
  return null;
}
