import { describe, expect, it } from 'vitest';

import {
  hashPassword,
  validatePasswordStrength,
  verifyPassword
} from '../../src/server/auth/password';

describe('password hashing', () => {
  it('accepts the correct password and rejects a wrong one', async () => {
    const hash = await hashPassword('correct horse battery 42');
    expect(await verifyPassword('correct horse battery 42', hash)).toBe(true);
    expect(await verifyPassword('correct horse battery 43', hash)).toBe(false);
  });

  it('never stores the password in the hash', async () => {
    const hash = await hashPassword('supersecret-password-1');
    expect(hash).not.toContain('supersecret');
  });

  it('salts, so the same password hashes differently every time', async () => {
    const [a, b] = await Promise.all([hashPassword('same password 1'), hashPassword('same password 1')]);
    expect(a).not.toBe(b);
    expect(await verifyPassword('same password 1', b)).toBe(true);
  });

  it('records its parameters so they can be raised later', async () => {
    const hash = await hashPassword('parameters in the hash 1');
    expect(hash.startsWith('scrypt$65536$8$1$')).toBe(true);
  });

  it('returns false rather than throwing on a malformed stored hash', async () => {
    for (const bad of ['', 'nonsense', 'scrypt$1$2$3', 'bcrypt$a$b$c$d$e', '$$$$$']) {
      expect(await verifyPassword('anything', bad)).toBe(false);
    }
  });

  it('treats unicode-equivalent passwords as the same', async () => {
    // "é" composed vs decomposed — a password manager may send either.
    const hash = await hashPassword('caf\u00e9-password-1');
    expect(await verifyPassword('cafe\u0301-password-1', hash)).toBe(true);
  });
});

describe('validatePasswordStrength', () => {
  it('accepts a reasonable password', () => {
    expect(validatePasswordStrength('a-good-password-9')).toBeNull();
  });

  it('rejects short passwords', () => {
    expect(validatePasswordStrength('short1')).toMatch(/12 characters/);
  });

  it('requires a letter and a number', () => {
    expect(validatePasswordStrength('123456789012')).toMatch(/letter and one number/);
    expect(validatePasswordStrength('abcdefghijkl')).toMatch(/letter and one number/);
  });

  it('rejects an absurdly long password rather than hashing it', () => {
    expect(validatePasswordStrength('a1'.repeat(200))).toMatch(/under 200/);
  });
});
