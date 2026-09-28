import { parsePhoneNumber, type PhoneNumber, type RegionCode } from '@telixon/core';

/**
 * The text to hand the controller for a value written into the element from outside the widget,
 * such as a browser autofill. A browser fills the number of the user's profile in its own national
 * spelling, trunk prefix and all, which the field would otherwise read digit by digit. Where the
 * text is a whole valid number for the field's region, the controller takes it in international
 * form; anything else stays exactly as written.
 */
export function readExternalValue(value: string, region: RegionCode | null): string {
  if (region === null || value === '') return value;

  const parsed: PhoneNumber = parsePhoneNumber(value, { defaultRegion: region });
  if (!parsed.isValid()) return value;

  return parsed.formatE164() ?? value;
}
