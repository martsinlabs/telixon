import { formatNumber, getRegionIndex } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { buildFormattingContext } from '../../number-resolver/utils/build-formatting-context';
import { pickMaskForLength } from '../../number-resolver/utils/pick-mask-for-length';
import { selectInternationalFormatIndex } from '../../number-resolver/utils/select-international-format';
import { ResolvedPhoneNumber } from '../models';
import { isPossible } from './is-possible';

// INTERNATIONAL format, or null until possible. Groups via the engine per-length mask, like the controller.
export function formatInternational(resolved: ResolvedPhoneNumber): string | null {
  const { profileRef, nationalDigits, callingCode } = resolved;
  if (!profileRef || !isPossible(resolved)) return null;

  const { refMapping, countryScopeLayer, formatsTable } = getResourceProvider();
  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(
    getRegionIndex(countryScopeLayer, profileRef.stateCountryIndex),
  );
  const index: number = selectInternationalFormatIndex(callingCodeIndex, nationalDigits, false);
  const mask: string | undefined =
    index >= 0
      ? pickMaskForLength(formatsTable[callingCodeIndex]![index]!.masks.international, nationalDigits.length)
      : undefined;

  if (mask === undefined) return `+${callingCode} ${nationalDigits}`;

  const formatted: string = formatNumber(buildFormattingContext(mask, nationalDigits, refMapping)).formatted;
  return `+${callingCode} ${formatted}`;
}
