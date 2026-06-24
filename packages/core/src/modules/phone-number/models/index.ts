import { NumberType, RegionCode } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';

export type PhoneNumberValidationResult =
  | 'IS_POSSIBLE'
  | 'IS_POSSIBLE_LOCAL_ONLY'
  | 'INVALID_COUNTRY_CODE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_LENGTH';

/** Structured validation outcome beyond `valid: boolean`. Kind values mirror libphonenumber where applicable. */
export type ValidationError =
  | { kind: 'EMPTY' }
  | { kind: 'INVALID_COUNTRY_CODE' }
  | { kind: 'TOO_SHORT'; minLength: number }
  | { kind: 'TOO_LONG'; maxLength: number }
  | { kind: 'INVALID_LENGTH'; possibleLengths: readonly number[] }
  | { kind: 'PATTERN_MISMATCH' }
  | { kind: 'NATIONAL_PREFIX_MISSING'; expectedPrefix: string };

export interface ResolvedPhoneNumber {
  readonly nationalDigits: string;
  readonly callingCode: string;
  readonly callingCodeState: number;
  readonly endState: number;
  readonly defaultRegionIndex: number;
  readonly regionFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
  readonly nationalPrefixPresent: boolean;
  readonly strict: boolean;
}

export interface PhoneNumber {
  isValid(): boolean;
  isValidForRegion(region: RegionCode): boolean;
  isPossible(): boolean;
  isPossibleWithReason(): PhoneNumberValidationResult;
  getValidationError(): ValidationError | null;
  getNumberType(): Exclude<NumberType, 'UNKNOWN'> | null;
  getNationalNumber(): string;
  getCallingCode(): string | null;
  getRegion(): RegionCode | null;
  formatE164(): string | null;
  formatNational(): string | null;
  formatInternational(): string | null;
  formatRfc3966(): string | null;
}
