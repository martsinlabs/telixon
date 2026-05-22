import {
  formatNumberWithRawCaret,
  FormattingDirection,
  getRegionIndex,
  PhoneNumberFormat,
  RegionId,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { resolveFormatFromProfile } from '../../../number-resolver/resolve-format-from-profile';
import { buildFormattingContext } from '../../../number-resolver/utils/build-formatting-context';
import { pickMaskForLength } from '../../../number-resolver/utils/pick-mask-for-length';
import { resolvePhoneNumberFormat } from '../../../number-resolver/utils/resolve-phone-number-format';
import { resolveRegionCodeOrFallback } from '../../../number-resolver/utils/resolve-region-code-or-fallback';
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
  const { refMapping, countryScopeLayer, territorySpecTable } = getResourceProvider();

  // Fallback (no matching format, e.g. just the national prefix typed) shows the typed digits;
  // the format path below groups displayDigits instead.
  let formattedNationalNumber: string = rawString;
  let formattedNationalCaretIndex: number = rawCaretIndex;
  let country: RegionId | null = null;

  if (profile) {
    const countryIndex: number = getRegionIndex(countryScopeLayer, profile.stateCountryIndex);

    country = resolveRegionCodeOrFallback(snapshot.callingCodeState, snapshot.nationalDigits, countryIndex);

    // displayDigits already excludes parse-only digit-adding transforms (e.g. a NANPA area code), so
    // the as-you-type form never shows a digit the user didn't type. Select and apply the format on it.
    const formatRef = resolveFormatFromProfile(profile, displayDigits);

    if (formatRef) {
      const format: PhoneNumberFormat = resolvePhoneNumberFormat(formatRef);
      const withPrefixMasks: Record<number, string> | undefined = nationalPrefixTyped
        ? format.masks.nationalWithPrefix
        : undefined;

      // Group whether or not the national prefix was typed (matching Google): with the prefix use the
      // prefix mask, otherwise the plain national mask.
      const mask: string | undefined = pickMaskForLength(
        withPrefixMasks ?? format.masks.national,
        displayDigits.length,
      );

      if (mask !== undefined) {
        const nationalPrefix: string | undefined = withPrefixMasks
          ? territorySpecTable[countryIndex]?.nationalPrefix
          : undefined;

        const { formatted, caretIndex: natCaretFormatted } = formatNumberWithRawCaret(
          buildFormattingContext(mask, displayDigits, refMapping, nationalPrefix),
          rawCaretIndex,
          direction,
        );

        formattedNationalNumber = formatted;
        formattedNationalCaretIndex = natCaretFormatted;
      }

      return {
        country,
        value: formattedNationalNumber,
        selectionStart: formattedNationalCaretIndex,
        selectionEnd: formattedNationalCaretIndex,
        snapshot,
        profileRef: profile,
        formatIndex: formatRef.formatIndex,
      };
    }
  } else if (defaultCountryIndex !== -1) {
    country = refMapping.regions.indexToKey[defaultCountryIndex] ?? null;
  }

  return {
    country,
    value: formattedNationalNumber,
    selectionStart: formattedNationalCaretIndex,
    selectionEnd: formattedNationalCaretIndex,
    snapshot,
    profileRef: profile,
    formatIndex: null,
  };
}
