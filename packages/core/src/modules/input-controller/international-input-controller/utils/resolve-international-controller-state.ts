import {
  formatNumber,
  FormattingDirection,
  getCallingCodePrimaryRegion,
  getRegionIndex,
  PhoneNumberFormat,
  RegionId,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getCallingCodeIndexByCountryIndex } from '@telixon/core/utils/get-calling-code-index-by-country-index';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { buildFormattingContext } from '../../../number-resolver/utils/build-formatting-context';
import { pickMaskForLength } from '../../../number-resolver/utils/pick-mask-for-length';
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
  const { refMapping, countryScopeLayer, callingCodeLayer, formatsTable } = getResourceProvider();

  const callingCodeLength: number = snapshot.callingCodeDigits.length;
  const nationalCaretIndex: number = display.callingCodeInInput ? caretIndex - callingCodeLength : caretIndex;
  const caretInCallingCode: boolean = display.callingCodeInInput && nationalCaretIndex < 0;

  let formattedNationalNumber: string = snapshot.nationalDigits;
  let formattedNationalCaretIndex: number = caretInCallingCode ? 0 : nationalCaretIndex;
  let formatIndex: number | null = null;
  let country: RegionId | null = null;

  if (profile) {
    const countryIndex: number = getRegionIndex(countryScopeLayer, profile.stateCountryIndex);
    const callingCodeIndex: number = getCallingCodeIndexByCountryIndex(countryIndex);

    // Group as aggressively as possible: a complete pattern wins (canonical formatInternational),
    // otherwise fall back to progressive partial grouping at every keystroke.
    const selectedIndex: number = selectInternationalFormatIndex(callingCodeIndex, snapshot.nationalDigits, true);

    if (selectedIndex >= 0) {
      formatIndex = selectedIndex;
      const format: PhoneNumberFormat = formatsTable[callingCodeIndex]![selectedIndex]!;

      const masksByLength = format.masks.international ?? format.masks.national;
      const mask: string | undefined = pickMaskForLength(masksByLength, snapshot.nationalDigits.length);

      if (mask !== undefined) {
        const { formatted, caretIndex: natCaretFormatted } = formatNumber(
          buildFormattingContext(mask, snapshot.nationalDigits, refMapping),
          caretInCallingCode ? 0 : nationalCaretIndex,
          direction,
        );

        formattedNationalNumber = formatted;

        if (!caretInCallingCode) {
          formattedNationalCaretIndex = natCaretFormatted;
        }
      }
    }

    country = resolveRegionCodeOrFallback(snapshot.callingCodeState, snapshot.nationalDigits, countryIndex);
  } else if (snapshot.callingCodeState !== -1) {
    const primaryCountryIndex: number = getCallingCodePrimaryRegion(callingCodeLayer, snapshot.callingCodeState);

    country = refMapping.regions.indexToKey[primaryCountryIndex] ?? null;
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
  };
}
