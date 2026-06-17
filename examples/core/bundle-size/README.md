# @telixon/core bundle size

A Vite app that uses the entire public API of `@telixon/core` and builds it the way a real consumer's bundler does. It
exists to show exactly what the package adds to an application's initial download, and why bundle analyzers report a
larger number. The app exercises every export, including the input controller, so the initial figure is the ceiling, not
a tree-shaken minimum.

## What it shows

`@telixon/core` ships its engine (the compiled libphonenumber metadata) as four base64-of-gzip modules loaded through
dynamic `import()`. A production bundler keeps those in separate lazy chunks instead of inlining them, so the build
splits into:

- an **initial chunk** (~18 KB gzip): the entire public API plus the loader, no metadata;
- **four engine chunks** (~119 KB gzip total): fetched by `ensureEngineReady()` after first paint, off the critical
  path.

Bundlephobia and the Import Cost editor extension cannot model code-splitting, so they inline every `import()` and report
the sum (~138 KB). The number a user downloads on first paint is the initial chunk.

`size-limit` is the regression gate (it fails CI if the published entry grows past its budget); this example is the
human-readable proof of where the bytes go.

## Run

```bash
pnpm --filter @telixon/core build
pnpm --filter @telixon/example-core-bundle-size build
```

Vite prints the chunk sizes. `pnpm --filter @telixon/example-core-bundle-size report` additionally writes
`report/bundle.html` (the published [telixon.dev/bundle.html](https://telixon.dev/bundle.html) page).

## How the numbers are measured

`report.ts` reads the emitted chunks from `dist/assets`, classifies each as initial or engine, and gzip/brotli-compresses
it with `node:zlib`. Nothing is hard-coded; every figure comes from the build output.
