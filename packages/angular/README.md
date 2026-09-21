# @telixon/angular

Phone fields for Angular. A directive turns any `<input>` into a phone field that formats as the user types, keeps the caret and the history, and works as a form control, built on [`@telixon/web-sdk`](https://www.npmjs.com/package/@telixon/web-sdk).

**[Documentation](https://telixon.dev/web-sdk/)**

## Install

```bash
npm install @telixon/angular
```

`@telixon/core` and `@telixon/web-sdk` come with it. The package re-exports both, which puts every widget, function, and type behind one import.

## Quick start

```ts
import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TelixonPhoneInput } from '@telixon/angular';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, TelixonPhoneInput],
  template: `
    <input
      #phone="telixonPhoneInput"
      [telixonPhoneInput]="{ mode: 'international', defaultRegion: 'US' }"
      [formControl]="control"
      [placeholder]="phone.state()?.placeholder ?? ''"
    />

    @if (control.errors?.['telixonPhone']; as error) {
      <p>{{ error.kind }}</p>
    } @else if (control.errors?.['required']) {
      <p>Phone number is required.</p>
    }
  `,
})
export class Contact {
  readonly control = new FormControl<string | null>(null, Validators.required);
}
```

The form value is the number in E.164 while it is valid and `null` otherwise. An invalid number reports its fault under `telixonPhone`. A field with no digits after the calling code reports none, which leaves emptiness to `Validators.required`. A partial number keeps the value `null`, which makes `Validators.required` report next to `telixonPhone`. Check `telixonPhone` first, as the example does. The options are those of `createPhoneInput`. The field follows them when they change. A bare `telixonPhoneInput` attribute makes an international field. The directive exposes the web-sdk widget as `phone` and its latest state as `state`, and `focus()` moves focus into the field.

`provideTelixon({ preloadEngine: true })` loads the engine right after the first render, which suits a field on the first screen.

## Versions

The major version follows Angular's. `@telixon/angular` 20 targets Angular 20. Each Angular major gets its own line of the package. The package's own changes bump the minor and patch versions.

## Support

Questions belong in [Discussions](https://github.com/martsinlabs/telixon/discussions). Bugs and
feature requests belong in [Issues](https://github.com/martsinlabs/telixon/issues). Vulnerabilities
follow [SECURITY.md](https://github.com/martsinlabs/telixon/blob/main/SECURITY.md).

## Contributing

Setup, workflow, and the engineering standards are in
[CONTRIBUTING.md](https://github.com/martsinlabs/telixon/blob/main/CONTRIBUTING.md).

## License

[Apache-2.0](./LICENSE) © Martsin Labs
