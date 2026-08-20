# Changelog

All notable changes to `@telixon/web-sdk` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `createPhoneInput` binding a plain `<input>` to a core input controller. It wires the
  field's `beforeinput` events, writes each new value and selection back, keeps undo and redo,
  and emits `PhoneInputState` snapshots to subscribers.
- `createRegionList` feeding region pickers with search, prioritized rows, localized display
  names, and a per-row `dataFactory`.
- `regionToFlagEmoji` mapping a region code to its flag emoji.
- `@telixon/core` as a peer dependency; the engine loads through it directly.

[Unreleased]: https://github.com/martsinlabs/telixon/commits/main
