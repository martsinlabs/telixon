import { defineConfig } from 'vite';

// Measure the chunks at a modern baseline: es2022 keeps private class fields and destructuring
// untransformed, the shape consumer bundlers ship today.
export default defineConfig({
  build: { target: 'es2022' },
});
