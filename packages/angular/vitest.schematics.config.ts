import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageRoot: string = fileURLToPath(new URL('.', import.meta.url));

// The schematics run in Node inside the Angular CLI, which the tests mirror without the Angular compiler.
export default defineConfig({
  test: {
    name: 'angular-schematics',
    root: packageRoot,
    include: ['schematics/**/*.test.ts'],
    environment: 'node',
  },
});
