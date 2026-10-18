import type { PhoneNumber, ValidationError } from '@telixon/core';

/**
 * The fault a form sees for a phone number, present only while the number is invalid. A field with
 * no digits after the calling code reports none, which leaves emptiness to `required`.
 */
export function formError(phoneNumber: PhoneNumber): ValidationError | null {
  if (phoneNumber.isValid() || phoneNumber.getNationalNumber() === '') return null;
  return phoneNumber.getValidationError();
}
