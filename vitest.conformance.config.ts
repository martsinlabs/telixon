import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    include: ['packages/core/conformance/**/*.test.ts'],
    setupFiles: ['./packages/core/src/test-setup.ts'],
  },
});
