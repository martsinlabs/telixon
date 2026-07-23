import type { NumberType, RegionCode } from '../../../engine';
import { getCallingCodeForRegion } from '../../calling-code-for-region';
import type { PhoneNumber } from '../../phone-number';
import type { InputState } from '../models';

// Shared by the two controller fuzz tests. They check the same invariants and use the same regions
// and payloads.

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

/** The same session index always produces the same run, which is how a failure gets replayed. */
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

/** Finds a region on some other calling code. A number on `callingCode` can never be valid there. */
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

/** The minimal controller surface the region-filter oracle needs. */
export interface FilterableController {
  getPhoneNumber(): PhoneNumber;
  setRegionFilter(regions: readonly RegionCode[] | null): unknown;
}

/**
 * If the filter still allows the region the number resolved to, nothing about the number should
 * change. If it allows only a region on another calling code, the number should stop being valid.
 * Clears the filter before returning.
 */
export function regionFilterViolation(controller: FilterableController): string | null {
  // Clearing first makes the baseline the unfiltered answer.
  controller.setRegionFilter(null);
  const before: PhoneNumber = controller.getPhoneNumber();
  const resolvedRegion: RegionCode | null = before.getRegion();
  const baseline: Record<string, string> = methodResults(before);
  let violation: string | null = null;

  if (resolvedRegion !== null) {
    controller.setRegionFilter([resolvedRegion]);
    const admittedDifference: string | null = firstMethodDifference(
      methodResults(controller.getPhoneNumber()),
      baseline,
    );

    const foreignRegion: RegionCode = regionWithForeignCallingCode(before.getCallingCode());
    controller.setRegionFilter([foreignRegion]);
    const survivesExclusion: boolean = controller.getPhoneNumber().isValid();

    if (admittedDifference !== null) {
      violation = `filter [${resolvedRegion}] changed the resolution: ${admittedDifference}`;
    } else if (survivesExclusion) {
      violation = `filter [${foreignRegion}] left a ${resolvedRegion} number valid`;
    }
  }

  controller.setRegionFilter(null);
  return violation;
}
