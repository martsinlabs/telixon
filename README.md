<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="apps/docs/src/assets/logo-dark.svg" />
    <img src="apps/docs/src/assets/logo-light.svg" alt="Telixon" width="300" />
  </picture>
</p>

<p align="center">
  Phone-number parser, formatter, and validator for JavaScript and TypeScript.
</p>

<p align="center">
  <a href="https://github.com/martsinlabs/telixon/actions/workflows/ci.yml"><img src="https://github.com/martsinlabs/telixon/actions/workflows/ci.yml/badge.svg" alt="ci" /></a>
  <a href="https://proof.telixon.dev/parity.html"><img src="https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json" alt="conformance" /></a>
  <a href="https://proof.telixon.dev/benchmark.html"><img src="https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json" alt="benchmarks" /></a>
  <a href="https://codspeed.io/martsinlabs/telixon"><img src="https://img.shields.io/endpoint?url=https://codspeed.io/badge.json" alt="CodSpeed" /></a>
</p>

<p align="center">
  <a href="https://telixon.dev"><b>Documentation</b></a>
  &middot;
  <a href="https://telixon.dev/playground/input/"><b>Playground</b></a>
  &middot;
  <a href="https://telixon.dev/core/how-it-works/"><b>How it works</b></a>
</p>

## Quick start

```bash
npm install @telixon/core
```

```ts
import { ensureEngineReady, parsePhoneNumber } from '@telixon/core';

await ensureEngineReady();

const number = parsePhoneNumber('+1 (415) 555-0132');

number.isValid(); // true
number.getRegion(); // 'US'
number.formatE164(); // '+14155550132'
```

[`@telixon/web-sdk`](packages/web-sdk/README.md) drives a plain `<input>`. It formats every
keystroke, keeps the caret in place, and records undo history:

```bash
npm install @telixon/web-sdk
```

```ts
import { ensureEngineReady } from '@telixon/core';
import { createPhoneInput } from '@telixon/web-sdk';

await ensureEngineReady();

const input = document.querySelector('input')!;

const phone = createPhoneInput({
  mode: 'national',
  defaultRegion: 'US',
  input,
});

phone.subscribe((state) => {
  // After typing 4155550132:
  // state.value            '(415) 555-0132'
  // state.region           'US'
  // state.validationError  null
});
```

## Highlights

- **Compiled to one automaton.** Google publishes its metadata as regular expressions; Telixon
  compiles them ahead of time into a single deterministic finite automaton. Resolving a number is
  one linear-time walk; the state it ends on carries validity, type, region, and format.
- **An order of magnitude faster.** That one walk parses millions of numbers a second. The
  [live benchmark](https://proof.telixon.dev/benchmark.html) publishes the per-method ratios.
- **A full input controller.** Formatting on every keystroke, with caret tracking, undo and redo,
  and the full query surface mid-typing.
- **Node.js, browsers, Deno, Bun, and edge runtimes.** Package export conditions pick the build.
  CI runs each one.
- **TypeScript-first.** Region codes and number types are closed unions; a typo fails to compile.
- **Zero dependencies.**

## Conformance

Every query method with a Google libphonenumber counterpart is compared against it, across all 245
regions. The oracle runs Google's own source at the commit
[PROVENANCE.json](packages/core/src/engine/PROVENANCE.json) pins for the engine, which rules out
version drift. The gate runs in CI on every pull request and every push to main. Any divergence
fails the build.

Run it locally with `pnpm conformance`. The [live report](https://proof.telixon.dev/parity.html)
publishes every run; the [methodology](packages/core/conformance/README.md) covers the corpus. Found
a divergence the gate misses?
[Report it](https://github.com/martsinlabs/telixon/issues/new?template=conformance_divergence.yml).

## Packages

| Package                                          | Version                                                                                                                            | Status  | Role                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | ------- | --------------------------------------- |
| [`@telixon/core`](packages/core/README.md)       | [![npm](https://img.shields.io/npm/v/%40telixon%2Fcore?color=26997b&label=npm)](https://www.npmjs.com/package/@telixon/core)       | shipped | parsing, formatting, validation         |
| [`@telixon/web-sdk`](packages/web-sdk/README.md) | [![npm](https://img.shields.io/npm/v/%40telixon%2Fweb-sdk?color=26997b&label=npm)](https://www.npmjs.com/package/@telixon/web-sdk) | shipped | headless phone-field widgets            |
| `@telixon/web-components`                        |                                                                                                                                    | planned | web component                           |
| [`@telixon/angular`](packages/angular/README.md) | [![npm](https://img.shields.io/npm/v/%40telixon%2Fangular?color=26997b&label=npm)](https://www.npmjs.com/package/@telixon/angular) | shipped | phone field directive and region picker |
| `@telixon/react`                                 |                                                                                                                                    | planned | React binding                           |
| `@telixon/vue`                                   |                                                                                                                                    | planned | Vue binding                             |

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Report a
vulnerability as [SECURITY.md](SECURITY.md) describes.

## Contributing

Setup, workflow, and the engineering standards are in [CONTRIBUTING.md](CONTRIBUTING.md). The system
design is in [ARCHITECTURE.md](ARCHITECTURE.md); benchmark methodology is in
[bench/README.md](packages/core/bench/README.md).

## License

[Apache-2.0](LICENSE) © Martsin Labs
