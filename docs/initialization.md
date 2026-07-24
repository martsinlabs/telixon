# Initialization

`@telixon/core` builds its engine (precompiled DFA tables and Google libphonenumber metadata) once per process. The engine ships as four embedded modules in the package; every environment uses the same modules and differs only in how it imports and decodes them. Initialization is **explicit** and **asynchronous by default**: call `await ensureEngineReady()` from `@telixon/core` before the first API call. A synchronous path lives in a separate thin entry, `@telixon/core/sync-init`, which exports only `ensureEngineReadySync()`. Nothing initializes on your behalf, and a call before initialization throws `EngineNotReadyError`.

The engine is compressed runtime data, never live JavaScript objects in your bundle. By default it stays out of your initial bundle: the four base64-of-gzip modules are code-split into lazy chunks, and nothing loads until you call `ensureEngineReady()`. This is deliberate, so you decide when to pay the one-time load cost, which matters most in the browser, where bundle size and initial load are the constraint. Because the load is deferred and `ensureEngineReady()` decodes off the main thread, it stays off the critical path: during a single-page-app route transition or an animation you schedule it where it fits (pre-warm at startup, on entering the route with the phone field, or behind `requestIdleCallback`) rather than letting a synchronous decode block a frame, and since nothing loads on import you never pay at a moment you did not choose. Once it resolves, the entire API is synchronous. `@telixon/core/sync-init` is the opposite trade: it carries the modules in your bundle so initialization needs no round-trip.

The two entries share one engine. The provider is process-wide, so `ensureEngineReadySync()` from `@telixon/core/sync-init` readies the same engine the API in `@telixon/core` uses; you import the API as usual and add the synchronous initializer only where you want it.

| Entry                     | Exports                                            | Initialization                                             |
| ------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| `@telixon/core`           | full API, `ensureEngineReady()`, `isEngineReady()` | asynchronous: engine loaded on demand, decoded off-thread  |
| `@telixon/core/sync-init` | `ensureEngineReadySync()` only                     | synchronous: engine statically bundled, decoded in-process |

| Environment                              | Async default (`@telixon/core`)                                   | Sync (`@telixon/core/sync-init`)                 |
| ---------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| Node                                     | dynamic import, native `zlib.gunzip` off the libuv threadpool     | native `zlib.gunzipSync`                         |
| Browsers                                 | code-split lazy chunks, `DecompressionStream` off the main thread | engine bundled in your JS, pure-JS gunzip        |
| Edge (`workerd`, `edge-light`, `worker`) | dynamic import, `DecompressionStream`, inside a request           | pure-JS gunzip in global scope, once per isolate |

## Asynchronous: `ensureEngineReady()`

`await ensureEngineReady()` is the default in every environment. The engine loads **on demand** (a dynamic import: code-split chunks on the web, local modules on Node and edge) and decodes **off the main thread** (native `zlib.gunzip` on the libuv threadpool in Node; `DecompressionStream` on the web and edge). The engine is not part of the importing module, so importing `@telixon/core` costs almost nothing; the work happens when you call `ensureEngineReady()`.

```ts
import { ensureEngineReady, parsePhoneNumber } from '@telixon/core';

await ensureEngineReady();
parsePhoneNumber('+12015550123');
```

**When** to load is your call, not the library's: the right moment depends on your app (where a phone input appears, when the app reaches interactive), which the library cannot know. `ensureEngineReady()` starts the load and resolves when the engine is ready; it is idempotent, so a second call joins the same in-flight or finished load. Fire it early and `await` it later; the await is instant once the load has finished. A failed load (a network flake) surfaces on `await ensureEngineReady()`, and the next call retries; nothing is poisoned permanently.

### The loading window

A network fetch cannot be made synchronous, only already done. Until the engine has loaded, a synchronous API call (including constructing a controller, which reads metadata) throws `EngineNotReadyError` rather than degrading silently. `await ensureEngineReady()` before that call removes the window. For guards in code that may run before the load finishes, `isEngineReady()` is a synchronous predicate:

```ts
import { isEngineReady, parsePhoneNumber } from '@telixon/core';

const display = isEngineReady() ? parsePhoneNumber(stored).formatInternational() : stored;
```

The error is exported for `instanceof` checks:

```ts
import { parsePhoneNumber, EngineNotReadyError } from '@telixon/core';

try {
  return parsePhoneNumber(input);
} catch (error) {
  if (error instanceof EngineNotReadyError) {
    /* engine not initialized: call ensureEngineReady() first */
  }
  throw error;
}
```

## Synchronous: `ensureEngineReadySync()`

`@telixon/core/sync-init` is a thin entry that exports only `ensureEngineReadySync()`. It statically bundles the engine modules and decodes them **synchronously, in-process** (native `zlib.gunzipSync` in Node; pure-JS gunzip on the web and edge). Because the provider is process-wide, this readies the same engine the API in `@telixon/core` uses:

```ts
import { parsePhoneNumber } from '@telixon/core';
import { ensureEngineReadySync } from '@telixon/core/sync-init';

ensureEngineReadySync();
parsePhoneNumber('+12015550123');
```

A synchronous decode blocks the main thread for its duration: low single-digit milliseconds on a high single-thread CPU, tens of milliseconds on a low-end device. Use it where blocking is acceptable: at boot in Node, or in global scope on edge. On the web it trades a larger bundle (the engine ships in your JS) for an initialization with no network round-trip.

### Edge

For Cloudflare Workers (`workerd`), Vercel Edge (`edge-light`), and other worker platforms, `@telixon/core/sync-init` in **global scope** is the path to reach for. Global scope runs once per isolate, outside per-request CPU accounting, and the synchronous pure-JS decode does nothing the runtime restricts (no dynamic import, no asynchronous I/O):

```ts
import { parsePhoneNumber } from '@telixon/core';
import { ensureEngineReadySync } from '@telixon/core/sync-init';

ensureEngineReadySync();

export default {
  fetch: (request: Request) => new Response(String(parsePhoneNumber('+12015550123').isValid())),
};
```

The engine is ready before the first request: requests never pay the initialization cost, and `EngineNotReadyError` cannot reach a handler. The engine's tables live in flat `ArrayBuffer`s the garbage collector does not traverse, which keeps GC work inside billed request time at zero. The asynchronous default works on edge as well, but only inside a request handler; the global-scope, once-per-isolate pattern is what the synchronous entry is for.

## How the engine loads

The engine ships as four embedded modules (`engine/embedded/*.bin.js`); each default-exports a record of layer keys to the base64 of that layer's gzipped bytes (nine layers across the four modules). Initialization imports the modules, decodes each layer, and assembles the engine: import or fetch, decompress, parse structured data, with no computation on top. Assembly re-points typed-array views; it never copies.

Decode uses the fastest path the runtime offers, with a pure-JS decoder as the universal floor:

- **Node**: native `node:zlib`, either `gunzipSync` (synchronous entry) or `gunzip` off the libuv threadpool (asynchronous default).
- **Browsers**: native base64 (`Uint8Array.fromBase64` where available) plus `DecompressionStream`, which runs the gzip inflate off the main thread (asynchronous default); the pure-JS gunzip serves the synchronous entry and the fallback where the API is absent.
- **Edge**: `DecompressionStream` off-thread (asynchronous default); the pure-JS gunzip in global scope (synchronous entry), since `node:zlib` and a synchronous `DecompressionStream` are not available there.

The pure-JS base64 + gunzip floor is byte-equality-tested against zlib in CI and needs no platform decompression API.

## Cost

Measured cold on a high single-thread CPU (Node v24; Chrome runs the same V8). Times scale with single-thread CPU performance and are paid once per process.

| Step                                                                      | Time                |
| ------------------------------------------------------------------------- | ------------------- |
| Import `@telixon/core` (engine deferred)                                  | ~1.5 ms             |
| Import `@telixon/core/sync-init` (compressed bytes loaded, not decoded)   | ~1.7 ms             |
| `ensureEngineReadySync()`, Node native zlib                               | low single-digit ms |
| `ensureEngineReadySync()`, pure-JS (web, edge)                            | ~8 ms               |
| `ensureEngineReady()` total (dynamic import, off-thread decode, assemble) | ~12 to 20 ms        |
| Calls once ready (same process)                                           | negligible          |

The asynchronous total runs higher than the synchronous decode because dynamic import and off-thread streaming add overhead the small engine does not amortize; its value is the deferred, code-split, non-blocking load, not raw speed. The engine is ~119 KB compressed on the wire across four content-hashed chunks, decompressing to ~0.61 MB of binary tables; repeat visits load the chunks from HTTP cache. On a low-end device the cost is tens of milliseconds. Trigger `ensureEngineReady()` behind your own idle scheduler (for example `requestIdleCallback`) to keep it off first paint.

The initial bundle is the public API plus the loader, ~18 KB compressed even when you use the entire API; the engine chunks are fetched on demand and stay out of it. Analyzers that inline dynamic imports (bundlephobia, Import Cost) cannot model the split, so they report the combined ~138 KB. The per-chunk breakdown, measured from a real Vite build and reproducible via [examples/core/bundle-size](https://github.com/martsinlabs/telixon/tree/main/examples/core/bundle-size), is published at [proof.telixon.dev/bundle.html](https://proof.telixon.dev/bundle.html).

## Summary

Initialization is explicit and asynchronous by default: `await ensureEngineReady()` from `@telixon/core`, at a moment that fits your app. For synchronous initialization (at boot in Node, or in global scope on edge, once per isolate before the first request), import `ensureEngineReadySync()` from `@telixon/core/sync-init`. The two entries share one process-wide engine, and a call before initialization throws `EngineNotReadyError`.
