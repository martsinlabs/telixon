import angular from '@analogjs/vite-plugin-angular';
import { fileURLToPath } from 'node:url';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const packageRoot: string = fileURLToPath(new URL('.', import.meta.url));

// The Angular compiler recognizes signal inputs and queries, which plain JIT compilation would drop.
export default defineConfig({
  plugins: [angular({ tsconfig: `${packageRoot}tsconfig.json`, jit: true }), tsconfigPaths()],
  test: {
    name: 'angular',
    root: packageRoot,
    include: ['src/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['../core/src/test-setup.ts', './src/test-setup.ts'],
  },
});
