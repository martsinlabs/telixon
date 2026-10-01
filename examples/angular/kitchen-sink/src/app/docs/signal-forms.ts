import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { TelixonPhoneField, TelixonRegionPicker } from '@telixon/angular';

@Component({
  selector: 'app-contact',
  imports: [FormField, TelixonPhoneField, TelixonRegionPicker],
  template: `
    <telixon-region-picker [for]="phone" [prioritize]="['US', 'CA', 'GB']" />

    <input
      type="tel"
      autocomplete="tel"
      #phone="telixonPhoneField"
      [telixonPhoneField]="{ mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } }"
      [formField]="contactForm.phone"
      [placeholder]="phone.state()?.placeholder ?? ''"
      [attr.aria-invalid]="contactForm.phone().touched() && contactForm.phone().invalid() ? true : null"
      aria-describedby="phone-error"
    />

    @if (contactForm.phone().touched() && contactForm.phone().invalid()) {
      <p id="phone-error">{{ contactForm.phone().errors()[0]?.message }}</p>
    }
  `,
})
export class Contact {
  readonly model = signal<{ phone: string | null }>({ phone: null });
  readonly contactForm = form(this.model, (schema) => {
    required(schema.phone, { message: 'Phone number is required.' });
  });
}
