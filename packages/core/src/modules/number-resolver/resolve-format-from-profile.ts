import { getFormatMask, getRegionIndex, selectPartialFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberFormatRef, NumberTypeProfileRef } from './models';

/**
 * @internal
 * Selects the profile's format for `nationalDigits` (national as-you-type): the first length-feasible
 * format in the profile mask whose leadingDigits match the digits typed so far, falling back to the
 * first length-feasible format. Resolved by the format-select DFA layer (no regex).
 */
export function resolveFormatFromProfile(
  profileRef: NumberTypeProfileRef,
  nationalDigits: string,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(
    getRegionIndex(resourceProvider.countryScopeLayer, profileRef.stateCountryIndex),
  );
  const formatMask: number = getFormatMask(resourceProvider.numberTypeProfileLayer, profileRef.numberTypeProfileId);

  const formatIndex: number = selectPartialFormat(
    resourceProvider.formatSelectLayer,
    callingCodeIndex,
    nationalDigits,
    formatMask,
  ).national;
  if (formatIndex === -1) return null;

  return { ...profileRef, formatIndex };
}
