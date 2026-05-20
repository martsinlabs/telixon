import { getCallingCodePrimaryCountry, getCountryIndex } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../models';

export function resolveCountryIndex(
  snapshot: NumberResolverSnapshot,
  profileRef: NumberTypeProfileRef | null,
  defaultCountryIndex: number,
): number {
  const resourceProvider = getResourceProvider();

  if (profileRef) {
    return getCountryIndex(resourceProvider.countryScopeLayer, profileRef.stateCountryIndex);
  }

  if (snapshot.callingCodeState !== -1) {
    return getCallingCodePrimaryCountry(resourceProvider.callingCodeLayer, snapshot.callingCodeState);
  }

  return defaultCountryIndex;
}
