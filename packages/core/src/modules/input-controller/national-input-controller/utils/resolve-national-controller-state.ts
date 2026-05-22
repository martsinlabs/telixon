import {
  CountryId,
  formatNumberWithRawCaret,
  FormattingDirection,
  getCountryIndex,
  PhoneNumberFormat,
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
  rawCaretIndex: CaretIndex,
  direction: FormattingDirection = 'forward',
): InputControllerState {
  const { refMapping, countryScopeLayer, territorySpecTable } = getResourceProvider();

  let formattedNationalNumber: string = rawString;
  let formattedNationalCaretIndex: number = rawCaretIndex;
  let country: CountryId | null = null;

  if (profile) {
    const countryIndex: number = getCountryIndex(countryScopeLayer, profile.stateCountryIndex);

    country = resolveRegionCodeOrFallback(snapshot.callingCodeState, snapshot.nationalDigits, countryIndex);

    const formatRef = resolveFormatFromProfile(profile, snapshot.nationalDigits);

    if (formatRef) {
      const format: PhoneNumberFormat = resolvePhoneNumberFormat(formatRef);
      const withPrefixMasks: Record<number, string> | undefined = nationalPrefixTyped
        ? format.masks.nationalWithPrefix
        : undefined;

      const prefixRequired: boolean =
        !nationalPrefixTyped &&
        format.masks.nationalWithPrefix !== undefined &&
        format.nationalPrefixOptionalWhenFormatting !== 'true';

      const mask: string | undefined = prefixRequired
        ? undefined
        : pickMaskForLength(withPrefixMasks ?? format.masks.national, snapshot.nationalDigits.length);

      if (mask !== undefined) {
        const nationalPrefix: string | undefined = withPrefixMasks
          ? territorySpecTable[countryIndex]?.nationalPrefix
          : undefined;

        const { formatted, caretIndex: natCaretFormatted } = formatNumberWithRawCaret(
          buildFormattingContext(mask, snapshot.nationalDigits, refMapping, nationalPrefix),
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
    country = refMapping.countries.indexToKey[defaultCountryIndex] ?? null;
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
