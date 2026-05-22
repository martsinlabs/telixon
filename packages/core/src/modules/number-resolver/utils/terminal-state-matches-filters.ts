import {
  forEachNumberTypeIndex,
  forEachStateRegionWithTerminalPrefix,
  getTerminalPrefixNumberTypeMask,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { isNumberTypeAllowed } from './is-number-type-allowed';

export function terminalStateMatchesFilters(
  terminalState: number,
  countryFilter: BinaryFilter | null = null,
  numberTypeFilter: BinaryFilter | null = null,
): boolean {
  if (!countryFilter && !numberTypeFilter) return true;

  const resourceProvider: ResourceProvider = getResourceProvider();

  let foundMatch: boolean = false;

  forEachStateRegionWithTerminalPrefix(
    resourceProvider.countryScopeLayer,
    terminalState,
    (stateCountryIndex: number, countryIndex: number) => {
      if (countryFilter && countryFilter[countryIndex] === 0) return;

      const mask: number = getTerminalPrefixNumberTypeMask(resourceProvider.numberTypeScopeLayer, stateCountryIndex);

      forEachNumberTypeIndex(mask, (numberTypeIndex: number) => {
        if (!numberTypeFilter || isNumberTypeAllowed(numberTypeFilter, countryIndex, numberTypeIndex)) {
          foundMatch = true;
          return true;
        }
      });

      if (foundMatch) return true;
    },
  );

  return foundMatch;
}
