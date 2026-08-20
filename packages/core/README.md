# @telixon/core

Phone-number parser, formatter, and validator built on Google libphonenumber metadata.

[![conformance](https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json)](https://proof.telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json)](https://proof.telixon.dev/benchmark.html)
[![initial bundle](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.npmjs.org%2F%40telixon%2Fcore%2Flatest&query=%24.bundleSize&label=initial%20bundle&color=26997b)](https://www.npmjs.com/package/@telixon/core)

**[Documentation](https://telixon.dev/core/)** &middot; **[Live demo](https://telixon.dev/web-sdk/guides/complete-field/)**

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
number.getRegion(); // 'US'
number.formatE164(); // '+12015550123'
number.formatInternational(); // '+1 201-555-0123'
```

Input controllers take the field's value and selection, and return the formatted value and the caret to write back:

```ts
import { createNationalInputController } from '@telixon/core';

const controller = createNationalInputController({ defaultRegion: 'US' });

controller.insert('', '4155550132', 0, 0);
// { value: '(415) 555-0132', region: 'US', selectionStart: 14, selectionEnd: 14 }

// Deleting the selected '5) 55' drops its digits and reflows what remains.
controller.deleteBackward('(415) 555-0132', 3, 8);
// { value: '(415) 013-2', region: 'US', selectionStart: 3, selectionEnd: 3 }
```

## Highlights

- **Conformance-verified.** Every query method with a Google libphonenumber counterpart is compared
  against it in CI, on every push.
- **One deterministic finite automaton.** Google publishes its metadata as regular expressions;
  Telixon compiles them ahead of time into one automaton. A single linear-time walk yields validity,
  number type, region, and format.
- **An order of magnitude faster.** A single linear walk parses millions of numbers a second,
  while the established libraries interpret regex metadata on every call. The
  [live benchmark](https://proof.telixon.dev/benchmark.html) proves the gap on every push.
- **Every JavaScript runtime.** Node.js, browsers, Deno, Bun, and edge, selected through package
  export conditions and each exercised in CI.
- **Zero dependencies.**

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Vulnerabilities
follow [SECURITY.md](https://github.com/martsinlabs/telixon/blob/main/SECURITY.md).

## Contributing

Setup, workflow, and the engineering standards are in
[CONTRIBUTING.md](https://github.com/martsinlabs/telixon/blob/main/CONTRIBUTING.md).

## License

[Apache-2.0](./LICENSE) © Martsin Labs
