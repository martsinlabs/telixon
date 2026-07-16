import {
  formatNumber,
  FormattingDirection,
  getMetadataFormatIndex,
  MASK_VARIANT,
  RegionCode,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByRegionIndex } from '@telixon/core/utils/get-calling-code-index-by-region-index';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { buildFormattingContext } from '../../../number-resolver/utils/build-formatting-context';
import { hasMaskVariant, pickFormatMask } from '../../../number-resolver/utils/format-masks';
import { resolvePrimaryRegionIndex } from '../../../number-resolver/utils/resolve-primary-region-index';
import { resolveRegionCodeOrFallback } from '../../../number-resolver/utils/resolve-region-code-or-fallback';
import { selectInternationalFormatIndex } from '../../../number-resolver/utils/select-international-format';
import { CaretIndex, InputControllerState } from '../../models';
import { InternationalDisplayConfig } from '../models';

const DEFAULT_DISPLAY: InternationalDisplayConfig = { callingCodeInInput: true, plusPrefix: 'none' };

export function resolveInternationalControllerState(
  snapshot: NumberResolverSnapshot,
  caretIndex: CaretIndex,
  profile: NumberTypeProfileRef | null,
  display: InternationalDisplayConfig = DEFAULT_DISPLAY,
  direction: FormattingDirection = 'forward',
  plusErased: boolean = false,
): InputControllerState {
  const resourceProvider = getResourceProvider();

  const callingCodeLength: number = snapshot.callingCodeDigits.length;
  const nationalCaretIndex: number = display.callingCodeInInput ? caretIndex - callingCodeLength : caretIndex;
  const caretInCallingCode: boolean = display.callingCodeInInput && nationalCaretIndex < 0;

  let formattedNationalNumber: string = snapshot.nationalDigits;
  let formattedNationalCaretIndex: number = caretInCallingCode ? 0 : nationalCaretIndex;
  let formatIndex: number | null = null;
  let region: RegionCode | null = null;

  if (profile) {
    const regionIndex: number = profile.regionIndex;
    const callingCodeIndex: number = getCallingCodeIndexByRegionIndex(regionIndex);

    // Complete pattern wins (= formatInternational), else progressive partial grouping per keystroke.
    const selectedIndex: number = selectInternationalFormatIndex(callingCodeIndex, snapshot.nationalDigits, true);

    if (selectedIndex >= 0) {
      formatIndex = selectedIndex;
      const globalFormatIndex: number = getMetadataFormatIndex(
        resourceProvider.engine,
        callingCodeIndex,
        selectedIndex,
      );

      const variant: number = hasMaskVariant(globalFormatIndex, MASK_VARIANT.INTERNATIONAL)
        ? MASK_VARIANT.INTERNATIONAL
        : MASK_VARIANT.NATIONAL;
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
      // Strict never leaves the preferred region: report it even when the digits resolve elsewhere (NANP shares a calling code).
      region = resourceProvider.regionIds[regionIndex] ?? null;
    } else {
      region = resolveRegionCodeOrFallback(
        snapshot.callingCodeState,
        snapshot.endState,
        snapshot.nationalDigits,
        regionIndex,
      );
    }
  } else if (snapshot.callingCodeState !== -1) {
    const primaryRegionIndex: number = resolvePrimaryRegionIndex(snapshot.callingCodeState, -1);

    region = resourceProvider.regionIds[primaryRegionIndex] ?? null;
  }

  let value: string;
  let finalCaret: CaretIndex;

  if (display.callingCodeInInput) {
    const plusShown: boolean = display.plusPrefix === 'fixed' || (display.plusPrefix === 'erasable' && !plusErased);
    const plusPrefix: string = plusShown ? '+' : '';
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
    region,
    selectionStart: finalCaret,
    selectionEnd: finalCaret,
    snapshot,
    profileRef: profile,
    formatIndex,
    nationalPrefixPresent: false,
    plusErased,
  };
}
