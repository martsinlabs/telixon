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
import { ensureReady, parsePhoneNumber } from '@telixon/core';

await ensureReady();

const number = parsePhoneNumber('+12015550123');
number.isValid(); // true
number.getCountry(); // "US"
number.getE164(); // "+12015550123"
number.formatInternational(); // "+1 201-555-0123"
```

## Initialization

`ensureReady()` loads and parses the engine artifact once. Call it before any other API. Subsequent calls return the already-resolved result.

- Node reads the gzipped artifact from disk; the browser imports the embedded artifact modules, which the bundler code-splits into lazy chunks. The artifact is ~95 KB gzipped, decompressing to ~1 MB of metadata.
- Cold load is ~7 ms on a high single-thread CPU; warm calls are negligible.

Calling any API before `ensureReady()` throws `TelixonNotReadyError` with a fix snippet. Full rationale: [Initialization docs](https://github.com/martsinlabs/telixon/blob/main/docs/initialization.md).

## Highlights

- **Conformance-verified.** Every public query method matches Google libphonenumber at the pinned commit recorded in [PROVENANCE.json](./dist/engine/PROVENANCE.json). The conformance gate runs in CI on every push.
- **Sync hot path.** After `ensureReady()` resolves, all public APIs are synchronous. No Promise allocation per call.
- **Deterministic finite-state engine.** Validation, number typing, region resolution, and format selection are linear-time walks over automata compiled from the metadata, not regex passes — deterministic and backtracking-free.
- **Lazy engine, out of the bundle.** The metadata is runtime data, not part of your JS bundle, so it never affects initial load or code size. Nothing loads on import or first call; you schedule the one-time load with `ensureReady()` (idle, prefetch, or a worker), keeping its decode-and-parse cost off the interaction path. `sideEffects: false`.

## What's in this package

- `parsePhoneNumber` and the `PhoneNumber` query view (`isValid`, `isPossible`, `getNumberType`, `getCountry`, `getE164`, `formatNational`, `formatInternational`, `getURI`, and more).
- `createInternationalInputController` and `createNationalInputController`: caret-stable as-you-type state machines. The DOM-binding wrapper (`createPhoneInput`) lives in [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk).
- Region and number-type helpers: `getCallingCodeForRegion`, `countrySupportsNumberType`, `getPlaceholders`, `isNationalPrefixOptional`.
- The DFA engine, conformance-verified against Google libphonenumber.
- `ensureReady` async resource loader (Node and browser).

## Project

Architecture, conformance methodology, benchmarks, and the project roadmap live at the [project README](https://github.com/martsinlabs/telixon).

## Status

Pre-release. APIs may change before 1.0.

## License

[Apache-2.0](./LICENSE) © Martsin Labs
