import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TelixonPhoneInput, TelixonRegionPicker } from '@telixon/angular';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, TelixonPhoneInput, TelixonRegionPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>Phone field</h1>
      <p>Pick a country, type or paste a number, and watch the form value follow.</p>

      <div class="field">
        <telixon-region-picker [for]="phone" [prioritize]="['US', 'CA', 'GB']" />

        <input
          type="tel"
          autocomplete="tel"
          aria-label="Phone"
          #phone="telixonPhoneInput"
          [telixonPhoneInput]="{ mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } }"
          [formControl]="control"
          [placeholder]="phone.state()?.placeholder ?? ''"
        />
      </div>

      <dl>
        <dt>Form value</dt>
        <dd>{{ control.value ?? 'null' }}</dd>
        <dt>Error</dt>
        <dd>{{ control.errors?.['telixonPhone']?.kind ?? 'none' }}</dd>
      </dl>
    </main>
  `,
})
export class App {
  readonly control = new FormControl<string | null>(null);
}
