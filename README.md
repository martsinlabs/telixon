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
  <a href="https://proof.telixon.dev/bundle.html"><img src="https://img.shields.io/endpoint?url=https://proof.telixon.dev/bundle-badge.json" alt="initial bundle" /></a>
  <a href="https://codspeed.io/martsinlabs/telixon"><img src="https://img.shields.io/endpoint?url=https://codspeed.io/badge.json" alt="CodSpeed" /></a>
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

The same engine drives a phone field, formatting on every keystroke and holding the caret:

```ts
import { createNationalInputController } from '@telixon/core';

const controller = createNationalInputController({ defaultRegion: 'US' });

controller.insert('', '415', 0, 0);
// { value: '(415) ', region: 'US', selectionStart: 6, selectionEnd: 6 }

controller.insert('(415) ', '5550132', 6, 6);
// { value: '(415) 555-0132', region: 'US', selectionStart: 14, selectionEnd: 14 }
```

Full documentation is at [telixon.dev](https://telixon.dev), with live demos for the
[phone field](https://telixon.dev/web-sdk/guides/phone-field/),
[region picker](https://telixon.dev/web-sdk/guides/region-picker/), and
[complete field](https://telixon.dev/web-sdk/guides/complete-field/).

## Highlights

- **Compiled to one automaton.** Google publishes its metadata as regular expressions; Telixon
  compiles them ahead of time into a single deterministic finite automaton. Resolving a number is
  one linear-time walk, and the state it ends on carries validity, type, region, and format.
- **No third-party dependencies.** `@telixon/core` installs nothing beyond itself.
- **Every JavaScript runtime.** Node.js, browsers, Deno, Bun, and edge, selected through package
  export conditions.
- **A real input controller.** Formatting on every keystroke, with caret tracking, undo and redo,
  and the full query surface mid-typing.
- **TypeScript-first.** Region codes and number types are closed unions; a typo fails to compile.

## Conformance

Every query method with a Google libphonenumber counterpart is compared against it, across all 245
regions. The oracle runs Google's own source at the commit
[PROVENANCE.json](packages/core/src/engine/PROVENANCE.json) pins for the engine, which rules out
version drift. The gate runs in CI on every push and pull request. Any divergence fails the build.

Run it locally with `pnpm conformance`. The [live report](https://proof.telixon.dev/parity.html)
publishes every run; the [methodology](packages/core/conformance/README.md) covers the corpus. Found
a divergence the gate misses?
[Report it](https://github.com/martsinlabs/telixon/issues/new?template=conformance_divergence.yml).

## Packages

| Package                                          | Status  | Role                                  |
| ------------------------------------------------ | ------- | ------------------------------------- |
| [`@telixon/core`](packages/core/README.md)       | shipped | parsing, formatting, validation       |
| [`@telixon/web-sdk`](packages/web-sdk/README.md) | shipped | headless DOM input controller         |
| `@telixon/components`                            | planned | drop-in Web Component (`<tel-input>`) |
| `@telixon/angular`                               | planned | Angular binding                       |
| `@telixon/react`                                 | planned | React binding (hook + component)      |
| `@telixon/vue`                                   | planned | Vue binding                           |

## Status

`@telixon/core` and `@telixon/web-sdk` are stable at 1.0. Their public APIs follow semantic
versioning; a breaking change requires a major release.

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Vulnerabilities
follow [SECURITY.md](SECURITY.md).

## Contributing

Setup, workflow, and the engineering standards are in [CONTRIBUTING.md](CONTRIBUTING.md). The system
design is in [ARCHITECTURE.md](ARCHITECTURE.md), and benchmark methodology is in
[bench/README.md](packages/core/bench/README.md).

## License

[Apache-2.0](LICENSE) © Martsin Labs
