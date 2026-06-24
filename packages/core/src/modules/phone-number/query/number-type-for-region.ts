import {
  getMetadataRegionCallingCode,
  MetadataNumberType,
  NumberType,
  VERDICT_LENGTH_COUNT,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveExactMatchedTypeIdMask } from '../../number-resolver/utils/resolve-exact-matched-types';
import { ResolvedPhoneNumber } from '../models';

// One type from the matched set, in libphonenumber priority order (getNumberTypeHelper).
function selectNumberType(matched: readonly MetadataNumberType[]): Exclude<NumberType, 'UNKNOWN'> | null {
  if (matched.includes('PREMIUM_RATE')) return 'PREMIUM_RATE';
  if (matched.includes('TOLL_FREE')) return 'TOLL_FREE';
  if (matched.includes('SHARED_COST')) return 'SHARED_COST';
  if (matched.includes('VOIP')) return 'VOIP';
  if (matched.includes('PERSONAL_NUMBER')) return 'PERSONAL_NUMBER';
  if (matched.includes('PAGER')) return 'PAGER';
  if (matched.includes('UAN')) return 'UAN';
  if (matched.includes('VOICEMAIL')) return 'VOICEMAIL';

  const fixed: boolean = matched.includes('FIXED_LINE');
  const mobile: boolean = matched.includes('MOBILE');
  if (fixed && mobile) return 'FIXED_LINE_OR_MOBILE';
  if (fixed) return 'FIXED_LINE';
  if (mobile) return 'MOBILE';

  return null;
}

// libphonenumber getNumberTypeHelper over ONE region's metadata: the number's type under that
// region's patterns, or null (UNKNOWN). Returns null when the region's calling code does not match
// the number's, mirroring isValidNumberForRegion's region-code guard.
export function numberTypeForRegion(
  resolved: ResolvedPhoneNumber,
  regionIndex: number,
): Exclude<NumberType, 'UNKNOWN'> | null {
  const { endState, nationalDigits, callingCode, regionFilter, numberTypeFilter } = resolved;
  const resourceProvider = getResourceProvider();

  if (
    callingCode === '' ||
    Number(callingCode) !== getMetadataRegionCallingCode(resourceProvider.engine, regionIndex)
  ) {
    return null;
  }
  if (regionFilter && regionFilter[regionIndex] === 0) return null;

  const length: number = nationalDigits.length;
  if (length === 0 || length >= VERDICT_LENGTH_COUNT) return null;

  const matchedTypeIdMask: number = resolveExactMatchedTypeIdMask(endState, length, regionIndex, numberTypeFilter);
  if (matchedTypeIdMask === 0) return null;

  const matched: MetadataNumberType[] = [];
  for (let typeId = 0; typeId < resourceProvider.numberTypeNames.length; typeId++) {
    if (matchedTypeIdMask & (1 << typeId)) matched.push(resourceProvider.numberTypeNames[typeId]!);
  }

  return selectNumberType(matched);
}
