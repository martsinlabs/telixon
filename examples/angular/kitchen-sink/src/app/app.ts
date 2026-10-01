import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, form, required } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TelixonPhoneField, TelixonPhoneInput, TelixonRegionPicker, type ValidationError } from '@telixon/angular';

// Every mode of the field and the picker on one page, which the SSR build prerenders and the e2e suite drives.
@Component({
  selector: 'app-root',
  imports: [
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    FormField,
    TelixonPhoneField,
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
  readonly signalModel = signal<{ phone: string | null }>({ phone: null });
  readonly signalForm = form(this.signalModel, (schema) => {
    required(schema.phone, { message: 'Phone number is required.' });
  });
  readonly signalError = computed(() => this.signalForm.phone().errors()[0]?.message ?? 'none');
  readonly signalMaterialModel = signal<{ phone: string | null }>({ phone: null });
  readonly signalMaterialForm = form(this.signalMaterialModel, (schema) => {
    required(schema.phone, { message: 'Phone number is required.' });
  });
  readonly signalMaterialError = computed(() => this.signalMaterialForm.phone().errors()[0]?.message ?? 'none');
  readonly signalState = computed(() => {
    const field = this.signalForm.phone();
    return `${field.touched() ? 'touched' : 'untouched'} ${field.dirty() ? 'dirty' : 'pristine'}`;
  });

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
