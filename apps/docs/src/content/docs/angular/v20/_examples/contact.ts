import { Component } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TelixonPhoneInput, TelixonRegionPicker, type ValidationError } from '@telixon/angular';

@Component({
  selector: 'app-contact',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, TelixonPhoneInput, TelixonRegionPicker],
  template: `
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
