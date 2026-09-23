# Changelog

All notable changes to `@telixon/web-sdk` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-09-23

### Added

- `bindRegionPicker` wires the behavior of a region picker to a trigger, a popup, and a listbox
  whose rows the caller renders. It writes the attributes describing the parts once, then leaves
  the rows and every attribute that follows the state to the caller. `attachRegionPicker` is this
  binding with the rendering on top.

### Fixed

- A click on a region picker's trigger takes focus to the trigger. Safari leaves focus on the body
  after a button press, which stranded the keys until focus moved by hand.
- A press inside a region picker's popup keeps the list open when the popup lives in a shadow root.
  Such a press reaches the document retargeted to the host, which read as a press outside.

## [1.1.0] - 2026-09-11

### Added

- `attachRegionPicker` wires a trigger, a popup with an optional search field, and a listbox to a
  `RegionPicker`. Clicks, keys, typing, pointer moves, outside presses, and focus leaving flow in.
  The popup's `hidden`, the rows, the combobox and option attributes, the cursor, the search
  field's value, and focus flow out.
- `createRegionPicker` drives a region picker's trigger and list. It reads rows from a
  `RegionList` and holds the open state, the keyboard cursor, and the selected option. Bound to a
  `PhoneInput`, it follows the phone's resolved region.
- `RegionList.getOption(region)` returns the option for a region from the base set, regardless of
  the filters and the query, as the same object that appears in `options`.
- `@telixon/web-sdk/flags` ships a flag sprite for every engine region plus a neutral cell,
  rendered from flag-icons artwork at 1x and 2x. `flagOffset` and `flagTransform` return the
  `translate` that shows one region's cell. `flags.css` sizes the `.tlx-flag` cell, carries the
  sheet with the 2x sheet under a resolution media query, and shows the neutral cell until a
  transform is set.

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

[Unreleased]: https://github.com/martsinlabs/telixon/compare/web-sdk@v1.2.0...HEAD
[1.2.0]: https://github.com/martsinlabs/telixon/compare/web-sdk@v1.1.0...web-sdk@v1.2.0
[1.1.0]: https://github.com/martsinlabs/telixon/compare/web-sdk@v1.0.1...web-sdk@v1.1.0
[1.0.1]: https://github.com/martsinlabs/telixon/compare/web-sdk@v1.0.0...web-sdk@v1.0.1
[1.0.0]: https://github.com/martsinlabs/telixon/releases/tag/web-sdk@v1.0.0
