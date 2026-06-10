# Initialization

`@telixon/core` loads its engine artifact (precompiled DFA tables and Google libphonenumber metadata) once before use. `ensureReady()` is the explicit entry point.

The artifact is runtime data, **not part of your JS bundle**: it never affects initial load or the library's code size. Nothing loads on import or on the first API call — you trigger the one-time load with `ensureReady()` and schedule it (an idle window, a route prefetch, or a worker), so its decode-and-parse cost stays off the interaction path rather than blocking rendering or input.

```ts
import { ensureReady, parsePhoneNumber } from '@telixon/core';

await ensureReady();
parsePhoneNumber('+12015550123');
```

## Timing control

The library does not auto-load on the first API call. The consumer decides when the engine becomes ready, so the load cost can be paid at a moment that does not compete with a user interaction.

`ensureReady()` lets the consumer pre-warm whenever it suits their UX:

- Before the route that needs phone parsing mounts.
- During an earlier idle window (route prefetch, `IntersectionObserver`, `requestIdleCallback`).
- At application boot, if the engine is needed everywhere.
- In a worker that hands the result to the main thread.

## How the engine loads

The engine ships in two channels; the resource loader for the environment picks one:

- **Node** reads the gzipped artifact files from disk (`engine/raw`) and gunzips them.
- **Browser** imports the embedded artifact modules (`engine/embedded`), which the host bundler code-splits into lazy chunks served from the application's own origin. The base64 payload is decoded and gunzipped in the browser.

Either way, loading is read or fetch, decompress, and parse structured data, with no computation on top.

## Cost

Measured on a high single-thread CPU, Node v24.5.0, local install:

| Step                            | Time               |
| ------------------------------- | ------------------ |
| `ensureReady()` cold            | ~7 ms              |
| Subsequent calls (same process) | negligible (~2 ns) |

The artifact is ~95 KB gzipped on the wire (both channels; the browser embedded chunks re-gzip to ~95 KB), decompressing to ~1 MB of metadata. The cold cost scales with single-thread CPU performance, since gunzip and the binary and JSON parsers are single-threaded; on a low-performance CPU it is in the tens of milliseconds. Every API is synchronous after `ensureReady()` resolves, and repeat calls return the already-resolved result.

In the browser, the first visit also downloads the engine chunks once; they are content-hashed, so repeat visits load them from cache.

## Patterns

### Eager at application start

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
// at application start, fire and forget
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

## Calling an API before ready

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

One explicit `await ensureReady()` gives the consumer control over when the engine load cost is paid. The cost is single-digit milliseconds on a high single-thread CPU. Every other API is synchronous after it resolves, and repeat calls return the already-resolved result.
