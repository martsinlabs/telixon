import { getProfileFormatMask, selectPartialFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberFormatRef, NumberTypeProfileRef } from './models';

// @internal Profile's format for `nationalDigits`: first length-feasible format whose leadingDigits match, else the first.
export function resolveFormatFromProfile(
  profileRef: NumberTypeProfileRef,
  nationalDigits: string,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(profileRef.regionIndex);
  const formatMask: number = getProfileFormatMask(resourceProvider.engine, profileRef.numberTypeProfileId);

  // Position within the calling code's format list (getMetadataFormatIndex maps it to the global index).
  const formatIndex: number = selectPartialFormat(
    resourceProvider.engine,
    callingCodeIndex,
    nationalDigits,
    formatMask,
  ).national;
  if (formatIndex === -1) return null;

  return {
    regionIndex: profileRef.regionIndex,
    numberTypeIndex: profileRef.numberTypeIndex,
    numberTypeProfileId: profileRef.numberTypeProfileId,
    formatIndex,
  };
}
