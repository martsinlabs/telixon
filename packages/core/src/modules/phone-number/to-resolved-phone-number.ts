import { BinaryFilter } from '@telixon/core/models';
import { NumberTypeProfileRef } from '../number-resolver/models';
import { ResolvedPhoneNumber } from './models';

interface ResolverFields {
  readonly callingCodeState: number;
  readonly countryFilter: BinaryFilter | null;
  readonly numberTypeFilter: BinaryFilter | null;
}

export function toResolvedPhoneNumber(
  resolver: ResolverFields,
  profileRef: NumberTypeProfileRef | null,
  nationalDigits: string,
  defaultCountryIndex: number,
): ResolvedPhoneNumber {
  return {
    nationalDigits,
    callingCodeState: resolver.callingCodeState,
    profileRef,
    defaultCountryIndex,
    countryFilter: resolver.countryFilter,
    numberTypeFilter: resolver.numberTypeFilter,
  };
}
