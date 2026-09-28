# @telixon/angular

Phone fields for Angular, built on [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk). A directive turns an `<input>` into a phone field that works as a form control. A region picker adds the flag and a searchable list of regions.

[![conformance](https://img.shields.io/endpoint?url=https://proof.telixon.dev/parity-badge.json)](https://proof.telixon.dev/parity.html)
[![benchmarks](https://img.shields.io/endpoint?url=https://proof.telixon.dev/bench-badge.json)](https://proof.telixon.dev/benchmark.html)
[![initial bundle](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fregistry.npmjs.org%2F%40telixon%2Fangular%2Flatest&query=%24.bundleSize&label=initial%20bundle&color=26997b)](https://www.npmjs.com/package/@telixon/angular)
[![downloads](https://img.shields.io/npm/dm/%40telixon%2Fangular?color=26997b&label=downloads)](https://www.npmjs.com/package/@telixon/angular)

The two are a construction kit. The directive goes on your own `<input>`, while the picker takes your templates for its trigger and its rows. Every part restyles through one class selector.

**[Documentation](https://telixon.dev/angular/)**

## Install

```bash
ng add @telixon/angular
```

`ng add` installs the package, puts the flags stylesheet in the application's styles, and provides `provideTelixon` with the engine preload.

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

Open it on StackBlitz: [the field](https://stackblitz.com/github/martsinlabs/telixon/tree/main/examples/angular/quick-start) or [the field inside Angular Material](https://stackblitz.com/github/martsinlabs/telixon/tree/main/examples/angular/quick-start-material).

## Versions

The major version follows Angular's, where `@telixon/angular` 20 targets Angular 20. The package's own changes bump the minor and patch versions.

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Vulnerabilities
follow [SECURITY.md](https://github.com/martsinlabs/telixon/blob/main/SECURITY.md).

## Contributing

Setup, workflow, and the engineering standards are in
[CONTRIBUTING.md](https://github.com/martsinlabs/telixon/blob/main/CONTRIBUTING.md).

## License

[Apache-2.0](./LICENSE) © Martsin Labs
