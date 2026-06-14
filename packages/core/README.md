# @telixon/core

Phone-number parser, formatter, and validator built on Google libphonenumber metadata.

[![conformance](https://img.shields.io/endpoint?url=https://telixon.dev/parity-badge.json)](https://telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://telixon.dev/bench-badge.json)](https://telixon.dev/benchmark.html)

## Install

```bash
npm install @telixon/core
```

## Quick start

```ts
import { parsePhoneNumber } from '@telixon/core';

const number = parsePhoneNumber('+12015550123');
number.isValid(); // true
number.getCountry(); // "US"
number.getE164(); // "+12015550123"
number.formatInternational(); // "+1 201-555-0123"
```

## Initialization

In Node, the first API call initializes the engine synchronously with native `node:zlib`; no setup call. In browsers, the engine is code-split out of your bundle into lazy chunks (~120 KB transfer) that you load when it suits your app with `await ensureEngineReady()` (the library does no import-time work), decoding off the main thread; a synchronous API call before it has loaded throws `TelixonNotReadyError`. On edge runtimes (Cloudflare Workers, Vercel Edge; selected automatically via export conditions) the engine initializes in global scope, outside per-request CPU accounting, and every request hits a ready engine.

The engine decompresses to ~0.73 MB of binary tables. Full rationale and numbers: [Initialization docs](https://github.com/martsinlabs/telixon/blob/main/docs/initialization.md).

## Highlights

- **Conformance-verified.** Every public query method matches Google libphonenumber at the pinned commit recorded in [PROVENANCE.json](https://github.com/martsinlabs/telixon/blob/main/packages/core/src/engine/PROVENANCE.json). The conformance gate runs in CI on every push.
- **Sync hot path.** Every public API is synchronous once the engine is ready; in Node even initialization is (first call self-initializes). No Promise allocation per call.
- **Deterministic finite-state engine.** Validation, number typing, region resolution, and format selection are linear-time walks over automata compiled from the metadata, not regex passes: deterministic and backtracking-free.
- **Engine out of the bundle.** The metadata is runtime data, not part of your JS bundle, so it never affects initial load or code size. In browsers it is code-split into lazy chunks you load with `ensureEngineReady()`, decoded off the main thread (`DecompressionStream`), falling back to a pure-JS decoder (byte-equality-tested against zlib in CI) where the native API is absent.

## What's in this package

- `parsePhoneNumber` and the `PhoneNumber` query view (`isValid`, `isPossible`, `getNumberType`, `getCountry`, `getE164`, `formatNational`, `formatInternational`, `getURI`, and more).
- `createInternationalInputController` and `createNationalInputController`: full input controllers: insert and delete at any position, caret tracking, undo/redo, and the complete query surface per keystroke. The DOM-binding wrapper (`createPhoneInput`) lives in [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk).
- Region and number-type helpers: `getCallingCodeForRegion`, `countrySupportsNumberType`, `getPlaceholders`, `isNationalPrefixOptional`.
- The DFA engine, conformance-verified against Google libphonenumber.
- `ensureEngineReady` / `ensureEngineReadySync` / `isEngineReady`: control over when the engine loads and whether it is ready.

## Project

Architecture, conformance methodology, benchmarks, and the project roadmap live at the [project README](https://github.com/martsinlabs/telixon).

## Status

Pre-release. APIs may change before 1.0.

## License

[Apache-2.0](./LICENSE) © Martsin Labs
