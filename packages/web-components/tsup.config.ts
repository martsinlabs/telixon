import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'index.server': 'src/index.server.ts',
    react: 'src/react.ts',
    vue: 'src/vue.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: false,
  treeshake: true,
  target: 'es2022',
  external: [/^@telixon\//],
});
