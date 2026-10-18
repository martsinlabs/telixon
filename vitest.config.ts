import codspeed from '@codspeed/vitest-plugin';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [codspeed()],
  resolve: { tsconfigPaths: true },
  test: {
    setupFiles: ['./packages/core/src/test-setup.ts'],
    exclude: [...configDefaults.exclude, '**/conformance/**', '**/e2e/**'],
    // The Angular package compiles through the Angular compiler in a project of its own, while the web
    // components package runs in real browsers through its own config and its own CI job.
    projects: [
      {
        extends: true,
        test: {
          name: 'packages',
          exclude: [
            ...configDefaults.exclude,
            '**/conformance/**',
            '**/e2e/**',
            'packages/angular/**',
            'packages/web-components/**',
          ],
        },
      },
      './packages/angular/vitest.config.ts',
      './packages/angular/vitest.schematics.config.ts',
    ],
  },
});
