import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    // Client-side demo scripts shipped by the docs app run in the browser.
    files: ['apps/docs/src/components/demos/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['scripts/**/*.{mjs,js}', '**/*.config.{mjs,js}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        URL: 'readonly',
        global: 'readonly',
      },
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/engine/**', '**/.cache/**', '**/.astro/**'],
  },
  prettier,
];
