# Changelog

All notable changes to `@telixon/web-components` are documented in this file. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-10-20

### Added

- `<telixon-phone-field>`, a form-associated element around the page's own `<input>`.
- `<telixon-region-picker>`, the region picker of a phone field.
- `<telixon-flag>`, the flag of a region.
- `defineTelixonElements`, which registers the three elements.
- A server entry under the `node` export condition, which imports without a DOM.
- `flags/flags.css` with the sprite, which paints `<telixon-flag>` and the flags inside the picker through
  its `flag` part.
- Type entries `@telixon/web-components/react` and `@telixon/web-components/vue`, which type the three
  tags in JSX and in Vue templates.
- Types for the `telixon-change` and `telixon-state` events, which `addEventListener` picks up on the
  element and on any ancestor they bubble to.

[Unreleased]: https://github.com/martsinlabs/telixon/compare/web-components@v1.0.0...HEAD
[1.0.0]: https://github.com/martsinlabs/telixon/releases/tag/web-components@v1.0.0
