import { BinaryFilter } from '@telixon/core/models';
import { NumberTypeProfileRef } from '../../number-resolver/models';

export type PhoneNumberValidationResult =
  | 'IS_POSSIBLE'
  | 'INVALID_COUNTRY_CODE'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | 'INVALID_LENGTH';

export interface ResolvedPhoneNumber {
  readonly nationalDigits: string;
  readonly callingCodeState: number;
  readonly profileRef: NumberTypeProfileRef | null;
  readonly defaultCountryIndex: number;
  readonly countryFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
}

export interface PhoneNumber {
  isValid(): boolean;
  isPossible(): boolean;
  isPossibleWithReason(): PhoneNumberValidationResult;
}
