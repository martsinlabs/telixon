import codspeed from '@codspeed/vitest-plugin';
import tsconfigPaths from 'vite-tsconfig-paths';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths(), codspeed()],
  test: {
    setupFiles: ['./packages/core/src/test-setup.ts'],
    exclude: [...configDefaults.exclude, '**/conformance/**'],
  },
});
