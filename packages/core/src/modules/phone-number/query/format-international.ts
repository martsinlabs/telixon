import { formatNumber, getCountryIndex } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { buildFormattingContext } from '../../number-resolver/utils/build-formatting-context';
import { pickMaskForLength } from '../../number-resolver/utils/pick-mask-for-length';
import { selectInternationalFormatIndex } from '../../number-resolver/utils/select-international-format';
import { ResolvedPhoneNumber } from '../models';
import { isValid } from './is-valid';

// INTERNATIONAL format ('+<callingCode> <grouped national number>'), or null until the number is valid.
// Groups the national number with the engine's per-length mask — the same source the controller uses.
export function formatInternational(resolved: ResolvedPhoneNumber): string | null {
  const { profileRef, nationalDigits, callingCode } = resolved;
  if (!profileRef || !isValid(resolved)) return null;

  const { refMapping, countryScopeLayer, formatsTable } = getResourceProvider();
  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(
    getCountryIndex(countryScopeLayer, profileRef.stateCountryIndex),
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
