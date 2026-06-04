import { NumberType, RegionId } from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { NumberTypeProfileRef } from '../../number-resolver/models';

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
  readonly profileRef: NumberTypeProfileRef | null;
  readonly defaultCountryIndex: number;
  readonly countryFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
  readonly terminalStates: readonly number[];
  readonly nationalPrefixPresent: boolean;
}

export interface PhoneNumber {
  isValid(): boolean;
  isPossible(): boolean;
  isPossibleWithReason(): PhoneNumberValidationResult;
  getValidationError(): ValidationError | null;
  getNumberType(): Exclude<NumberType, 'UNKNOWN'> | null;
  getNationalNumber(): string;
  getCallingCode(): string | null;
  getCountry(): RegionId | null;
  getE164(): string | null;
  formatNational(): string | null;
  formatInternational(): string | null;
  getURI(): string | null;
}
