# Changelog

All notable changes to `@telixon/angular` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the major version follows Angular's, one line per
Angular major, with minor and patch versions for the package's own changes.

## [Unreleased]

### Added

- `TelixonPhoneInput` turns an `<input>` into a phone field that works as a form control. The form
  value is the number in E.164 while it is valid and `null` otherwise. An invalid number reports its
  fault under `telixonPhone`, while a field with no digits after the calling code leaves emptiness
  to `Validators.required`. The field follows its options when they change. It exposes the web-sdk
  widget as `phone`, its state as `state`, the input as `element`, a `disabled` signal, and `focus()`.
- `TelixonRegionPicker` is the region picker of a phone field, a trigger with the flag and a
  searchable list of regions, linked through `[for]`. The field owns the region. The list follows
  the field's filters, takes its names from `LOCALE_ID`, and opens in the top layer where the
  viewport has room. `anchor`, `popupOffset`, and `autoFocus` place the list and decide whether its
  search field takes focus. Its styles sit in the `telixon` cascade layer at zero specificity, where
  one class selector restyles any part, while `telixonRegionOption` and `telixonRegionTrigger`
  templates replace the content of a row and of the trigger.
- `TelixonFlag` renders the flag of a region from the web-sdk sprite sheet, whose stylesheet ships
  as `@telixon/angular/flags/flags.css`. The package re-exports `@telixon/web-sdk/flags`.
- `provideTelixon` adds Telixon's providers to an Angular application. With `preloadEngine: true`
  the engine loads after the first render, in the browser only. A failed load reports to
  `ErrorHandler`.
- The package depends on `@telixon/core` and `@telixon/web-sdk` and re-exports both, which puts
  every widget, function, and type behind one import.

[Unreleased]: https://github.com/martsinlabs/telixon/commits/main/packages/angular
