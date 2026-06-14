import { formatNumber, getMetadataFormatIndex, MASK_VARIANT } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { buildFormattingContext } from '../../number-resolver/utils/build-formatting-context';
import { pickFormatMask } from '../../number-resolver/utils/format-masks';
import { selectInternationalFormatIndex } from '../../number-resolver/utils/select-international-format';
import { ResolvedPhoneNumber } from '../models';
import { isPossible } from './is-possible';

// INTERNATIONAL format, or null until possible. Groups via the engine per-length mask, like the controller.
export function formatInternational(resolved: ResolvedPhoneNumber): string | null {
  const { nationalDigits, callingCode } = resolved;
  if (!isPossible(resolved)) return null;

  const resourceProvider = getResourceProvider();
  const callingCodeIndex: number | undefined = resourceProvider.callingCodeIndexByCode[Number(callingCode)];
  if (callingCodeIndex === undefined) return null;

  const formatPosition: number = selectInternationalFormatIndex(callingCodeIndex, nationalDigits, false);
  const mask: string | undefined =
    formatPosition >= 0
      ? pickFormatMask(
          getMetadataFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition),
          MASK_VARIANT.International,
          nationalDigits.length,
        )
      : undefined;

  if (mask === undefined) return `+${callingCode} ${nationalDigits}`;

  const formatted: string = formatNumber(
    buildFormattingContext(mask, nationalDigits, resourceProvider.placeholders),
  ).formatted;
  return `+${callingCode} ${formatted}`;
}
