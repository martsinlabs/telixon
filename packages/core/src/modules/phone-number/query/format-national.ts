import { formatNumber, getRegionIndex, PhoneNumberFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { buildFormattingContext } from '../../number-resolver/utils/build-formatting-context';
import { pickMaskForLength } from '../../number-resolver/utils/pick-mask-for-length';
import { selectNationalFormatIndex } from '../../number-resolver/utils/select-national-format';
import { ResolvedPhoneNumber } from '../models';
import { isPossible } from './is-possible';

// NATIONAL format (grouped national number), or null until the number is possible. Applies the national
// prefix only when the matched format defines a prefix rule (libphonenumber format(NATIONAL)).
export function formatNational(resolved: ResolvedPhoneNumber): string | null {
  const { profileRef, nationalDigits } = resolved;
  if (!profileRef || !isPossible(resolved)) return null;

  const { refMapping, countryScopeLayer, formatsTable, territorySpecTable } = getResourceProvider();
  const countryIndex: number = getRegionIndex(countryScopeLayer, profileRef.stateCountryIndex);
  const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(countryIndex);

  const index: number = selectNationalFormatIndex(callingCodeIndex, nationalDigits);
  if (index < 0) return nationalDigits;

  const format: PhoneNumberFormat = formatsTable[callingCodeIndex]![index]!;
  const withPrefixMasks: Record<number, string> | undefined =
    format.nationalPrefixFormattingRule !== undefined ? format.masks.nationalWithPrefix : undefined;
  const mask: string | undefined = pickMaskForLength(withPrefixMasks ?? format.masks.national, nationalDigits.length);
  if (mask === undefined) return nationalDigits;

  const nationalPrefix: string | undefined = withPrefixMasks
    ? territorySpecTable[countryIndex]?.nationalPrefix
    : undefined;

  return formatNumber(buildFormattingContext(mask, nationalDigits, refMapping, nationalPrefix)).formatted;
}
