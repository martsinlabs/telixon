import codspeed from '@codspeed/vitest-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), codspeed()],
  test: {
    setupFiles: ['./packages/core/src/test-setup.ts'],
    exclude: [...configDefaults.exclude, '**/conformance/**'],
    // The Angular package compiles through the Angular compiler in a project of its own.
    projects: [
      {
        extends: true,
        test: { name: 'packages', exclude: [...configDefaults.exclude, '**/conformance/**', 'packages/angular/**'] },
      },
      './packages/angular/vitest.config.ts',
      './packages/angular/vitest.schematics.config.ts',
    ],
  },
});
