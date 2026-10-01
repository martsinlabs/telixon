# @telixon/angular

Phone fields for Angular, built on [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk). A directive goes on your own `<input>`. The user sees a formatted number while the form control holds it in E.164. A region picker adds the flag and a searchable list of regions.

[![conformance](https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json)](https://proof.telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json)](https://proof.telixon.dev/benchmark.html)
[![initial bundle](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.npmjs.org%2F%40telixon%2Fangular%2Flatest&query=%24.bundleSize&label=initial%20bundle&color=26997b)](https://www.npmjs.com/package/@telixon/angular)
[![downloads](https://img.shields.io/npm/dm/%40telixon%2Fangular?color=26997b&label=downloads)](https://www.npmjs.com/package/@telixon/angular)

Both parts fit around your own markup. The picker takes your templates for its trigger and its rows. Every part restyles through one class selector.

**[Documentation](https://telixon.dev/angular/)**

## Install

```bash
ng add @telixon/angular
```

`ng add` installs the package, adds the flags stylesheet to the application's styles, and registers `provideTelixon` with the engine preload.

Or install the package and take the other two steps by hand:

```bash
npm install @telixon/angular
```

```css
/* styles.css */
@import '@telixon/angular/flags/flags.css';
```

`provideTelixon({ preloadEngine: true })` loads the engine in the background right after the first render:

```ts
// app.config.ts
import { type ApplicationConfig } from '@angular/core';
import { provideTelixon } from '@telixon/angular';

export const appConfig: ApplicationConfig = {
  providers: [provideTelixon({ preloadEngine: true })],
};
```

## Quick start

A phone field with a region picker:

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TelixonPhoneInput, TelixonRegionPicker } from '@telixon/angular';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, TelixonPhoneInput, TelixonRegionPicker],
  template: `
    <telixon-region-picker [for]="phone" [prioritize]="['US', 'CA', 'GB']" />

    <input
      type="tel"
      autocomplete="tel"
      #phone="telixonPhoneInput"
      [telixonPhoneInput]="{ mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } }"
      [formControl]="control"
      [placeholder]="phone.state()?.placeholder ?? ''"
    />
  `,
})
export class Contact {
  readonly control = new FormControl<string | null>(null);
}
```

The form value is the number in E.164 while it is valid and `null` otherwise. An invalid number reports its fault under `telixonPhone`.

On a Signal Form, `TelixonPhoneField` binds the same field through `[formField]`, as the [guide](https://telixon.dev/angular/guides/signal-forms/) shows.

The same field runs on StackBlitz, [on its own](https://stackblitz.com/github/martsinlabs/telixon/tree/main/examples/angular/quick-start), [inside Angular Material](https://stackblitz.com/github/martsinlabs/telixon/tree/main/examples/angular/quick-start-material), or [on a Signal Form](https://stackblitz.com/github/martsinlabs/telixon/tree/main/examples/angular/quick-start-signal-forms).

## Versions

The major version follows Angular's. The package's own changes bump the minor and patch versions.

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Report a
vulnerability as [SECURITY.md](https://github.com/martsinlabs/telixon/blob/main/SECURITY.md) describes.

## Contributing

Setup, workflow, and the engineering standards are in
[CONTRIBUTING.md](https://github.com/martsinlabs/telixon/blob/main/CONTRIBUTING.md).

## License

[Apache-2.0](./LICENSE) © Martsin Labs
