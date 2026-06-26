import { NumberType, RegionCode } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';

export type PossibilityResult =
  | 'IS_POSSIBLE'
  | 'IS_POSSIBLE_LOCAL_ONLY'
  | 'INVALID_CALLING_CODE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_LENGTH';

/** Structured validation outcome beyond `valid: boolean`. Kind values mirror libphonenumber where applicable. */
export type ValidationError =
  | { readonly kind: 'EMPTY' }
  | { readonly kind: 'INVALID_CALLING_CODE' }
  | { readonly kind: 'TOO_SHORT'; readonly minLength: number }
  | { readonly kind: 'TOO_LONG'; readonly maxLength: number }
  | { readonly kind: 'INVALID_LENGTH'; readonly possibleLengths: readonly number[] }
  | { readonly kind: 'POSSIBLE_LOCAL_ONLY' }
  | { readonly kind: 'PATTERN_MISMATCH' }
  | { readonly kind: 'NATIONAL_PREFIX_MISSING'; readonly expectedPrefix: string };

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
  readonly strict: boolean;
}

export interface PhoneNumber {
  isValid(): boolean;
  isValidForRegion(region: RegionCode): boolean;
  isPossible(): boolean;
  isPossibleWithReason(): PossibilityResult;
  getValidationError(): ValidationError | null;
  getNumberType(): NumberType;
  getNationalNumber(): string;
  getCallingCode(): string | null;
  getRegion(): RegionCode | null;
  formatE164(): string | null;
  formatNational(): string | null;
  formatInternational(): string | null;
  formatRfc3966(): string | null;
}
