import { parsePhoneNumber, type PhoneNumber, type RegionCode } from '@telixon/core';
import type { TelixonPhoneInputOptions } from '../models';

/** What the widget takes for a number. `region` is `null` where the text carries the calling code itself. */
export type WidgetWrite = {
  readonly region: RegionCode | null;
  readonly text: string;
};

function holdsCallingCode(options: TelixonPhoneInputOptions): boolean {
  return options.mode === 'international' && options.display?.callingCodeInInput !== false;
}

/**
 * How a number in international form reaches the widget. A field that keeps the calling code out of
 * its text takes the region and the national part apart, a national field in its national format.
 */
export function toWidgetWrite(text: string, options: TelixonPhoneInputOptions): WidgetWrite {
  if (holdsCallingCode(options) || !text.startsWith('+')) return { region: null, text };

  const phoneNumber: PhoneNumber = parsePhoneNumber(text);
  const region: RegionCode | null = phoneNumber.getRegion();
  if (region === null) return { region: null, text };

  const nationalNumber: string = phoneNumber.getNationalNumber();
  return {
    region,
    text: options.mode === 'national' ? (phoneNumber.formatNational() ?? nationalNumber) : nationalNumber,
  };
}
