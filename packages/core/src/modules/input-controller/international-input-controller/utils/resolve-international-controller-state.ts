import {
  formatNumber,
  FormattingDirection,
  getMetadataFormatIndex,
  MASK_VARIANT,
  RegionId,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { buildFormattingContext } from '../../../number-resolver/utils/build-formatting-context';
import { hasMaskVariant, pickFormatMask } from '../../../number-resolver/utils/format-masks';
import { resolvePrimaryCountryIndex } from '../../../number-resolver/utils/resolve-primary-country-index';
import { resolveRegionCodeOrFallback } from '../../../number-resolver/utils/resolve-region-code-or-fallback';
import { selectInternationalFormatIndex } from '../../../number-resolver/utils/select-international-format';
import { CaretIndex, InputControllerState } from '../../models';
import { InternationalDisplayConfig } from '../models';

const DEFAULT_DISPLAY: InternationalDisplayConfig = { callingCodeInInput: true, plusPrefix: false };

export function resolveInternationalControllerState(
  snapshot: NumberResolverSnapshot,
  caretIndex: CaretIndex,
  profile: NumberTypeProfileRef | null,
  display: InternationalDisplayConfig = DEFAULT_DISPLAY,
  direction: FormattingDirection = 'forward',
): InputControllerState {
  const resourceProvider = getResourceProvider();

  const callingCodeLength: number = snapshot.callingCodeDigits.length;
  const nationalCaretIndex: number = display.callingCodeInInput ? caretIndex - callingCodeLength : caretIndex;
  const caretInCallingCode: boolean = display.callingCodeInInput && nationalCaretIndex < 0;

  let formattedNationalNumber: string = snapshot.nationalDigits;
  let formattedNationalCaretIndex: number = caretInCallingCode ? 0 : nationalCaretIndex;
  let formatIndex: number | null = null;
  let country: RegionId | null = null;

  if (profile) {
    const countryIndex: number = profile.regionIndex;
    const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(countryIndex);

    // Complete pattern wins (= formatInternational), else progressive partial grouping per keystroke.
    const selectedIndex: number = selectInternationalFormatIndex(callingCodeIndex, snapshot.nationalDigits, true);

    if (selectedIndex >= 0) {
      formatIndex = selectedIndex;
      const globalFormatIndex: number = getMetadataFormatIndex(
        resourceProvider.engine,
        callingCodeIndex,
        selectedIndex,
      );

      const variant: number = hasMaskVariant(globalFormatIndex, MASK_VARIANT.International)
        ? MASK_VARIANT.International
        : MASK_VARIANT.National;
      const mask: string | undefined = pickFormatMask(globalFormatIndex, variant, snapshot.nationalDigits.length);

      if (mask !== undefined) {
        const { formatted, caretIndex: natCaretFormatted } = formatNumber(
          buildFormattingContext(mask, snapshot.nationalDigits, resourceProvider.placeholders),
          caretInCallingCode ? 0 : nationalCaretIndex,
          direction,
        );

        formattedNationalNumber = formatted;

        if (!caretInCallingCode) {
          formattedNationalCaretIndex = natCaretFormatted;
        }
      }
    }

    if (snapshot.strict) {
      // Strict never leaves the preferred country: report it, not the digit-resolved region (NANP shares a calling code).
      country = resourceProvider.regionIds[countryIndex] ?? null;
    } else {
      country = resolveRegionCodeOrFallback(
        snapshot.callingCodeState,
        snapshot.endState,
        snapshot.nationalDigits,
        countryIndex,
      );
    }
  } else if (snapshot.callingCodeState !== -1) {
    const primaryCountryIndex: number = resolvePrimaryCountryIndex(snapshot.callingCodeState, -1);

    country = resourceProvider.regionIds[primaryCountryIndex] ?? null;
  }

  let value: string;
  let finalCaret: CaretIndex;

  if (display.callingCodeInInput) {
    const plusPrefix: string = display.plusPrefix ? '+' : '';
    const plusOffset: number = plusPrefix.length;
    const separator: string = snapshot.callingCodeCompleted ? ' ' : '';
    const separatorOffset: number = separator.length;

    value = `${plusPrefix}${snapshot.callingCodeDigits}${separator}${formattedNationalNumber}`;
    finalCaret = caretInCallingCode
      ? plusOffset + caretIndex
      : plusOffset + callingCodeLength + separatorOffset + formattedNationalCaretIndex;
  } else {
    value = formattedNationalNumber;
    finalCaret = formattedNationalCaretIndex;
  }

  return {
    value,
    country,
    selectionStart: finalCaret,
    selectionEnd: finalCaret,
    snapshot,
    profileRef: profile,
    formatIndex,
    nationalPrefixPresent: false,
  };
}
