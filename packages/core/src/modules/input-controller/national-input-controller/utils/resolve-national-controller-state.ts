import {
  formatNumber,
  formatNumberWithRawCaret,
  FormattingDirection,
  getFormatIndex,
  getRegionNationalPrefix,
  MASK_VARIANT,
  NationalPrefixRules,
  PhoneNumberFormattingContext,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { resolveFormatFromProfile } from '../../../number-resolver/resolve-format-from-profile';
import { buildFormattingContext } from '../../../number-resolver/utils/build-formatting-context';
import { hasMaskVariant, pickFormatMask } from '../../../number-resolver/utils/format-masks';
import { resolvePrimaryRegionIndex } from '../../../number-resolver/utils/resolve-primary-region-index';
import { resolveRegionCodeOrFallback } from '../../../number-resolver/utils/resolve-region-code-or-fallback';
import { selectNationalFormatIndex } from '../../../number-resolver/utils/select-national-format';
import { NationalControllerState } from '../models';
import { buildDigitAlignment, DigitAlignment } from './digit-alignment';

export function resolveNationalControllerState(
  snapshot: NumberResolverSnapshot,
  profile: NumberTypeProfileRef | null,
  defaultRegionIndex: number,
  nationalPrefixTyped: boolean,
  typedDigits: string,
  displayDigits: string,
  typedCaretIndex: number,
  prefixRules: NationalPrefixRules | undefined,
  direction: FormattingDirection = 'forward',
): NationalControllerState {
  const resourceProvider = getResourceProvider();
  const caretIndex: number = Math.max(0, Math.min(typedCaretIndex, typedDigits.length));

  // Fallback (no matching format, e.g. just the national prefix) shows the typed digits directly.
  let formattedNationalNumber: string = typedDigits;
  let formattedNationalCaretIndex: number = caretIndex;
  let alignment: DigitAlignment | null = null;
  let region: RegionCode | null = null;
  let appliedFormatIndex: number | null = null;

  if (profile) {
    const regionIndex: number = profile.regionIndex;
    const callingCodeIndex: number = getCallingCodeIndexByRegionIndex(regionIndex);

    // displayDigits drops parse-only digit-adding transforms, so no untyped digit is shown.
    const formatRef = resolveFormatFromProfile(profile, displayDigits);

    if (snapshot.strict) {
      // Strict never leaves the preferred region: report it even when the digits resolve elsewhere (NANP shares a calling code).
      region = resourceProvider.regionIds[regionIndex] ?? null;
    } else {
      // No specific region (possible but not valid): fall back to the calling code's primary region.
      const fallbackRegionIndex: number = formatRef
        ? regionIndex
        : resolvePrimaryRegionIndex(snapshot.callingCodeState, regionIndex);
      region = resolveRegionCodeOrFallback(
        snapshot.callingCodeState,
        snapshot.endState,
        snapshot.nationalDigits,
        snapshot.regionFilter,
        fallbackRegionIndex,
      );
    }

    // Prefer the profile's format; otherwise the calling code's national format, so possible numbers group.
    const formatPosition: number = formatRef
      ? formatRef.formatIndex
      : selectNationalFormatIndex(callingCodeIndex, displayDigits, true);

    if (formatPosition !== -1) {
      appliedFormatIndex = formatPosition;
      const formatIndex: number = getFormatIndex(resourceProvider.engine, callingCodeIndex, formatPosition);

      // Group whether or not the national prefix was typed (matching Google): prefix mask with it, plain national mask otherwise.
      const usePrefixMasks: boolean =
        nationalPrefixTyped && hasMaskVariant(formatIndex, MASK_VARIANT.NATIONAL_WITH_PREFIX);
      const variant: number = usePrefixMasks ? MASK_VARIANT.NATIONAL_WITH_PREFIX : MASK_VARIANT.NATIONAL;
      const mask: string | undefined = pickFormatMask(formatIndex, variant, displayDigits.length);

      if (mask !== undefined) {
        const nationalPrefix: string | undefined = usePrefixMasks
          ? getRegionNationalPrefix(resourceProvider.engine, regionIndex)
          : undefined;

        const context: PhoneNumberFormattingContext = buildFormattingContext(
          mask,
          displayDigits,
          resourceProvider.placeholders,
          nationalPrefix,
        );
        formattedNationalNumber = formatNumber(context, { caretIndex: 0, direction }).formatted;
        alignment = buildDigitAlignment(typedDigits, context, formattedNationalNumber, prefixRules, direction);

        // The engine places the caret by a rendered digit count; the alignment converts the typed caret into it.
        const caretDigitCount: number =
          alignment === null ? caretIndex : alignment.renderedDigitCountByTypedBoundary[caretIndex]!;
        formattedNationalCaretIndex = formatNumberWithRawCaret(context, caretDigitCount, direction).caretIndex;
      }
    }
  } else if (defaultRegionIndex !== -1) {
    region = resourceProvider.regionIds[defaultRegionIndex] ?? null;
  }

  return {
    region,
    value: formattedNationalNumber,
    selectionStart: formattedNationalCaretIndex,
    selectionEnd: formattedNationalCaretIndex,
    snapshot,
    profileRef: profile,
    formatIndex: appliedFormatIndex,
    nationalPrefixPresent: nationalPrefixTyped,
    plusErased: false,
    rawDigits: typedDigits,
    rawCaretIndex: caretIndex,
    alignment,
  };
}
