import { NumberResolverSnapshot } from '../number-resolver/models';
import { ResolvedPhoneNumber } from './models';

// Builds the query view from one snapshot, so every method reads a consistent point-in-time capture.
export function toResolvedPhoneNumber(
  snapshot: NumberResolverSnapshot,
  defaultCountryIndex: number,
  nationalPrefixPresent: boolean,
): ResolvedPhoneNumber {
  return {
    nationalDigits: snapshot.nationalDigits,
    callingCode: snapshot.callingCodeDigits,
    callingCodeState: snapshot.callingCodeState,
    endState: snapshot.endState,
    defaultCountryIndex,
    countryFilter: snapshot.countryFilter,
    numberTypeFilter: snapshot.numberTypeFilter,
    nationalPrefixPresent,
  };
}
