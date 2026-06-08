# Initialization

`@telixon/core` loads its engine artifact (precompiled DFA tables and Google libphonenumber metadata) once before use. `ensureReady()` is the explicit entry point.

```ts
import { ensureReady, parsePhoneNumber } from '@telixon/core';

await ensureReady();
parsePhoneNumber('+14155552671');
```

## The point: timing control

The library does not auto-load on first API call. The consumer decides exactly when the engine becomes ready.

This matters because even a cheap operation, when fired at the wrong moment, is felt. An SPA route transition that triggers `parsePhoneNumber` for the first time should not also pay the engine load cost: the combination produces a small but visible stall during navigation.

Explicit `ensureReady()` lets the consumer pre-warm at any moment convenient for their UX:

- Before the route that needs phone parsing mounts.
- During a previous idle window (route prefetch, `IntersectionObserver`, `requestIdleCallback`).
- At app boot, if the engine is needed everywhere.
- In a service worker or background thread that hands off to the main thread.

Putting that choice in consumer hands is the design intent. The cost itself is small.

## Cost

The engine artifact is precompiled at build time. DFA tables ship as compact binary structs. Region, format, and number-type metadata ship as gzipped JSON. Loading is read + decompress + parse structured data, with no computation on top.

What determines the time:

- **Single-thread CPU performance.** Gunzip and the binary/JSON parsers are single-threaded compute.
- **Memory throughput.** Moving and structuring ~1.9 MB of decompressed data into resident lookup tables.
- **File I/O latency.** Negligible when the OS file cache is warm; a few ms on a cold disk read.
- **Network throughput (browser only).** Fetch on the first visit; cached `immutable` on subsequent visits.

Measured on a high single-thread CPU, Node v24.5.0, local install (median of 15 fresh process runs for the cold total; 30-sample averages for components):

| Step                                                        | Time        |
| ----------------------------------------------------------- | ----------- |
| File read 8 files (parallel, warm OS cache)                 | 0.14 ms     |
| Gunzip 8 files (320 KB compressed, 1.9 MB raw)              | 1.48 ms     |
| `JSON.parse` 3 metadata files                               | 1.07 ms     |
| Binary struct parse 5 DFA files (graph.bin alone = 0.54 ms) | 0.93 ms     |
| Residual (first-time module-state init, Maps, indexes)      | ~4.3 ms     |
| **`ensureReady()` cold (median; range 7.60-8.19 ms)**       | **7.89 ms** |
| Subsequent calls in same process                            | 42 ns       |

The total scales roughly linearly with single-thread CPU performance. As an estimate, not a direct measurement:

| Single-thread CPU class | Estimated cold |
| ----------------------- | -------------- |
| High performance        | 5-15 ms        |
| Mid performance         | 20-40 ms       |
| Low performance         | 60-120 ms      |

The browser case adds network fetch on the first visit. Engine ships at ~340 KB gzipped on the wire. A CDN with `Cache-Control: immutable` removes the fetch from every repeat visit.

## Patterns

### Eager at app start

```ts
import { ensureReady } from '@telixon/core';

await ensureReady();
// mount UI / start server
```

### Lazy at route load

```ts
// route loader (Next.js, Remix, SvelteKit, ...)
export async function loader() {
  await ensureReady();
  return null;
}
```

### Pre-warm in background, await later

```ts
// at app start, fire and forget
void ensureReady();

// later, where the phone input actually mounts
await ensureReady(); // resolves immediately if already done
```

### Server boot

```ts
await ensureReady();
const server = createServer(/* ... */);
server.listen(3000);
```

## Forgetting to call it

Any API used before `ensureReady()` resolves throws `TelixonNotReadyError`. The error is exported for `instanceof` checks and recovery:

```ts
import { ensureReady, parsePhoneNumber, TelixonNotReadyError } from '@telixon/core';

try {
  return parsePhoneNumber(input);
} catch (error) {
  if (error instanceof TelixonNotReadyError) {
    await ensureReady();
    return parsePhoneNumber(input);
  }
  throw error;
}
```

The error message includes a fix snippet and a link to this page (`https://github.com/martsinlabs/telixon/blob/main/docs/initialization.md`).

## Summary

One explicit `await ensureReady()` buys full control over when the engine load cost is paid. The cost is small (single-digit ms on a high single-thread CPU, up to ~120 ms on a low-performance CPU). Every other API is synchronous after it resolves, and the warm path is effectively free.
