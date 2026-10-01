import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { TelixonPhoneInput, type ValidationError } from '@telixon/angular';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, TelixonPhoneInput],
  template: `
    <input
      type="tel"
      autocomplete="tel"
      #phone="telixonPhoneInput"
      [telixonPhoneInput]="{ mode: 'international', defaultRegion: 'US' }"
      [formControl]="control"
      [placeholder]="phone.state()?.placeholder ?? ''"
      [attr.aria-invalid]="control.touched && control.invalid ? true : null"
      aria-describedby="phone-error"
    />

    @if (control.touched) {
      @if (control.errors?.['telixonPhone']; as fault) {
        <p id="phone-error">{{ message(fault) }}</p>
      } @else if (control.errors?.['required']) {
        <p id="phone-error">Phone number is required.</p>
      }
    }
  `,
})
export class Contact {
  readonly control = new FormControl<string | null>(null, Validators.required);

  message(fault: ValidationError): string {
    switch (fault.kind) {
      case 'TOO_SHORT':
      case 'POSSIBLE_LOCAL_ONLY':
        return 'This number is too short.';
      case 'TOO_LONG':
        return 'This number is too long.';
      default:
        return 'This number does not exist.';
    }
  }
}
