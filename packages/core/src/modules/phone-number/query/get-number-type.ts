import {
  getVerdict,
  MetadataNumberType,
  NumberType,
  RegionId,
  toNumberTypes,
  VERDICT_LENGTH_COUNT,
  VERDICT_TYPE_FIXED_LINE_OR_MOBILE,
  VERDICT_TYPE_UNKNOWN,
  verdictIsDecided,
  verdictType,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveExactMatchedTypeIdMask } from '../../number-resolver/utils/resolve-exact-matched-types';
import { resolveRegionCode } from '../../number-resolver/utils/resolve-region-code';
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

// Explicit resolution behind the baked verdicts: undecided inputs and filtered queries.
function getNumberTypeResolved(resolved: ResolvedPhoneNumber): Exclude<NumberType, 'UNKNOWN'> | null {
  const { callingCodeState, nationalDigits, endState, countryFilter, numberTypeFilter } = resolved;

  const region: RegionId | null = resolveRegionCode(callingCodeState, endState, nationalDigits);
  if (!region) return null;

  const resourceProvider = getResourceProvider();
  const countryIndex: number | undefined = resourceProvider.regionKeyToIndex[region];
  if (countryIndex === undefined) return null;
  if (countryFilter && countryFilter[countryIndex] === 0) return null;

  const matchedTypeIdMask: number = resolveExactMatchedTypeIdMask(
    endState,
    nationalDigits.length,
    countryIndex,
    numberTypeFilter,
  );
  if (matchedTypeIdMask === 0) return null;

  const matched: MetadataNumberType[] = [];
  for (let typeId = 0; typeId < resourceProvider.numberTypeNames.length; typeId++) {
    if (matchedTypeIdMask & (1 << typeId)) matched.push(resourceProvider.numberTypeNames[typeId]!);
  }

  return selectNumberType(matched);
}

// libphonenumber getNumberType: one baked verdict lookup on the unfiltered path.
export function getNumberType(resolved: ResolvedPhoneNumber): Exclude<NumberType, 'UNKNOWN'> | null {
  const { nationalDigits, endState, countryFilter, numberTypeFilter } = resolved;
  const length: number = nationalDigits.length;

  if (length >= VERDICT_LENGTH_COUNT) return null;

  if (!countryFilter && !numberTypeFilter) {
    const resourceProvider = getResourceProvider();
    const verdict: number = getVerdict(resourceProvider.engine, endState, length);
    if (verdictIsDecided(verdict)) {
      const publicType: number = verdictType(verdict);
      if (publicType === VERDICT_TYPE_UNKNOWN) return null;
      if (publicType === VERDICT_TYPE_FIXED_LINE_OR_MOBILE) return 'FIXED_LINE_OR_MOBILE';

      const metadataType: MetadataNumberType = resourceProvider.numberTypeNames[publicType]!;
      const numberType: NumberType | undefined = toNumberTypes([metadataType])[0];
      return numberType !== undefined && numberType !== 'UNKNOWN' ? numberType : null;
    }
  }

  return getNumberTypeResolved(resolved);
}
