import { playwright } from '@vitest/browser-playwright';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const packageRoot: string = fileURLToPath(new URL('.', import.meta.url));

// Form association and custom states exist in browsers only. The element tests run in three engines and the server entry test in Node.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    root: packageRoot,
    projects: [
      {
        extends: true,
        test: {
          name: 'web-components',
          include: ['src/**/*.test.ts'],
          exclude: ['src/**/*.node.test.ts'],
          setupFiles: ['./src/test-setup.ts'],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: 'chromium' }, { browser: 'firefox' }, { browser: 'webkit' }],
          },
        },
      },
      {
        extends: true,
        test: {
          name: 'web-components-node',
          include: ['src/**/*.node.test.ts'],
          environment: 'node',
        },
      },
    ],
  },
});
