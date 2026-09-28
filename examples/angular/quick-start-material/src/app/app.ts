import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TelixonPhoneInput, TelixonRegionPicker, type ValidationError } from '@telixon/angular';

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, TelixonPhoneInput, TelixonRegionPicker],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main>
      <h1>Phone field with Angular Material</h1>
      <p>Pick a country, type or paste a number, and leave the field to see Material's error state.</p>

      <mat-form-field appearance="outline">
        <mat-label>Phone</mat-label>

        <telixon-region-picker matTextPrefix [for]="phone" anchor=".mdc-text-field" [prioritize]="['US', 'CA', 'GB']" />

        <input
          matInput
          type="tel"
          autocomplete="tel"
          #phone="telixonPhoneInput"
          [telixonPhoneInput]="{ mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } }"
          [formControl]="control"
          [placeholder]="phone.state()?.placeholder ?? ''"
        />

        @if (control.hasError('telixonPhone')) {
          <mat-error>{{ message(control.getError('telixonPhone')) }}</mat-error>
        } @else if (control.hasError('required')) {
          <mat-error>Phone number is required.</mat-error>
        }

        <mat-hint>Pick the country, then type the number.</mat-hint>
      </mat-form-field>

      <dl>
        <dt>Form value</dt>
        <dd>{{ control.value ?? 'null' }}</dd>
      </dl>
    </main>
  `,
})
export class App {
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
