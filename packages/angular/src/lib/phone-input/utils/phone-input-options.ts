import { DEFAULT_PHONE_INPUT_OPTIONS } from '../constants/default-options';
import type { TelixonPhoneInputOptions } from '../models';

/** The options a `telixonPhoneInput` binding stands for. A bare attribute arrives as an empty string. */
export function toPhoneInputOptions(value: TelixonPhoneInputOptions | ''): TelixonPhoneInputOptions {
  return value === '' ? DEFAULT_PHONE_INPUT_OPTIONS : value;
}
