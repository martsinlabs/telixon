import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TelixonPhoneInput, TelixonRegionPicker, type ValidationError } from '@telixon/angular';

// Every mode of the field and the picker on one page, which the SSR build prerenders and the e2e suite drives.
@Component({
  selector: 'app-root',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    TelixonPhoneInput,
    TelixonRegionPicker,
  ],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  readonly outside = new FormControl<string | null>(null);
  readonly inside = new FormControl<string | null>(null);
  readonly national = new FormControl<string | null>(null);
  readonly disabled = new FormControl<string | null>({ value: '+14155550132', disabled: true });
  readonly formPhone = new FormControl<string | null>(null);
  readonly material = new FormControl<string | null>(null, Validators.required);
  readonly rtl = new FormControl<string | null>(null);
  readonly deferred = new FormControl<string | null>(null);
  readonly autofillInside = new FormControl<string | null>(null);
  readonly autofillOutside = new FormControl<string | null>(null);
  templateValue: string | null = null;
  readonly submissions = signal(0);

  submit(): void {
    this.submissions.update((count: number): number => count + 1);
  }

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
