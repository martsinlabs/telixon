import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    include: ['packages/core/conformance/**/*.test.ts'],
    setupFiles: ['./packages/core/src/test-setup.ts'],
  },
});
