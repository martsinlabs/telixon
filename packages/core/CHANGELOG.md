# Changelog

All notable changes to `@telixon/core` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/martsinlabs/telixon/compare/core@v1.0.0...HEAD
[1.0.0]: https://github.com/martsinlabs/telixon/releases/tag/core@v1.0.0
