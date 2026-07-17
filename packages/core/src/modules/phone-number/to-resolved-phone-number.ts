import { ResolvedNumberState } from '../number-resolver/resolve-number';
import { ResolvedPhoneNumber } from './models';

// Builds the query view from one resolved state, so every method reads a consistent point-in-time capture.
export function toResolvedPhoneNumber(resolved: ResolvedNumberState, defaultRegionIndex: number): ResolvedPhoneNumber {
  const { snapshot } = resolved;
  return {
    nationalDigits: snapshot.nationalDigits,
    callingCode: snapshot.callingCodeDigits,
    callingCodeState: snapshot.callingCodeState,
    endState: snapshot.endState,
    defaultRegionIndex,
    regionFilter: snapshot.regionFilter,
    numberTypeFilter: snapshot.numberTypeFilter,
    nationalPrefixPresent: resolved.nationalPrefixPresent,
    readAsNational: resolved.readAsNational,
    callingCodeSeeded: resolved.callingCodeSeeded,
    strict: snapshot.strict,
  };
}
