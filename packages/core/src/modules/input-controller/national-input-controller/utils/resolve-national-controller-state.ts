import {
  formatNumberWithRawCaret,
  FormattingDirection,
  getMetadataFormatIndex,
  getRegionNationalPrefix,
  MASK_VARIANT,
  RegionId,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { resolveFormatFromProfile } from '../../../number-resolver/resolve-format-from-profile';
import { buildFormattingContext } from '../../../number-resolver/utils/build-formatting-context';
import { hasMaskVariant, pickFormatMask } from '../../../number-resolver/utils/format-masks';
import { resolvePrimaryCountryIndex } from '../../../number-resolver/utils/resolve-primary-country-index';
import { resolveRegionCodeOrFallback } from '../../../number-resolver/utils/resolve-region-code-or-fallback';
import { selectNationalFormatIndex } from '../../../number-resolver/utils/select-national-format';
import { CaretIndex, InputControllerState } from '../../models';

export function resolveNationalControllerState(
  snapshot: NumberResolverSnapshot,
  profile: NumberTypeProfileRef | null,
  defaultCountryIndex: number,
  nationalPrefixTyped: boolean,
  rawString: string,
  displayDigits: string,
  rawCaretIndex: CaretIndex,
  direction: FormattingDirection = 'forward',
): InputControllerState {
  const resourceProvider = getResourceProvider();

  // Fallback (no matching format, e.g. just the national prefix) shows the typed digits; the format path below groups displayDigits.
  let formattedNationalNumber: string = rawString;
  let formattedNationalCaretIndex: number = rawCaretIndex;
  let country: RegionId | null = null;
  let appliedFormatIndex: number | null = null;

  if (profile) {
    const countryIndex: number = profile.regionIndex;
    const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(countryIndex);

    // displayDigits drops parse-only digit-adding transforms, so no untyped digit is shown.
    const formatRef = resolveFormatFromProfile(profile, displayDigits);

    // No specific region (possible but not valid): fall back to the calling code's primary region.
    const fallbackRegionIndex: number = formatRef
      ? countryIndex
      : resolvePrimaryCountryIndex(snapshot.callingCodeState, countryIndex);
    country = resolveRegionCodeOrFallback(
      snapshot.callingCodeState,
      snapshot.endState,
      snapshot.nationalDigits,
      fallbackRegionIndex,
    );

    // Prefer the profile's format; otherwise the calling code's national format, so possible numbers group.
    const formatPosition: number = formatRef
      ? formatRef.formatIndex
      : selectNationalFormatIndex(callingCodeIndex, displayDigits, true);

    if (formatPosition !== -1) {
      appliedFormatIndex = formatPosition;
      const formatIndex: number = getMetadataFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition);

      // Group whether or not the national prefix was typed (matching Google): prefix mask with it, plain national mask otherwise.
      const usePrefixMasks: boolean =
        nationalPrefixTyped && hasMaskVariant(formatIndex, MASK_VARIANT.NationalWithPrefix);
      const variant: number = usePrefixMasks ? MASK_VARIANT.NationalWithPrefix : MASK_VARIANT.National;
      const mask: string | undefined = pickFormatMask(formatIndex, variant, displayDigits.length);

      if (mask !== undefined) {
        const nationalPrefix: string | undefined = usePrefixMasks
          ? getRegionNationalPrefix(resourceProvider.engine, countryIndex)
          : undefined;

        const { formatted, caretIndex: natCaretFormatted } = formatNumberWithRawCaret(
          buildFormattingContext(mask, displayDigits, resourceProvider.placeholders, nationalPrefix),
          rawCaretIndex,
          direction,
        );

        formattedNationalNumber = formatted;
        formattedNationalCaretIndex = natCaretFormatted;
      }
    }
  } else if (defaultCountryIndex !== -1) {
    country = resourceProvider.regionIds[defaultCountryIndex] ?? null;
  }

  return {
    country,
    value: formattedNationalNumber,
    selectionStart: formattedNationalCaretIndex,
    selectionEnd: formattedNationalCaretIndex,
    snapshot,
    profileRef: profile,
    formatIndex: appliedFormatIndex,
    nationalPrefixPresent: nationalPrefixTyped,
  };
}
