# Changelog

All notable changes to `@telixon/core` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.0] - 2026-09-28

### Added

- Fullwidth digits and both Arabic-Indic ranges read like ASCII digits, which are the three scripts
  google/libphonenumber maps. A number pasted from a page written in one of them, or typed through
  an input method that sends fullwidth digits, reached the field as no digits at all. With the paste
  reading below, the browser entry grows from 26.68 kB to 27.68 kB brotli.

### Fixed

- `setRegion` on a field that shows the calling code writes that region's code into the field and
  keeps the national digits. It kept the code already there, which left a pick without effect until
  the field was cleared.
- Text carrying a plus, a calling code and a national part enters an input controller as one
  international number, without a written trunk prefix and without an extension. With the calling
  code outside the field the region moves to the number's own. Both controllers read such text as
  loose digits, which left `+44 20 7183 8750` in a US field as `442071838750`.
- A pasted number is found behind a `tel:` scheme, a label, quotes or a text direction mark. A
  fullwidth plus counts as a plus. Only text whose first character was a plus read as a whole
  number.
- `getValidationError` reports `EMPTY` for an input without digits under a default region. It
  reported `TOO_SHORT`, which left `EMPTY` unreachable for a pristine field.
- `setRegion` with a region the engine does not know leaves the field alone. It cleared the field's
  region, which dropped the placeholder and re-read the value of a calling-code-outside field as an
  international number.
- `formatE164` returns `null` for digits behind no calling code, such as `+00123456` under a default
  region. It returned those digits after a plus, which is no E.164 number.

## [1.1.3] - 2026-09-24

### Changed

- The engine metadata moves to google/libphonenumber v9.0.38 (from v9.0.37).
- The engine artifact is rebuilt with a smaller encoding. The four embedded modules shrink from
  163 KB to 113 KB. Verdicts, formats, and validation results are unchanged.

### Fixed

- A national input controller without national digits reports its own region. It reported the
  calling code's primary region, which showed a Canadian field as US and dropped a `setRegion`
  call on an empty field.
- `getValidationError` returns `null` for a valid number whose length is dialed only locally, such
  as Canada's seven-digit `310` numbers. It reported `POSSIBLE_LOCAL_ONLY` while `isValid` was true.
- A selection reported past the stored value is clamped to its bounds before it is kept, keeping
  `currentState` and the history snapshots coherent for coerced degenerate input.

## [1.1.2] - 2026-09-01

### Fixed

- A backspace with no digit before the caret keeps the caret at its position. Both input
  controllers stored the previous edit's selection for that branch, which sent the caret to the
  end of the field when backspacing on a fixed plus.

## [1.1.1] - 2026-08-28

### Fixed

- An insert without digits typed over a selection consumes the selected digits instead of keeping
  them, matching native input behavior.
- An international paste that repeats the calling code the field already shows drops the duplicate
  code when the raw digits cannot resolve.
- `InputState.region` reports `null` once the typed digits can no longer complete a calling code,
  as the contract documents.
- `parsePhoneNumber` and the controller methods coerce non-string runtime input to a string,
  keeping the documented no-throw contract for plain JavaScript callers.

## [1.1.0] - 2026-08-27

### Changed

- Backspace and forward delete treat formatting characters as transparent and consume the nearest
  digit on the edit side in one press.

## [1.0.1] - 2026-08-23

### Changed

- `PhoneNumber` and the input controllers hold their state in native private fields; a runtime
  instance exposes the public methods only.
- `REGION_CODES` and `NUMBER_TYPES` are frozen at runtime.
- The engine metadata moves to google/libphonenumber v9.0.37 (from v9.0.35).

## [1.0.0] - 2026-08-21

### Added

- `parsePhoneNumber` with `defaultRegion` and `strict` options. It never throws on bad input; the
  returned `PhoneNumber` reports why a value is not valid.
- The `PhoneNumber` query surface with fourteen methods (`isValid`, `isValidForRegion`,
  `isPossible`, `isPossibleWithReason`, `getValidationError`, `getNumberType`, `getNationalNumber`,
  `getCallingCode`, `getExtension`, `getRegion`, `formatE164`, `formatNational`, `formatInternational`,
  `formatRfc3966`).
- `ValidationError` as nine typed variants, each carrying the values behind the fault.
- Phone extension capture under the notations Google libphonenumber recognizes (`ext.`, `x`, `#`,
  `int`, comma, tilde, the RFC 3966 `;ext=` parameter). `getExtension` returns the digits as
  typed; `formatNational` and `formatInternational` render them with the territory's preferred
  prefix; `formatRfc3966` carries them as `;ext=`; `formatE164` stays extension-free.
- `createNationalInputController` and `createInternationalInputController`. Every edit takes the
  field's value and selection, and returns the formatted value and the caret to write back, with
  undo, redo, region and number-type filters, and `getPhoneNumber` for queries mid-typing.
- `matchPhoneNumbers`, grading whether two inputs denote the same number with the five
  `PhoneNumberMatch` values of Google libphonenumber's isNumberMatch.
- Region data (`REGION_CODES` with 245 regions, `NUMBER_TYPES`, `getCallingCodeForRegion`,
  `getPlaceholders`, `isNationalPrefixOptional`, `regionSupportsNumberTypes`).
- Explicit engine initialization (`ensureEngineReady`, `isEngineReady`, `EngineNotReadyError`) with
  a synchronous entry (`ensureEngineReadySync` from `@telixon/core/sync-init`), selected per
  runtime through package export conditions for Node.js, browsers, and edge.
- A conformance gate in CI comparing every query method with a Google libphonenumber counterpart
  against Google's source at the pinned metadata commit.

[Unreleased]: https://github.com/martsinlabs/telixon/compare/core@v1.2.0...HEAD
[1.2.0]: https://github.com/martsinlabs/telixon/compare/core@v1.1.3...core@v1.2.0
[1.1.3]: https://github.com/martsinlabs/telixon/compare/core@v1.1.2...core@v1.1.3
[1.1.2]: https://github.com/martsinlabs/telixon/compare/core@v1.1.1...core@v1.1.2
[1.1.1]: https://github.com/martsinlabs/telixon/compare/core@v1.1.0...core@v1.1.1
[1.1.0]: https://github.com/martsinlabs/telixon/compare/core@v1.0.1...core@v1.1.0
[1.0.1]: https://github.com/martsinlabs/telixon/compare/core@v1.0.0...core@v1.0.1
[1.0.0]: https://github.com/martsinlabs/telixon/releases/tag/core@v1.0.0
