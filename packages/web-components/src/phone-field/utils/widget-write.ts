import { parsePhoneNumber, type PhoneNumber, type RegionCode } from '@telixon/core';
import { keepsCallingCodeInInput } from '../../utils/calling-code-in-input';
import type { TelixonPhoneFieldOptions } from '../models';

/** What the widget takes for a number. `region` is `null` where the text carries the calling code itself. */
export type WidgetWrite = {
  readonly region: RegionCode | null;
  readonly text: string;
};

/**
 * How a number in international form reaches the widget. A field that keeps the calling code out of
 * its text takes the region apart from the national part, which a national field shows in its
 * national format.
 */
export function toWidgetWrite(text: string, options: TelixonPhoneFieldOptions): WidgetWrite {
  if (keepsCallingCodeInInput(options) || !text.startsWith('+')) return { region: null, text };

  const phoneNumber: PhoneNumber = parsePhoneNumber(text);
  const region: RegionCode | null = phoneNumber.getRegion();
  if (region === null) return { region: null, text };

  const nationalNumber: string = phoneNumber.getNationalNumber();
  // A national widget reads the number as dialed at home, with the trunk prefix, while the other shows the bare national number.
  return {
    region,
    text: options.mode === 'national' ? (phoneNumber.formatNational() ?? nationalNumber) : nationalNumber,
  };
}
