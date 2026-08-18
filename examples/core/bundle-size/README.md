# @telixon/core bundle size

A Vite app that uses the entire public API of `@telixon/core` and builds it the way a real consumer's bundler does. It
exists to show exactly what the package adds to an application's initial download, and why bundle analyzers report a
larger number. The app exercises every export, including the input controller, which makes the initial figure a
ceiling for any real application.

## What it shows

`@telixon/core` ships its engine (the compiled libphonenumber metadata) as four base64-of-gzip modules loaded through
dynamic `import()`. A production bundler keeps those in separate lazy chunks, splitting the build into:

- an **initial chunk**: the entire public API plus the loader, no metadata;
- **four engine chunks**: fetched by `ensureEngineReady()` after first paint, off the critical path.

Bundlephobia and the Import Cost editor extension inline every `import()` and report the combined total, since
neither models code-splitting. The number a user downloads on first paint is the initial chunk. Running this example
prints the measured split, published at [proof.telixon.dev/bundle.html](https://proof.telixon.dev/bundle.html).

`size-limit` is the regression gate (it fails CI if the published entry grows past its budget); this example is the
human-readable proof of where the bytes go.

## Run

```bash
pnpm --filter @telixon/core build
pnpm --filter @telixon/example-core-bundle-size build
```

Vite prints the chunk sizes. `pnpm --filter @telixon/example-core-bundle-size report` additionally writes
`report/bundle.html`, the page published on the dashboard.

## How the numbers are measured

`report.ts` reads the emitted chunks from `dist/assets`, classifies each as initial or engine, and gzip/brotli-compresses
it with `node:zlib`. Every figure comes from the build output.
