import { JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TelixonPhoneField, TelixonRegionPicker } from '@telixon/angular';

@Component({
  selector: 'app-root',
  imports: [JsonPipe, FormField, MatFormFieldModule, MatInputModule, TelixonPhoneField, TelixonRegionPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>Phone field on a Signal Form with Angular Material</h1>
      <p>Pick a country, type or paste a number, and leave the field to see Material's error state.</p>

      <mat-form-field appearance="outline">
        <mat-label>Phone</mat-label>

        <telixon-region-picker matTextPrefix [for]="phone" anchor=".mdc-text-field" [prioritize]="['US', 'CA', 'GB']" />

        <input
          matInput
          type="tel"
          autocomplete="tel"
          #phone="telixonPhoneField"
          [telixonPhoneField]="{ mode: 'national', defaultRegion: 'US' }"
          [formField]="contactForm.phone"
          [placeholder]="phone.state()?.placeholder ?? ''"
        />

        <mat-error>{{ contactForm.phone().errors()[0]?.message }}</mat-error>
        <mat-hint>Pick the country, then type the number.</mat-hint>
      </mat-form-field>

      <dl>
        <dt>Model</dt>
        <dd>{{ model() | json }}</dd>
      </dl>
    </main>
  `,
})
export class App {
  readonly model = signal<{ phone: string | null }>({ phone: null });

  readonly contactForm = form(this.model, (schema) => {
    required(schema.phone, { message: 'Phone number is required.' });
  });
}
