import type { TelixonPhoneInputOptions } from '../../phone-input';

/** Whether the trigger shows the calling code, which it does once the field keeps the code out of its text. */
export function showsCallingCode(options: TelixonPhoneInputOptions): boolean {
  return options.mode === 'international' && options.display?.callingCodeInInput === false;
}
