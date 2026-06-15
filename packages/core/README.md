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
import { ensureEngineReady, parsePhoneNumber } from '@telixon/core';

await ensureEngineReady(); // load the engine once; the API is synchronous afterward

const number = parsePhoneNumber('+12015550123');
number.isValid(); // true
number.getCountry(); // "US"
number.getE164(); // "+12015550123"
number.formatInternational(); // "+1 201-555-0123"
```

## Initialization

Initialization is explicit and asynchronous by default; an API call before it throws `TelixonNotReadyError`. `await ensureEngineReady()` from `@telixon/core` loads the engine on demand (a dynamic import, code-split into ~120 KB of lazy chunks in the browser) and decodes it off the main thread. For synchronous initialization, `ensureEngineReadySync()` from `@telixon/core/sync-init` bundles the engine and decodes it in-process (native `node:zlib` in Node, pure-JS elsewhere); in global scope on edge it readies the engine once per isolate, outside per-request CPU accounting. Both entries share one process-wide engine, which decompresses to ~0.61 MB of binary tables.

Full rationale and numbers: [Initialization docs](https://github.com/martsinlabs/telixon/blob/main/docs/initialization.md).

## Highlights

- **Conformance-verified.** Every public query method matches Google libphonenumber at the pinned commit recorded in [PROVENANCE.json](https://github.com/martsinlabs/telixon/blob/main/packages/core/src/engine/PROVENANCE.json). The gate runs in CI on every push.
- **Synchronous hot path.** Once the engine is ready, every public API call returns directly, with no Promise allocation. The input path runs on every keystroke.
- **Deterministic finite-state engine.** Validation, number typing, region resolution, and format selection are linear-time walks over automata compiled from the metadata, not regex passes: backtracking-free.
- **Engine out of the bundle, on your terms.** The metadata is compressed runtime data, never live JS objects in your bundle, and stays out of your initial bundle by default. You choose when to pay the one-time load cost (at startup, on entering a route with a phone field, or behind `requestIdleCallback`), so it never blocks a route transition or animation.

## What's in this package

- `parsePhoneNumber` and the `PhoneNumber` query view (`isValid`, `isPossible`, `getNumberType`, `getCountry`, `getE164`, `formatNational`, `formatInternational`, `getURI`, and more).
- `createInternationalInputController` and `createNationalInputController`: full per-keystroke input controllers (insert and delete at any position, caret tracking, undo/redo, and the complete query surface). The DOM-binding wrapper `createPhoneInput` lives in [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk).
- Region and number-type helpers: `getCallingCodeForRegion`, `countrySupportsNumberType`, `getPlaceholders`, `isNationalPrefixOptional`.
- `ensureEngineReady`, `isEngineReady`, and `ensureEngineReadySync` (from `@telixon/core/sync-init`): engine initialization and readiness.

## Project

Architecture, conformance methodology, benchmarks, and the project roadmap live at the [project README](https://github.com/martsinlabs/telixon).

## Status

Pre-release. APIs may change before 1.0.

## License

[Apache-2.0](./LICENSE) © Martsin Labs
