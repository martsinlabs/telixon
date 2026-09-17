# @telixon/web-sdk

The DOM adapter for [`@telixon/core`](https://www.npmjs.com/package/@telixon/core), shipping three headless widgets. `PhoneInput` drives a plain `<input>`, `RegionList` feeds the region picker, and `RegionPicker` drives the picker's trigger and list.

[![conformance](https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json)](https://proof.telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json)](https://proof.telixon.dev/benchmark.html)
[![initial bundle](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.npmjs.org%2F%40telixon%2Fweb-sdk%2Flatest&query=%24.bundleSize&label=initial%20bundle&color=26997b)](https://www.npmjs.com/package/@telixon/web-sdk)
[![downloads](https://img.shields.io/npm/dm/%40telixon%2Fweb-sdk?color=26997b&label=downloads)](https://www.npmjs.com/package/@telixon/web-sdk)

**[Documentation](https://telixon.dev/web-sdk/)** &middot; **[Playground](https://telixon.dev/playground/input/)**

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

`createRegionPicker` holds the open state, the row the arrow keys highlight (the keyboard cursor
that Enter picks), and the selection. Bound to a phone, it follows the phone's resolved region:

```ts
import { createRegionPicker } from '@telixon/web-sdk';

const picker = createRegionPicker({ regions, phone });

picker.open();
picker.search('can');
picker.select(picker.getState().active!); // phone.setRegion('CA')
picker.close();
```

`attachRegionPicker` wires a trigger, a popup with a search field, and a listbox to the picker. It
handles the clicks, the keys, outside presses, the ARIA attributes, and the row rendering.
`bindRegionPicker` wires the same behavior where a framework already renders the rows.

`@telixon/web-sdk/flags` ships a sprite sheet with a flag for every region. A cell is two elements.
The stylesheet carries the sheet:

```html
<span class="tlx-flag" aria-hidden="true"><span class="tlx-flag__image"></span></span>
```

The transform selects the region's cell:

```ts
import '@telixon/web-sdk/flags/flags.css';
import { flagTransform } from '@telixon/web-sdk/flags';

const image = document.querySelector<HTMLElement>('.tlx-flag__image')!;
image.style.transform = flagTransform('US'); // 'translate(-18.75%, -87.5%)'
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
