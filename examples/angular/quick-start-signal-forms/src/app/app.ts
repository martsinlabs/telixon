import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { TelixonPhoneField, TelixonRegionPicker } from '@telixon/angular';

@Component({
  selector: 'app-root',
  imports: [FormField, TelixonPhoneField, TelixonRegionPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>Phone field on a Signal Form</h1>
      <p>Pick a country, type or paste a number, and watch the model follow.</p>

      <div class="field">
        <telixon-region-picker [for]="phone" [prioritize]="['US', 'CA', 'GB']" />

        <input
          type="tel"
          autocomplete="tel"
          aria-label="Phone"
          #phone="telixonPhoneField"
          [telixonPhoneField]="{ mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } }"
          [formField]="contactForm.phone"
          [placeholder]="phone.state()?.placeholder ?? ''"
        />
      </div>

      <dl>
        <dt>Model value</dt>
        <dd>{{ model().phone ?? 'null' }}</dd>
        <dt>Error</dt>
        <dd>{{ error() }}</dd>
      </dl>
    </main>
  `,
})
export class App {
  readonly model = signal<{ phone: string | null }>({ phone: null });
  readonly contactForm = form(this.model, (schema) => {
    required(schema.phone, { message: 'Phone number is required.' });
  });
  readonly error = computed(() => this.contactForm.phone().errors()[0]?.message ?? 'none');
}
