import type { PhoneNumber } from '@telixon/core';

/** The value a form holds for a phone number, its E.164 form while valid and `null` otherwise. */
export function formValue(phoneNumber: PhoneNumber): string | null {
  return phoneNumber.isValid() ? phoneNumber.formatE164() : null;
}
