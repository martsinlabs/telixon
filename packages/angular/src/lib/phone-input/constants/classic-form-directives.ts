import type { ProviderToken } from '@angular/core';
import { FormControlDirective, FormControlName, NgModel } from '@angular/forms';

/** The directives of reactive and template-driven forms, which belong on `telixonPhoneInput`. */
export const CLASSIC_FORM_DIRECTIVES: readonly ProviderToken<unknown>[] = [
  FormControlDirective,
  FormControlName,
  NgModel,
];

/** The message of the error thrown when one of them sits on an input with `telixonPhoneField`. */
export const CLASSIC_FORM_DIRECTIVE_MESSAGE =
  'telixonPhoneField binds through [formField]. Put telixonPhoneInput on an input with [formControl], formControlName, or ngModel.';
