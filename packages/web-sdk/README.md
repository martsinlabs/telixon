# @telixon/web-sdk

The DOM adapter for [`@telixon/core`](https://www.npmjs.com/package/@telixon/core), shipping two headless widgets: `PhoneInput` drives a plain `<input>`, `RegionList` feeds the region picker.

[![conformance](https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json)](https://proof.telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json)](https://proof.telixon.dev/benchmark.html)
[![initial bundle](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.npmjs.org%2F%40telixon%2Fweb-sdk%2Flatest&query=%24.bundleSize&label=initial%20bundle&color=26997b)](https://www.npmjs.com/package/@telixon/web-sdk)

**[Documentation](https://telixon.dev/web-sdk/)** &middot; **[Live demo](https://telixon.dev/web-sdk/guides/complete-field/)**

## Install

```bash
npm install @telixon/core @telixon/web-sdk
```

## Quick start

`createPhoneInput` turns a plain `<input>` into a phone field, handling the events, the caret, and the history:

```ts
import { ensureEngineReady } from '@telixon/core';
import { createPhoneInput } from '@telixon/web-sdk';

await ensureEngineReady(); // once per process; createPhoneInput throws until it resolves

const phone = createPhoneInput({
  mode: 'international',
  input: document.querySelector<HTMLInputElement>('#phone')!,
});

phone.subscribe((state) => {
  // After typing +442071838750:
  // state.value            '44 20 7183 8750'
  // state.region           'GB'
  // state.validationError  null
});
```

`createRegionList` feeds a region picker, with search, sorting, and pinned rows already applied:

```ts
import { createRegionList, regionToFlagEmoji } from '@telixon/web-sdk';

const regions = createRegionList({
  prioritize: ['US', 'CA', 'GB'],
  dataFactory: ({ region }) => regionToFlagEmoji(region),
});

regions.getState().options[0];
// { region: 'US', callingCode: '1', displayName: 'United States', data: '🇺🇸' }

regions.search('united');
regions.getState().options.map((option) => option.region); // ['US', 'GB', 'AE']
```

## Highlights

- **Full input controller.** Live formatting on every keystroke with a stable caret, across
  mid-string edits, deletions, and paste.
- **Controlled history.** Undo and redo restore the exact prior value and selection.
- **Headless.** No styles, no rendering. Binds a plain `<input>` in React, Vue, Angular, Svelte, or
  vanilla JS.

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Vulnerabilities
follow [SECURITY.md](https://github.com/martsinlabs/telixon/blob/main/SECURITY.md).

## Contributing

Setup, workflow, and the engineering standards are in
[CONTRIBUTING.md](https://github.com/martsinlabs/telixon/blob/main/CONTRIBUTING.md).

## License

[Apache-2.0](./LICENSE) © Martsin Labs
