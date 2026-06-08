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

const number = parsePhoneNumber('+14155552671');
number.isValid();              // true
number.getCountry();           // "US"
number.getE164();              // "+14155552671"
number.formatInternational();  // "+1 415-555-2671"
```

## Initialization

`ensureReady()` loads and parses the engine artifact once. Call it before any other API. Subsequent calls are free.

- Node, local engine files: ~9 ms cold.
- Browser, CDN: 60 to 210 ms cold; 10 to 15 ms on repeat visits (immutable cache).
- Warm calls in the same process: ~42 ns.

Calling any API before `ensureReady()` throws `TelixonNotReadyError` with a fix snippet. Full rationale: [Initialization docs](https://github.com/martsinlabs/telixon/blob/main/docs/initialization.md).

## Highlights

- **Conformance-verified.** Every public query method matches Google libphonenumber at the pinned commit recorded in [PROVENANCE.json](./dist/engine/PROVENANCE.json). The conformance gate runs in CI on every push.
- **Sync hot path.** After `ensureReady()` resolves, all public APIs are synchronous. No Promise allocation per call.
- **DFA-based engine.** ReDoS-immune by construction; deterministic execution time per digit.
- **Small bundle, heavy metadata out of bundle.** `sideEffects: false`; engine metadata loads once at runtime and is cacheable and CDN-able.

## What's in this package

- `parsePhoneNumber` and the `PhoneNumber` query view (`isValid`, `getCountry`, `getE164`, `formatNational`, `formatInternational`, `getURI`, and more).
- `createInternationalInputController` and `createNationalInputController`: caret-stable as-you-type state machines. The DOM-binding wrapper (`createPhoneInput`) lives in [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk).
- The DFA engine, conformance-verified against Google libphonenumber.
- `ensureReady` async resource loader (Node and browser).

## Project

Architecture, conformance methodology, benchmarks, and the project roadmap live at the [project README](https://github.com/martsinlabs/telixon).

## Status

Pre-release. APIs may change before 1.0.

## License

[Apache-2.0](./LICENSE) © Martsin Labs
