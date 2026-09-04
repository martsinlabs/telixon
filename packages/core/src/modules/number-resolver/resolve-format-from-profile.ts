import { getTypeProfileFormatMask, selectPartialFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { ResourceProvider } from '@telixon/core/resource-provider/models';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { NumberFormatRef, NumberTypeProfileRef } from './models';

// @internal Profile's format for `nationalDigits`: first length-feasible format whose leadingDigits match, else the first.
export function resolveFormatFromProfile(
  profileRef: NumberTypeProfileRef,
  nationalDigits: string,
): NumberFormatRef | null {
  const resourceProvider: ResourceProvider = getResourceProvider();

  const callingCodeIndex: number = getCallingCodeIndexByRegionIndex(profileRef.regionIndex);
  const formatMask: number = getTypeProfileFormatMask(resourceProvider.engine, profileRef.numberTypeProfileId);

  // Position within the calling code's format list (getFormatIndex maps it to the global index).
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
