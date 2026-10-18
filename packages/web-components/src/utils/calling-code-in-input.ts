import type { TelixonPhoneFieldOptions } from '../phone-field/models';

/** Whether the field keeps the calling code in its own text, which an international field does unless `display.callingCodeInInput` is `false`. */
export function keepsCallingCodeInInput(options: TelixonPhoneFieldOptions): boolean {
  return options.mode === 'international' && options.display?.callingCodeInInput !== false;
}
