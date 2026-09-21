import type { ValidationErrors } from '@angular/forms';
import type { PhoneNumber, ValidationError } from '@telixon/core';
import { PHONE_ERROR_KEY } from '../constants/form-errors';

/**
 * The error a form sees for a phone number, present only while the number is invalid. A field with
 * no digits after the calling code reports none, which leaves emptiness to `Validators.required`.
 */
export function formError(phoneNumber: PhoneNumber): ValidationError | null {
  if (phoneNumber.isValid() || phoneNumber.getNationalNumber() === '') return null;
  return phoneNumber.getValidationError();
}

/** The `errors` entry for a form error. */
export function toValidationErrors(error: ValidationError | null): ValidationErrors | null {
  return error === null ? null : { [PHONE_ERROR_KEY]: error };
}
