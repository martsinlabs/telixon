# @telixon/web-sdk

Headless DOM adapter for [`@telixon/core`](https://www.npmjs.com/package/@telixon/core): `PhoneInput` and `RegionList` state machines for the web.

[![conformance](https://img.shields.io/endpoint?url=https://telixon.dev/parity-badge.json)](https://telixon.dev/parity.html)

## Install

```bash
npm install @telixon/core @telixon/web-sdk
```

## Quick start

```ts
import { ensureEngineReady } from '@telixon/core';
import { createPhoneInput } from '@telixon/web-sdk';

// Load the engine before creating an input: createPhoneInput reads metadata and needs it ready.
await ensureEngineReady();

const phone = createPhoneInput({
  input: document.querySelector<HTMLInputElement>('#phone')!,
  mode: 'international',
});

phone.subscribe((state) => {
  // state.value, state.region, state.selectionStart, state.selectionEnd, state.validationError, state.placeholder
});
```

## Highlights

- **Full input controller.** Live formatting on every keystroke with a stable caret, including mid-string edits, deletions, and paste, not just appended digits.
- **Controlled history.** Undo and redo restore the exact prior value and caret position.
- **Headless.** No styles, no rendering. Bind to any framework or to a plain `<input>`.
- **Framework-agnostic.** Works in React, Vue, Angular, Svelte, or vanilla JS.

## What's in this package

- `createPhoneInput`: DOM-bound phone input controller (live formatting with a stable caret, history, validation surface).
- `createRegionList`: headless region list state machine (search, filtering, localization).
- `regionToFlagEmoji`: region code to its flag emoji (the pair of Unicode regional indicator symbols).

Engine, parser, and formatter live in [`@telixon/core`](https://www.npmjs.com/package/@telixon/core).

## Project

Architecture, conformance methodology, benchmarks, and the project roadmap live at the [project README](https://github.com/martsinlabs/telixon).

## Status

Pre-release. APIs may change before 1.0.

## License

[Apache-2.0](./LICENSE) © Martsin Labs
