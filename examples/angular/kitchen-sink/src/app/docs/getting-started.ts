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
