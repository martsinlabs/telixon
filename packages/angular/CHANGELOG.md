# Changelog

All notable changes to `@telixon/angular` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the major version follows Angular's, one line per
Angular major, with minor and patch versions for the package's own changes.

## [Unreleased]

### Added

- `provideTelixon` adds Telixon's providers to an Angular application. With `preloadEngine: true`
  the engine loads after the first render, in the browser only. A failed load reports to
  `ErrorHandler`.
- The package depends on `@telixon/core` and `@telixon/web-sdk` and re-exports both, which puts
  every widget, function, and type behind one import.

[Unreleased]: https://github.com/martsinlabs/telixon/commits/main/packages/angular
