import { NumberType, RegionCode } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';

/**
 * The possibility check as a reason code: a resolvable calling code and a length the region dials,
 * nationally (`IS_POSSIBLE`) or locally only (`IS_POSSIBLE_LOCAL_ONLY`). Mirrors libphonenumber's
 * ValidationResult.
 */
export type PossibilityResult =
  | 'IS_POSSIBLE'
  | 'IS_POSSIBLE_LOCAL_ONLY'
  | 'INVALID_CALLING_CODE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_LENGTH';

/**
 * Why a number is not valid, discriminated on `kind`. Five variants carry data. Returned by
 * {@link PhoneNumber.getValidationError}; kinds mirror libphonenumber where applicable.
 */
export type ValidationError =
  /** No digits to resolve. */
  | { readonly kind: 'EMPTY' }
  /** The digits begin with no known country calling code. */
  | { readonly kind: 'INVALID_CALLING_CODE' }
  /** Fewer digits than the region's shortest number. `minLength` is that shortest length. */
  | { readonly kind: 'TOO_SHORT'; readonly minLength: number }
  /** More digits than the region's longest number. `maxLength` is that longest length. */
  | { readonly kind: 'TOO_LONG'; readonly maxLength: number }
  /** The length falls in a gap between valid lengths. `possibleLengths` lists the lengths that exist. */
  | { readonly kind: 'INVALID_LENGTH'; readonly possibleLengths: readonly number[] }
  /** Valid only when dialed inside its own area. */
  | { readonly kind: 'POSSIBLE_LOCAL_ONLY' }
  /** The length is valid but the digits match no number that exists in the region. */
  | { readonly kind: 'PATTERN_MISMATCH' }
  /** A required national (trunk) prefix was not typed. `expectedPrefix` is the missing prefix. */
  | { readonly kind: 'NATIONAL_PREFIX_MISSING'; readonly expectedPrefix: string }
  /** International-significant input begins with national-dialing digits (trunk prefix or carrier code). `prefix` is the exact leading digits to drop. */
  | { readonly kind: 'NATIONAL_PREFIX_PRESENT'; readonly prefix: string };

export interface ResolvedPhoneNumber {
  readonly nationalDigits: string;
  readonly callingCode: string;
  readonly callingCodeState: number;
  readonly endState: number;
  readonly defaultRegionIndex: number;
  readonly regionFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
  readonly nationalPrefixPresent: boolean;
  readonly readAsNational: boolean;
  readonly callingCodeSeeded: boolean;
  readonly strict: boolean;
}

/**
 * A parsed number: query its validity, region, and type; format it four ways. Returned by
 * {@link parsePhoneNumber} and by a controller's `getPhoneNumber`.
 */
export interface PhoneNumber {
  /** Whether the number exists in its region's numbering plan. */
  isValid(): boolean;
  /** Whether the number is valid for `region` specifically. Mirrors libphonenumber's isValidNumberForRegion. */
  isValidForRegion(region: RegionCode): boolean;
  /**
   * Whether the calling code resolves and the length is one the region dials. The digits
   * themselves go unchecked, so a possible number can still be invalid.
   */
  isPossible(): boolean;
  /** The possibility check as a reason code, so a failed {@link PhoneNumber.isPossible} says why. */
  isPossibleWithReason(): PossibilityResult;
  /** The fault to correct, or `null` when none applies. One of nine typed variants. */
  getValidationError(): ValidationError | null;
  /** The line type, such as `MOBILE` or `FIXED_LINE`. `UNKNOWN` means the number is not valid. */
  getNumberType(): NumberType;
  /** The national significant number: digits only, with the national prefix stripped. */
  getNationalNumber(): string;
  /** The country calling code read from the digits, without the `+`, or `null` when there are none. */
  getCallingCode(): string | null;
  /** The region the number resolves to, or `null` when none does. */
  getRegion(): RegionCode | null;
  /** E.164, or `null` when the number is not possible. */
  formatE164(): string | null;
  /** National format, or `null` when the number is not possible. */
  formatNational(): string | null;
  /** International format, or `null` when the number is not possible. */
  formatInternational(): string | null;
  /** RFC 3966 `tel:` URI, or `null` when the number is not possible. */
  formatRfc3966(): string | null;
}
