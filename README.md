# Telixon

Phone-number processing for JavaScript and TypeScript with reference-grade accuracy.

[![ci](https://github.com/martsinlabs/telixon/actions/workflows/ci.yml/badge.svg)](https://github.com/martsinlabs/telixon/actions/workflows/ci.yml)
[![conformance](https://img.shields.io/endpoint?url=https://martsinlabs.github.io/telixon/parity-badge.json)](https://martsinlabs.github.io/telixon/parity.html)
[![reference: google/libphonenumber](https://img.shields.io/badge/reference-google%2Flibphonenumber-181717?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0OCA0OCI+PHBhdGggZmlsbD0iI0VBNDMzNSIgZD0iTTI0IDkuNWMzLjU0IDAgNi43MSAxLjIyIDkuMjEgMy42bDYuODUtNi44NUMzNS45IDIuMzggMzAuNDcgMCAyNCAwIDE0LjYyIDAgNi41MSA1LjM4IDIuNTYgMTMuMjJsNy45OCA2LjE5QzEyLjQzIDEzLjcyIDE3Ljc0IDkuNSAyNCA5LjV6Ii8+PHBhdGggZmlsbD0iIzQyODVGNCIgZD0iTTQ2Ljk4IDI0LjU1YzAtMS41Ny0uMTUtMy4wOS0uMzgtNC41NUgyNHY5LjAyaDEyLjk0Yy0uNTggMi45Ni0yLjI2IDUuNDgtNC43OCA3LjE4bDcuNzMgNmM0LjUxLTQuMTggNy4wOS0xMC4zNiA3LjA5LTE3LjY1eiIvPjxwYXRoIGZpbGw9IiNGQkJDMDUiIGQ9Ik0xMC41MyAyOC41OWMtLjQ4LTEuNDUtLjc2LTIuOTktLjc2LTQuNTlzLjI3LTMuMTQuNzYtNC41OWwtNy45OC02LjE5Qy45MiAxNi40NiAwIDIwLjEyIDAgMjRjMCAzLjg4LjkyIDcuNTQgMi41NiAxMC43OGw3Ljk3LTYuMTl6Ii8+PHBhdGggZmlsbD0iIzM0QTg1MyIgZD0iTTI0IDQ4YzYuNDggMCAxMS45My0yLjEzIDE1Ljg5LTUuODFsLTcuNzMtNmMtMi4xNSAxLjQ1LTQuOTIgMi4zLTguMTYgMi4zLTYuMjYgMC0xMS41Ny00LjIyLTEzLjQ3LTkuOTFsLTcuOTggNi4xOUM2LjUxIDQyLjYyIDE0LjYyIDQ4IDI0IDQ4eiIvPjwvc3ZnPg==)](https://github.com/google/libphonenumber)
[![license](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

## Built on Google libphonenumber metadata. 100% match.

Telixon's behavior is verified against Google libphonenumber, the reference implementation, at the
**same commit** the engine was compiled from. The conformance gate runs in CI on every push and pull
request and fails on any divergence.

- **Version-matched oracle.** [PROVENANCE.json](packages/core/src/engine/PROVENANCE.json) pins the
  upstream commit; the oracle loads Google's source at that exact commit, so there is no metadata
  version drift.
- **CI-gated.** Every push runs `pnpm conformance`. A regression breaks the build.
- **Exhaustive coverage.** Every supported region; every compared behavior matches Google exactly:
  `isValid`, `isPossible`, `isPossibleWithReason`, `getNumberType`, `getNationalNumber`,
  `getCallingCode`, `getCountry`, `getE164`, `formatInternational`, `getURI`, `formatAsYouType`.
- **Reproducible.** Clone, install, run `pnpm conformance`.

```bash
pnpm conformance
```

Live report: [martsinlabs.github.io/telixon/parity.html](https://martsinlabs.github.io/telixon/parity.html). Methodology: [conformance/README.md](packages/core/conformance/README.md).

Beyond parity:

- **Caret-stable as-you-type formatting.** The controller resolves and reformats on every keystroke
  without jumping the caret.
- **Controlled history.** Undo and redo restore the exact prior value and caret.
- **Headless and framework-agnostic.** `@telixon/web-sdk` is UI-free; render in any framework.
- **Small bundle, heavy metadata out of bundle.** `sideEffects: false` everywhere; metadata loads
  once at runtime, cacheable and CDN-able.

## Install

Pre-release. APIs may change before 1.0.

```bash
pnpm add @telixon/core           # engine (node and browser)
pnpm add @telixon/web-sdk        # headless DOM adapter (browser)
```

## Quick start

### Parse a number

```ts
import { ensureReady, parsePhoneNumber } from '@telixon/core';

await ensureReady();

const number = parsePhoneNumber('+14155552671');
number.isValid(); // true
number.getCountry(); // "US"
number.getE164(); // "+14155552671"
number.formatInternational(); // "+1 415-555-2671"
```

### Headless input

```ts
import { ensureReady } from '@telixon/core';
import { createPhoneInput } from '@telixon/web-sdk';

await ensureReady();

const phone = createPhoneInput({
  input: document.querySelector<HTMLInputElement>('#phone')!,
  mode: 'international',
});

phone.subscribe((state) => {
  // state: { value, country, selectionStart, selectionEnd }
});
```

## Packages

| Package               | Status  | Role                                  |
| --------------------- | ------- | ------------------------------------- |
| `@telixon/core`       | present | engine and phone-number logic         |
| `@telixon/web-sdk`    | present | headless DOM adapter                  |
| `@telixon/angular`    | planned | Angular binding                       |
| `@telixon/react`      | planned | React binding (hook + component)      |
| `@telixon/vue`        | planned | Vue binding                           |
| `@telixon/components` | planned | drop-in Web Component (`<tel-input>`) |

## Status

The engine and the parity baseline are stable; the framework bindings and the component layer are
planned (see [ARCHITECTURE.md](ARCHITECTURE.md)).

## Links

- [ARCHITECTURE.md](ARCHITECTURE.md): system architecture
- [CONTRIBUTING.md](CONTRIBUTING.md): setup, workflow, engineering standards
- [conformance/README.md](packages/core/conformance/README.md): parity report and methodology

## License

[Apache-2.0](LICENSE). See also [NOTICE](NOTICE).
