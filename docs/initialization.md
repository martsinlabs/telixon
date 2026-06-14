# Initialization

`@telixon/core` builds its engine (precompiled DFA tables and Google libphonenumber metadata) once per process. The engine ships as four embedded modules in the package; every environment uses the same modules and differs only in how it imports and decodes them. Node and edge initialize with no setup call; in the browser you decide when to load the engine.

| Environment                                                  | How the modules arrive                    | What happens                                                                           |
| ------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------- |
| Node                                                         | static imports from the package           | the first API call initializes synchronously and proceeds                              |
| Browsers                                                     | code-split lazy chunks over the network   | you trigger the load with `ensureEngineReady()`; the first API call loads on demand    |
| Edge runtimes (`workerd`, `edge-light`, `worker` conditions) | static imports inside the deployed script | the entry initializes synchronously in global scope; every request hits a ready engine |

## Node

The engine modules ship with the package, so initialization needs no ceremony: the first API call finds the engine unbuilt, decodes it with native `node:zlib`, and proceeds.

```ts
import { parsePhoneNumber } from '@telixon/core';

parsePhoneNumber('+12015550123'); // first call initializes
```

To pay the cost at a chosen moment instead, call `ensureEngineReadySync()` (or `await ensureEngineReady()`) at boot.

## Browsers

The engine is runtime data, **not part of your JS bundle**: the host bundler code-splits the four engine modules into lazy chunks, so they never affect your initial bundle or the library's code size.

The library loads nothing as a side effect of import. **When** to fetch and decode the engine is your call, not the library's: the right moment depends on your page (where a phone input appears, when the app reaches interactive), which the library cannot know. You control it with `ensureEngineReady()`, which starts the load and resolves when the engine is ready; it is idempotent, so a second call joins the same in-flight or finished load. The four chunks fetch in parallel and each layer is base64-decoded and gunzipped off the main thread (`DecompressionStream`).

```ts
import { ensureEngineReady, createInternationalInputController } from '@telixon/core';

await ensureEngineReady(); // load the engine, then use it
const controller = createInternationalInputController();
```

Trigger it where it fits your app: at startup to pre-warm, on entering a route with a phone field, or behind your own `requestIdleCallback` to keep it off first paint. Fire it early and `await` it later; the await is instant once the load has finished.

### The loading window

A network fetch cannot be made synchronous, only already done. Until the engine has loaded, a synchronous API call (including constructing a controller, which reads metadata) throws `TelixonNotReadyError` rather than degrading silently. `await ensureEngineReady()` before that call removes the window.

The first API call also starts the load on demand, so a consumer who never calls `ensureEngineReady()` still loads the engine; only that first call, made while the load is in flight, throws. A failed download (network flake) surfaces on `await ensureEngineReady()` and the next call retries; nothing is poisoned permanently.

For guards in code that may run before the load finishes, `isEngineReady()` is a synchronous predicate:

```ts
import { isEngineReady, parsePhoneNumber } from '@telixon/core';

const display = isEngineReady() ? parsePhoneNumber(stored).formatInternational() : stored;
```

The error is exported for `instanceof` checks:

```ts
import { parsePhoneNumber, TelixonNotReadyError } from '@telixon/core';

try {
  return parsePhoneNumber(input);
} catch (error) {
  if (error instanceof TelixonNotReadyError) {
    /* engine still loading: wait for ensureEngineReady() */
  }
  throw error;
}
```

## Edge runtimes

Bundlers for Cloudflare Workers (`workerd`), Vercel Edge (`edge-light`), and other worker platforms select a dedicated entry through package export conditions; no configuration or import path change is involved. On this entry the engine modules are static imports inside the deployed script, and the engine initializes synchronously at module evaluation, in global scope:

```ts
import { parsePhoneNumber } from '@telixon/core';

export default {
  fetch: (request: Request) => new Response(String(parsePhoneNumber('+12015550123').isValid())),
};
```

This placement matters on edge platforms: startup work in global scope runs once per isolate, outside per-request CPU accounting, so requests never pay the initialization cost and there is no loading window. `TelixonNotReadyError` cannot occur on this entry. The engine's tables live in flat `ArrayBuffer`s the garbage collector does not traverse, which keeps GC work inside billed request time at zero.

## How the engine loads

The engine ships as four embedded modules (`engine/embedded/*.bin.js`); each default-exports a record of layer keys to the base64 of that layer's gzipped bytes (nine layers across the four modules). The library fetches or imports the modules, decodes each layer, and assembles the engine. Decode uses the fastest path the runtime offers, with a pure-JS decoder as the universal floor:

- **Node**: `node:zlib` (native, synchronous, JIT-free on cold start).
- **Browsers**: native base64 (`Uint8Array.fromBase64` where available) plus `DecompressionStream`, which runs the gzip inflate off the main thread. Where those APIs are absent it falls back to the library's pure-JS base64 + gunzip, which is byte-equality-tested against zlib in CI and needs no platform decompression API.
- **Edge**: the pure-JS decoder, synchronously, since `node:zlib` and a synchronous `DecompressionStream` are not available in global scope.

Either way, loading is import or fetch, decompress, and parse structured data, with no computation on top. Assembly re-points the typed-array views; it never copies.

## Cost

Measured on a high single-thread CPU (Node v24, Chrome) on a local install. The browser numbers are the full `ensureEngineReady` path, not an isolated phase:

| Step                                                                    | Time                |
| ----------------------------------------------------------------------- | ------------------- |
| First call / preload, cold (Node, native zlib)                          | low single-digit ms |
| Browser, total main-thread work (module eval + base64 + parse + tables) | ~12-19 ms           |
| of which the gzip inflate, off the main thread                          | ~1.6 ms             |
| Edge entry import, incl. global-scope init (outside request accounting) | low single-digit ms |
| Calls once ready (same process)                                         | negligible (~2 ns)  |

The browser main-thread cost is dominated by the JS evaluation of the base64-in-JS modules (~8 ms) and the engine parse (~3 ms); the inflate is the only part that runs off the main thread. Trigger `ensureEngineReady()` behind your own idle scheduler (e.g. `requestIdleCallback`) to keep this work off the page's first paint. The engine is ~120 KB gzipped on the wire across four content-hashed chunks, decompressing to ~0.73 MB of binary tables. Repeat visits load the chunks from HTTP cache. The cost scales with single-thread CPU performance; on a low-performance CPU it is in the tens of milliseconds, paid once per process.

## Summary

Import and call in Node and on edge: the first call initializes synchronously, and on edge the engine is ready before the first request by construction. In the browser, you decide when to load the engine with `ensureEngineReady()` (the only environment that needs it), decoding off the main thread; the first API call also loads it on demand.
