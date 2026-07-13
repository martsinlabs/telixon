# Telixon

Phone-number parser, formatter, and validator for JavaScript and TypeScript.

[![ci](https://github.com/martsinlabs/telixon/actions/workflows/ci.yml/badge.svg)](https://github.com/martsinlabs/telixon/actions/workflows/ci.yml)
[![conformance](https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json)](https://proof.telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json)](https://proof.telixon.dev/benchmark.html)
[![CodSpeed](https://img.shields.io/endpoint?url=https://codspeed.io/badge.json)](https://codspeed.io/martsinlabs/telixon)

## Conformance

Telixon's behavior is verified against Google libphonenumber at the same commit the engine was
compiled from. The conformance gate runs in CI on every push and pull request and fails on any
divergence.

- **Version-matched.** [PROVENANCE.json](packages/core/src/engine/PROVENANCE.json) pins the upstream
  commit; the oracle loads Google's source at that exact commit, so there is no metadata version
  drift.
- **Exhaustive.** Every supported region and every public query method, on valid numbers, their
  display spellings (international, national, RFC3966), deterministic corruptions of them (truncated,
  extended, digit-shifted, unassigned calling codes), and every digit prefix, plus per-keystroke
  formatting.
- **Reproducible.** `pnpm conformance` runs the gate locally.

Live report: [proof.telixon.dev/parity.html](https://proof.telixon.dev/parity.html). Methodology:
[conformance/README.md](packages/core/conformance/README.md).

## Engine

The engine compiles Google's libphonenumber metadata, which Google publishes as regular expressions,
into deterministic finite-state automata. Validity and number typing are decided by a recognition DFA;
region disambiguation and format selection run on finite-state transducers. Every query is a
linear-time, backtracking-free walk over these tables, which is what keeps per-keystroke resolution
cheap.

The metadata is runtime data loaded once, out of your JS bundle, so it never affects your initial
bundle or load (in the browser you trigger the load with `ensureEngineReady()`). Details:
[ARCHITECTURE.md](ARCHITECTURE.md). Measured bundle breakdown, reproducible from
[examples/core/bundle-size](examples/core/bundle-size): [proof.telixon.dev/bundle.html](https://proof.telixon.dev/bundle.html).

## Packages

| Package               | Status  | Role                                  |
| --------------------- | ------- | ------------------------------------- |
| `@telixon/core`       | shipped | engine and phone-number logic         |
| `@telixon/web-sdk`    | shipped | headless DOM adapter                  |
| `@telixon/components` | planned | drop-in Web Component (`<tel-input>`) |
| `@telixon/angular`    | planned | Angular binding                       |
| `@telixon/react`      | planned | React binding (hook + component)      |
| `@telixon/vue`        | planned | Vue binding                           |

Install and usage live in each package's README:

- [`@telixon/core`](packages/core/README.md): parse, format, validate.
- [`@telixon/web-sdk`](packages/web-sdk/README.md): headless DOM input controller.

## Status

Pre-1.0. The engine and the conformance baseline are functional and CI-gated; the framework bindings
and the component layer are not yet implemented (see [ARCHITECTURE.md](ARCHITECTURE.md)). APIs may
change before 1.0.

## Links

- [ARCHITECTURE.md](ARCHITECTURE.md): system architecture
- [CONTRIBUTING.md](CONTRIBUTING.md): setup, workflow, engineering standards
- [conformance/README.md](packages/core/conformance/README.md): parity report and methodology
- [bench/README.md](packages/core/bench/README.md): benchmark methodology and live dashboard

## License

[Apache-2.0](LICENSE) © Martsin Labs
