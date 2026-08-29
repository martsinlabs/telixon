# Changelog

All notable changes to `@telixon/web-sdk` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-08-28

### Fixed

- `compositionend` reads the composed text the browser has already committed into the value
  instead of inserting it a second time.
- A DOM value changed outside the `beforeinput` pipeline (browser autofill, password managers)
  resynchronizes the controller through a new `input`-event fallback.
- `createPhoneInput` seeds the controller from a value already present in the input element when
  no `initialValue` is passed, instead of clearing it at attach.

## [1.0.0] - 2026-08-21

### Added

- `createPhoneInput` binding a plain `<input>` to a core input controller. It wires the
  field's `beforeinput` events, writes each new value and selection back, keeps undo and redo,
  and emits `PhoneInputState` snapshots to subscribers.
- `createRegionList` feeding region pickers with search, prioritized rows, localized display
  names, and a per-row `dataFactory`.
- `regionToFlagEmoji` mapping a region code to its flag emoji.
- `@telixon/core` as a peer dependency; the engine loads through it directly.

[Unreleased]: https://github.com/martsinlabs/telixon/compare/web-sdk@v1.0.1...HEAD
[1.0.1]: https://github.com/martsinlabs/telixon/compare/web-sdk@v1.0.0...web-sdk@v1.0.1
[1.0.0]: https://github.com/martsinlabs/telixon/releases/tag/web-sdk@v1.0.0
