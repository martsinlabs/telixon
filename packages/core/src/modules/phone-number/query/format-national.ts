import {
  formatNumber,
  getFormatPrefixRule,
  getMetadataFormatIndex,
  getRegionNationalPrefix,
  MASK_VARIANT,
  RegionId,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { buildFormattingContext } from '../../number-resolver/utils/build-formatting-context';
import { hasMaskVariant, pickFormatMask } from '../../number-resolver/utils/format-masks';
import { resolvePrimaryCountryIndex } from '../../number-resolver/utils/resolve-primary-country-index';
import { selectNationalFormatIndex } from '../../number-resolver/utils/select-national-format';
import { ResolvedPhoneNumber } from '../models';
import { getCountry } from './get-country';
import { isPossible } from './is-possible';

// NATIONAL format, or null until possible; national prefix only when the format has a prefix rule, from the resolved region (else the calling code's main region, like libphonenumber).
export function formatNational(resolved: ResolvedPhoneNumber): string | null {
  const { nationalDigits, callingCode, callingCodeState, defaultCountryIndex } = resolved;
  if (!isPossible(resolved)) return null;

  const resourceProvider = getResourceProvider();
  const callingCodeIndex: number | undefined = resourceProvider.callingCodeIndexByCode[Number(callingCode)];
  if (callingCodeIndex === undefined) return null;

  const formatPosition: number = selectNationalFormatIndex(callingCodeIndex, nationalDigits, false);
  if (formatPosition < 0) return nationalDigits;

  const formatIndex: number = getMetadataFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition);
  const usePrefixMasks: boolean =
    getFormatPrefixRule(resourceProvider.engine, formatIndex) !== undefined &&
    hasMaskVariant(formatIndex, MASK_VARIANT.NationalWithPrefix);
  const variant: number = usePrefixMasks ? MASK_VARIANT.NationalWithPrefix : MASK_VARIANT.National;
  const mask: string | undefined = pickFormatMask(formatIndex, variant, nationalDigits.length);
  if (mask === undefined) return nationalDigits;

  let nationalPrefix: string | undefined;
  if (usePrefixMasks) {
    const region: RegionId | null = getCountry(resolved);
    const countryIndex: number =
      region !== null
        ? (resourceProvider.regionKeyToIndex[region] ?? -1)
        : resolvePrimaryCountryIndex(callingCodeState, defaultCountryIndex);
    nationalPrefix = countryIndex >= 0 ? getRegionNationalPrefix(resourceProvider.engine, countryIndex) : undefined;
  }

  return formatNumber(buildFormattingContext(mask, nationalDigits, resourceProvider.placeholders, nationalPrefix))
    .formatted;
}
