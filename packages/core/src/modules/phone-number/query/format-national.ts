import {
  formatNumber,
  getFormatPrefixRule,
  getMetadataFormatIndex,
  getRegionNationalPrefix,
  MASK_VARIANT,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { buildFormattingContext } from '../../number-resolver/utils/build-formatting-context';
import { hasMaskVariant, pickFormatMask } from '../../number-resolver/utils/format-masks';
import { resolvePrimaryRegionIndex } from '../../number-resolver/utils/resolve-primary-region-index';
import { selectNationalFormatIndex } from '../../number-resolver/utils/select-national-format';
import { ResolvedPhoneNumber } from '../models';
import { appendExtensionSuffix } from './format-extension-suffix';
import { getRegion } from './get-region';
import { isPossible } from './is-possible';

// NATIONAL format, or null until possible; national prefix only when the format has a prefix rule, from the resolved region (else the calling code's main region, like libphonenumber).
export function formatNational(resolved: ResolvedPhoneNumber): string | null {
  const base: string | null = formatNationalBase(resolved);
  return base === null ? null : appendExtensionSuffix(base, resolved);
}

function formatNationalBase(resolved: ResolvedPhoneNumber): string | null {
  const { nationalDigits, callingCode, callingCodeState, defaultRegionIndex } = resolved;
  if (!isPossible(resolved)) return null;

  const resourceProvider = getResourceProvider();
  const callingCodeIndex: number | undefined = resourceProvider.callingCodeIndexByCode[Number(callingCode)];
  if (callingCodeIndex === undefined) return null;

  const formatPosition: number = selectNationalFormatIndex(callingCodeIndex, nationalDigits, false);
  if (formatPosition < 0) return nationalDigits;

  const formatIndex: number = getMetadataFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition);
  const usePrefixMasks: boolean =
    getFormatPrefixRule(resourceProvider.engine, formatIndex) !== undefined &&
    hasMaskVariant(formatIndex, MASK_VARIANT.NATIONAL_WITH_PREFIX);
  const variant: number = usePrefixMasks ? MASK_VARIANT.NATIONAL_WITH_PREFIX : MASK_VARIANT.NATIONAL;
  const mask: string | undefined = pickFormatMask(formatIndex, variant, nationalDigits.length);
  if (mask === undefined) return nationalDigits;

  let nationalPrefix: string | undefined;
  if (usePrefixMasks) {
    const region: RegionCode | null = getRegion(resolved);
    const regionIndex: number =
      region !== null
        ? (resourceProvider.regionKeyToIndex[region] ?? -1)
        : resolvePrimaryRegionIndex(callingCodeState, defaultRegionIndex);
    nationalPrefix = regionIndex >= 0 ? getRegionNationalPrefix(resourceProvider.engine, regionIndex) : undefined;
  }

  return formatNumber(buildFormattingContext(mask, nationalDigits, resourceProvider.placeholders, nationalPrefix))
    .formatted;
}
