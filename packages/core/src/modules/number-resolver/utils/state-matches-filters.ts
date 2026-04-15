import {
  forEachCountryInCallingCodeState,
  forEachNumberTypeIndex,
  forEachStateCountry,
  getNumberTypeMask,
  isCallingCodeState,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';

export function stateMatchesFilters(
  state: number,
  countryFilter: BinaryFilter | null = null,
  numberTypeFilter: BinaryFilter | null = null,
): boolean {
  if (!countryFilter && !numberTypeFilter) return true;

  const resourceProvider: ResourceProvider = getResourceProvider();

  let foundMatch: boolean = false;

  if (isCallingCodeState(resourceProvider.callingCodeLayer, state)) {
    forEachCountryInCallingCodeState(resourceProvider.callingCodeLayer, state, (countryIndex: number) => {
      if (!countryFilter || countryFilter[countryIndex]) {
        foundMatch = true;
        return true;
      }
    });

    return foundMatch;
  }

  forEachStateCountry(resourceProvider.countryScopeLayer, state, (stateCountryIndex: number, countryIndex: number) => {
    if (countryFilter && countryFilter[countryIndex] === 0) return;

    const mask: number = getNumberTypeMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);

    forEachNumberTypeIndex(mask, (numberTypeIndex: number) => {
      if (!numberTypeFilter || numberTypeFilter[numberTypeIndex]) {
        foundMatch = true;
        return true; // stop inner
      }
    });

    if (foundMatch) return true;
  });

  return foundMatch;
}
