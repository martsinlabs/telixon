import {
  getVerdict,
  MetadataNumberType,
  NumberType,
  RegionCode,
  toNumberTypes,
  VERDICT_LENGTH_COUNT,
  VERDICT_TYPE_FIXED_LINE_OR_MOBILE,
  VERDICT_TYPE_UNKNOWN,
  verdictIsDecided,
  verdictType,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { resolveRegionCode } from '../../number-resolver/utils/resolve-region-code';
import { ResolvedPhoneNumber } from '../models';
import { numberTypeForRegion } from './number-type-for-region';

// Explicit resolution behind the baked verdicts: undecided inputs and filtered queries.
function getNumberTypeResolved(resolved: ResolvedPhoneNumber): Exclude<NumberType, 'UNKNOWN'> | null {
  const { callingCodeState, nationalDigits, endState } = resolved;

  const region: RegionCode | null = resolveRegionCode(callingCodeState, endState, nationalDigits);
  if (!region) return null;

  const regionIndex: number | undefined = getResourceProvider().regionKeyToIndex[region];
  if (regionIndex === undefined) return null;

  return numberTypeForRegion(resolved, regionIndex);
}

// libphonenumber getNumberType: one baked verdict lookup on the unfiltered path.
export function getNumberType(resolved: ResolvedPhoneNumber): Exclude<NumberType, 'UNKNOWN'> | null {
  const { nationalDigits, endState, regionFilter, numberTypeFilter, strict, defaultRegionIndex } = resolved;
  const length: number = nationalDigits.length;

  if (length >= VERDICT_LENGTH_COUNT) return null;

  // Strict mode validates against the configured region only (libphonenumber isValidNumberForRegion).
  if (strict && defaultRegionIndex !== -1) {
    return numberTypeForRegion(resolved, defaultRegionIndex);
  }

  if (!regionFilter && !numberTypeFilter) {
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
