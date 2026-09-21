# Changelog

All notable changes to `@telixon/angular` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the major version follows Angular's, one line per
Angular major, with minor and patch versions for the package's own changes.

## [Unreleased]

### Added

- `TelixonPhoneInput` turns an `<input>` into a phone field that formats as the user types and
  works as a form control. The form value is the number in E.164 while it is valid and `null`
  otherwise. An invalid number reports its fault under `telixonPhone`. A field with no digits after
  the calling code reports none, which leaves emptiness to `Validators.required`. The field follows
  its options when they change. The directive exposes the web-sdk widget as `phone`, its state as
  `state`, and `focus()`.
- `provideTelixon` adds Telixon's providers to an Angular application. With `preloadEngine: true`
  the engine loads after the first render, in the browser only. A failed load reports to
  `ErrorHandler`.
- The package depends on `@telixon/core` and `@telixon/web-sdk` and re-exports both, which puts
  every widget, function, and type behind one import.

[Unreleased]: https://github.com/martsinlabs/telixon/commits/main/packages/angular
