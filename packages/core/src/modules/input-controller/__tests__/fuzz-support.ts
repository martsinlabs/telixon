import type { NumberType, RegionCode } from '../../../engine';
import { getCallingCodeForRegion } from '../../calling-code-for-region';
import type { PhoneNumber } from '../../phone-number';
import { getPlaceholders } from '../../placeholders';
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

// A filter that admits the number should not change what the number is or whether it is valid. The
// possibility answer is left out on purpose. Regions on a shared calling code carry different
// lengths, and the unfiltered check reads the main region while a filter reads the resolved one, so
// a number possible under one is not always possible under the other. The valid-implies-possible
// check below guards the possibility side instead.
const POSSIBILITY_METHODS: ReadonlySet<string> = new Set(['isPossible', 'isPossibleWithReason']);

function admittingFilterDifference(actual: Record<string, string>, expected: Record<string, string>): string | null {
  for (const method of COMPARED_METHODS) {
    if (POSSIBILITY_METHODS.has(method)) continue;
    if (actual[method] !== expected[method]) return `${method} is ${actual[method]}, expected ${expected[method]}`;
  }
  return null;
}

/** A valid number is always possible. This must hold in every state, with or without a filter. */
export function consistencyViolation(phoneNumber: PhoneNumber): string | null {
  if (phoneNumber.isValid() && !phoneNumber.isPossible()) {
    return `valid but not possible (${phoneNumber.getNationalNumber()})`;
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
  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): unknown;
}

/**
 * A region filter that allows only a region on another calling code must make the number invalid.
 * The filter is not asserted to leave an admitted number untouched. Regions on a shared calling
 * code carry different lengths and prefixes, and the unfiltered answer reads the main region, so
 * narrowing to the resolved region legitimately shifts the length, the format, and the digits.
 * Clears the filter before returning.
 */
export function regionFilterViolation(controller: FilterableController): string | null {
  // Clear both filters so the number is judged on its own, not on top of a leftover filter.
  controller.setRegionFilter(null);
  controller.setNumberTypeFilter(null);
  const before: PhoneNumber = controller.getPhoneNumber();
  const resolvedRegion: RegionCode | null = before.getRegion();
  const callingCode: string | null = before.getCallingCode();
  let violation: string | null = null;

  // A number that never cleared the calling-code stage names a region without resolving there.
  const clearedCallingCode: boolean = String(before.isPossibleWithReason()) !== 'INVALID_CALLING_CODE';

  if (resolvedRegion !== null && callingCode !== null && clearedCallingCode) {
    const foreignRegion: RegionCode = regionWithForeignCallingCode(callingCode);
    controller.setRegionFilter([foreignRegion]);
    if (controller.getPhoneNumber().isValid()) {
      violation = `filter [${foreignRegion}] left a ${resolvedRegion} number valid`;
    }
  }

  controller.setRegionFilter(null);
  controller.setNumberTypeFilter(null);
  return violation;
}

/**
 * If the filter still allows the type the number reported, nothing about the number should change.
 * A number reporting UNKNOWN is left alone, since no filter can name that type usefully. The reason
 * may change. Narrowing to one type answers against that type's own lengths, so a length the region
 * calls local-only can become fully possible.
 * Clears the filter before returning.
 */
export function numberTypeFilterViolation(controller: FilterableController): string | null {
  // Clear both filters so the type filter is measured on its own, not on top of a region filter.
  controller.setRegionFilter(null);
  controller.setNumberTypeFilter(null);
  const before: PhoneNumber = controller.getPhoneNumber();
  const reportedType: NumberType = before.getNumberType();
  const baseline: Record<string, string> = methodResults(before);
  let violation: string | null = null;

  if (reportedType !== 'UNKNOWN') {
    controller.setNumberTypeFilter([reportedType]);
    const difference: string | null = admittingFilterDifference(methodResults(controller.getPhoneNumber()), baseline);
    if (difference !== null) {
      violation = `filter [${reportedType}] changed the resolution: ${difference}`;
    }
  }

  controller.setRegionFilter(null);
  controller.setNumberTypeFilter(null);
  return violation;
}

/**
 * Widening a filter can never take validity away. A number allowed by one set is still allowed by a
 * set containing it, and a number both sets reject stays rejected by the two together.
 * Clears the filter before returning.
 */
export function filterMonotonicityViolation<Value>(
  controller: FilterableController,
  kind: string,
  apply: (values: readonly Value[] | null) => unknown,
  first: readonly Value[],
  second: readonly Value[],
): string | null {
  apply(first);
  const underFirst: boolean = controller.getPhoneNumber().isValid();
  apply(second);
  const underSecond: boolean = controller.getPhoneNumber().isValid();
  apply(first.concat(second));
  const underUnion: boolean = controller.getPhoneNumber().isValid();
  apply(null);

  if (underUnion !== (underFirst || underSecond)) {
    return `${kind} filter is valid=${underUnion} under [${first.join(',')}]+[${second.join(',')}], but valid=${underFirst} under the first and valid=${underSecond} under the second`;
  }
  return null;
}

/**
 * A real number for the region and type, as bare digits. Random digits almost never land on a valid
 * number, which leaves the type and filter checks with nothing to work on.
 */
export function exampleDigits(region: RegionCode, type: NumberType): string {
  const placeholders = getPlaceholders(region, type);
  return digitsOf(placeholders?.national ?? placeholders?.nationalWithPrefix ?? '');
}
