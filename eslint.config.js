import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import eslintPluginAstro from 'eslint-plugin-astro';
import globals from 'globals';

export default [
  js.configs.recommended,
  ...eslintPluginAstro.configs.recommended,

  {
    ignores: [
      '.astro/**',
      '.vercel/**',
      'dist/**',
      'node_modules/**',
      'storage/**',
      'drizzle/**'
    ]
  },

  // TypeScript needs its own parser; the base rules below still apply.
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' }
    },
    rules: {
      // The TypeScript compiler already reports these, and it understands
      // types and overloads, which ESLint's version does not.
      'no-undef': 'off',
      'no-unused-vars': 'off'
    }
  },

  // Vendored Starpod source (see src/VENDORED.md). Kept close to upstream so
  // it stays diffable, so upstream's regex style is not restyled here.
  {
    files: ['src/utils/**', 'src/components/player/**'],
    rules: {
      'no-useless-escape': 'off'
    }
  },

  // Browser code: components and anything hydrated on the client.
  {
    files: ['src/components/**', 'src/layouts/**', 'src/pages/**'],
    languageOptions: { globals: { ...globals.browser } }
  },

  // Server code: config, scripts, and everything under src/server.
  {
    files: [
      '*.config.{js,mjs,ts}',
      'scripts/**',
      'src/server/**',
      'src/middleware.ts',
      'tests/**'
    ],
    languageOptions: { globals: { ...globals.node } }
  },

  // Astro API routes and pages run on the server but may also reference
  // browser types in inline scripts.
  {
    files: ['src/pages/**/*.{ts,astro}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } }
  }
];
