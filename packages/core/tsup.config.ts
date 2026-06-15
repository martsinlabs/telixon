import { defineConfig, type Options } from 'tsup';

type EsbuildPlugin = NonNullable<Options['esbuildPlugins']>[number];

// Keep the shipped EMBEDDED channel modules external so the host bundler code-splits the real engine/embedded/*.js files (esbuild can't mark relative paths external via `external`).
const externalEmbedded: EsbuildPlugin = {
  name: 'external-embedded-engine',
  setup(build) {
    build.onResolve({ filter: /\/engine\/embedded\// }, (args) => ({ path: args.path, external: true }));
  },
};

export default defineConfig({
  entry: {
    'index.browser': 'src/index.browser.ts',
    'index.node': 'src/index.node.ts',
    'index.edge': 'src/index.edge.ts',
    'index.sync-init': 'src/index.sync-init.ts',
    'index.sync-init.node': 'src/index.sync-init.node.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  treeshake: true,
  target: 'node18',
  esbuildPlugins: [externalEmbedded],
});
