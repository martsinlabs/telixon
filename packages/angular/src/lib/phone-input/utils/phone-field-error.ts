import type { ValidationError } from '@telixon/core';
import { PHONE_ERROR_KEY } from '../constants/form-errors';
import type { TelixonPhoneFieldError, TelixonPhoneMessage } from '../models';

/** The parse error a Signal Form receives for a fault. */
export function toPhoneFieldError(fault: ValidationError, message: TelixonPhoneMessage): TelixonPhoneFieldError {
  return { kind: PHONE_ERROR_KEY, message: message(fault), fault };
}
