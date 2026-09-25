import js from '@eslint/js';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.cts', '**/*.mts'],
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
  // Angular sources take the Angular rules, with the template rules and the accessibility rules on their templates.
  ...angular.configs.tsRecommended.map((config) => ({
    ...config,
    files: ['packages/angular/**/*.ts', 'examples/angular/**/*.ts'],
    processor: angular.processInlineTemplates,
  })),
  {
    files: ['packages/angular/**/*.ts'],
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'telixon', style: 'camelCase' }],
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'telixon', style: 'kebab-case' }],
      // The directive's selector doubles as its options input, the way ngModel names its own, and the
      // picker's `for` reads like the label attribute while the class keeps a descriptive name.
      '@angular-eslint/no-input-rename': ['error', { allowedNames: ['telixonPhoneInput', 'for'] }],
    },
  },
  {
    files: ['examples/angular/**/*.ts'],
    rules: {
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'app', style: 'kebab-case' }],
    },
  },
  ...[...angular.configs.templateRecommended, ...angular.configs.templateAccessibility].map((config) => ({
    ...config,
    files: ['packages/angular/**/*.html', 'examples/angular/**/*.html'],
  })),
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
    files: ['**/scripts/**/*.{mjs,js}', '**/*.config.{mjs,js}'],
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
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/engine/**',
      '**/.cache/**',
      '**/.astro/**',
      '**/public/demos/**',
      '**/test-results/**',
      '**/playwright-report/**',
    ],
  },
  prettier,
];
