import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    // Password hashing is deliberately slow; give it room.
    testTimeout: 20000
  }
});
