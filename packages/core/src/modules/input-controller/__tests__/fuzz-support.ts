import type { NumberType, RegionCode } from '../../../engine';
import { getCallingCodeForRegion } from '../../calling-code-for-region';
import type { PhoneNumber } from '../../phone-number';
import type { InputState } from '../models';

// Shared pieces for the controller fuzz tests. Both controllers owe the same structural
// guarantees. Both are driven with the same regions and payloads.

// Regions chosen to cover the hard cases. AR writes extra digits into the display, BY and BR hide
// a typed digit, US and CA share one calling code. The rest are ordinary formats.
export const REGIONS: readonly RegionCode[] = [
  'US',
  'CA',
  'GB',
  'AR',
  'BY',
  'BR',
  'DE',
  'FR',
  'IT',
  'ES',
  'MX',
  'RU',
  'UA',
  'AU',
  'NL',
  'PL',
  'JP',
  'IN',
  'ZA',
  'SE',
];

export const NUMBER_TYPES: readonly NumberType[] = [
  'FIXED_LINE',
  'MOBILE',
  'FIXED_LINE_OR_MOBILE',
  'TOLL_FREE',
  'PREMIUM_RATE',
  'VOIP',
  'PAGER',
  'UAN',
];

// Bare digits, formatted text, a leading plus, and non-digit noise all reach a real field.
export const INSERT_PAYLOADS: readonly string[] = [
  '5',
  '12',
  '007',
  '15',
  '+549',
  '(201) 555',
  '+44 20',
  '  9-9 ',
  '00',
  'abc',
  '+',
  '() -',
  '99999999999999',
];

export const COMPARED_METHODS = [
  'isValid',
  'isPossible',
  'isPossibleWithReason',
  'getNumberType',
  'getNationalNumber',
  'getCallingCode',
  'getRegion',
  'formatE164',
  'formatNational',
  'formatInternational',
  'formatRfc3966',
] as const;

/** Deterministic generator so any failure replays from its session index alone. */
export function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function methodResults(phoneNumber: PhoneNumber): Record<string, string> {
  const results: Record<string, string> = {};
  const callable = phoneNumber as unknown as Record<string, () => unknown>;
  for (const method of COMPARED_METHODS) results[method] = String(callable[method]!());
  return results;
}

export function firstMethodDifference(actual: Record<string, string>, expected: Record<string, string>): string | null {
  for (const method of COMPARED_METHODS) {
    if (actual[method] !== expected[method]) return `${method} is ${actual[method]}, expected ${expected[method]}`;
  }
  return null;
}

export function caretViolation(state: InputState): string | null {
  const { value, selectionStart, selectionEnd } = state;
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd)) return 'caret is not an integer';
  if (selectionStart < 0 || selectionStart > selectionEnd) return `caret range ${selectionStart}..${selectionEnd}`;
  if (selectionEnd > value.length) return `caret ${selectionEnd} past ${JSON.stringify(value)}`;
  return null;
}

/** A region whose calling code differs, so a number of `callingCode` cannot be valid under it. */
export function regionWithForeignCallingCode(callingCode: string | null): RegionCode {
  for (const region of REGIONS) {
    if (getCallingCodeForRegion(region) !== callingCode) return region;
  }
  return REGIONS[0]!;
}

export function digitsOf(value: string): string {
  let digits = '';
  for (let index = 0; index < value.length; index++) {
    const code: number = value.charCodeAt(index);
    if (code >= 48 && code <= 57) digits += value[index];
  }
  return digits;
}
