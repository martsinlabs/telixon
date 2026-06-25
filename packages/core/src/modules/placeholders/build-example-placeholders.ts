import {
  formatNumber,
  getRegionNationalPrefix,
  MASK_VARIANT,
  PhoneNumberFormattingContext,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { MetadataPlaceholders } from '@telixon/core/resource-provider/models';
import { pickFormatMask } from '../number-resolver/utils/format-masks';

/** Example placeholder variants for one number type, all optional. */
export interface Placeholders {
  readonly national?: string;
  readonly nationalWithPrefix?: string;
  readonly international?: string;
}

// Fills a placeholder mask with the example NSN via the engine's formatter.
function fill(mask: string, nsn: string, placeholders: MetadataPlaceholders, nationalPrefix?: string): string {
  const context: PhoneNumberFormattingContext = {
    mask,
    nationalNumber: nsn,
    digitPlaceholder: placeholders.digitPlaceholder,
    nationalPrefixPlaceholder: placeholders.nationalPrefixPlaceholder,
    ignoredDigitPlaceholder: placeholders.ignoredDigitPlaceholder,
  };
  if (nationalPrefix !== undefined) context.nationalPrefix = nationalPrefix;
  return formatNumber(context).formatted;
}

// Derives example placeholders for a number type on demand from the shipped masks (format indices are global, selected by the caller via the format-select layer).
export function buildExamplePlaceholders(
  exampleNsn: string,
  regionIndex: number,
  nationalFormatIndex: number,
  internationalFormatIndex: number,
): Placeholders | null {
  const resourceProvider = getResourceProvider();
  const placeholders: { national?: string; nationalWithPrefix?: string; international?: string } = {};
  const length: number = exampleNsn.length;

  if (nationalFormatIndex !== -1) {
    const nationalMask: string | undefined = pickFormatMask(nationalFormatIndex, MASK_VARIANT.National, length);
    if (nationalMask !== undefined) {
      placeholders.national = fill(nationalMask, exampleNsn, resourceProvider.placeholders);
    }

    const prefixMask: string | undefined = pickFormatMask(nationalFormatIndex, MASK_VARIANT.NationalWithPrefix, length);
    if (prefixMask !== undefined) {
      placeholders.nationalWithPrefix = fill(
        prefixMask,
        exampleNsn,
        resourceProvider.placeholders,
        getRegionNationalPrefix(resourceProvider.engine, regionIndex),
      );
    }
  }

  if (internationalFormatIndex !== -1) {
    const mask: string | undefined =
      pickFormatMask(internationalFormatIndex, MASK_VARIANT.International, length) ??
      pickFormatMask(internationalFormatIndex, MASK_VARIANT.National, length);
    if (mask !== undefined) placeholders.international = fill(mask, exampleNsn, resourceProvider.placeholders);
  }

  return placeholders.national || placeholders.nationalWithPrefix || placeholders.international ? placeholders : null;
}
