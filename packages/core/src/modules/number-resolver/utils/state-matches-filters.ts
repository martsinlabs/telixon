import {
  forEachNumberTypeIndex,
  forEachRegionInCallingCodeState,
  forEachScopeRegion,
  getScopeNumberTypeMask,
  isInCallingCode,
} from '@telixon/core/engine';
import { BinaryFilter } from '@telixon/core/models';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { isNumberTypeAllowed } from './is-number-type-allowed';

export function stateMatchesFilters(
  state: number,
  regionFilter: BinaryFilter | null = null,
  numberTypeFilter: BinaryFilter | null = null,
): boolean {
  if (!regionFilter && !numberTypeFilter) return true;

  const resourceProvider: ResourceProvider = getResourceProvider();

  let foundMatch: boolean = false;

  if (isInCallingCode(resourceProvider.engine, state)) {
    forEachRegionInCallingCodeState(resourceProvider.engine, state, (regionIndex: number) => {
      if (!regionFilter || regionFilter[regionIndex]) {
        foundMatch = true;
        return true;
      }
    });

    return foundMatch;
  }

  forEachScopeRegion(resourceProvider.engine, state, (scopeEntryIndex: number, regionIndex: number) => {
    if (regionFilter && regionFilter[regionIndex] === 0) return;

    const mask: number = getScopeNumberTypeMask(resourceProvider.engine, scopeEntryIndex);

    forEachNumberTypeIndex(mask, (numberTypeIndex: number) => {
      if (!numberTypeFilter || isNumberTypeAllowed(numberTypeFilter, regionIndex, numberTypeIndex)) {
        foundMatch = true;
        return true;
      }
    });

    if (foundMatch) return true;
  });

  return foundMatch;
}
