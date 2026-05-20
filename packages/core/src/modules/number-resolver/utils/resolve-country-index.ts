import { getCallingCodePrimaryCountry, getCountryIndex } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberTypeProfileRef } from '../models';

export function resolveCountryIndex(
  callingCodeState: number,
  profileRef: NumberTypeProfileRef | null,
  defaultCountryIndex: number,
): number {
  const resourceProvider = getResourceProvider();

  if (profileRef) {
    return getCountryIndex(resourceProvider.countryScopeLayer, profileRef.stateCountryIndex);
  }

  if (callingCodeState !== -1) {
    return getCallingCodePrimaryCountry(resourceProvider.callingCodeLayer, callingCodeState);
  }

  return defaultCountryIndex;
}
