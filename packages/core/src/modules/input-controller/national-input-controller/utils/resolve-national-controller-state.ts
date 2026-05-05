import { formatNumber, getCountryIndex, PhoneNumberFormat, PhoneNumberFormattingContext } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { resolveFormatFromProfile } from '../../../number-resolver/resolve-format-from-profile';
import { resolvePhoneNumberFormat } from '../../../number-resolver/utils/resolve-phone-number-format';
import { CaretIndex, InputControllerState } from '../../models';

export function resolveNationalControllerState(
  snapshot: NumberResolverSnapshot,
  caretIndex: CaretIndex,
  profile: NumberTypeProfileRef | null,
  defaultCountryIndex: number,
  nationalPrefixTyped: boolean,
  rawString: string,
  rawCaretIndex: CaretIndex,
): InputControllerState {
  const { refMapping, countryScopeLayer, territorySpecTable } = getResourceProvider();

  let formattedNationalNumber: string = rawString;
  let formattedNationalCaretIndex: number = rawCaretIndex;
  let country: string | null = null;

  if (profile) {
    const countryIndex: number = getCountryIndex(countryScopeLayer, profile.stateCountryIndex);

    country = refMapping.countries.indexToKey[countryIndex]!;

    const formatRef = resolveFormatFromProfile(profile, snapshot.nationalDigits.length);

    if (formatRef) {
      const format: PhoneNumberFormat = resolvePhoneNumberFormat(formatRef);
      const withPrefixMask: string | undefined = nationalPrefixTyped ? format.masks.nationalWithPrefix : undefined;

      const prefixRequired: boolean =
        !nationalPrefixTyped &&
        format.masks.nationalWithPrefix !== undefined &&
        format.nationalPrefixOptionalWhenFormatting !== 'true';

      if (!prefixRequired) {
        const nationalPrefix: string | undefined = withPrefixMask
          ? territorySpecTable[countryIndex]?.nationalPrefix
          : undefined;

        const formattingContext: PhoneNumberFormattingContext = {
          mask: withPrefixMask ?? format.masks.national,
          nationalNumber: snapshot.nationalDigits,
          digitPlaceholder: refMapping.digitPlaceholder,
          nationalPrefixPlaceholder: refMapping.nationalPrefixPlaceholder,
          ignoredDigitPlaceholder: refMapping.ignoredDigitPlaceholder,
          ...(nationalPrefix !== undefined && { nationalPrefix }),
        };

        const { formatted, caretIndex: natCaretFormatted } = formatNumber(formattingContext, caretIndex);

        formattedNationalNumber = formatted;
        formattedNationalCaretIndex = natCaretFormatted;
      }

      return {
        country,
        value: formattedNationalNumber,
        selectionStart: formattedNationalCaretIndex,
        selectionEnd: formattedNationalCaretIndex,
        state: snapshot.state,
        terminalStates: snapshot.terminalStates,
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
    state: snapshot.state,
    terminalStates: snapshot.terminalStates,
    profileRef: profile,
    formatIndex: null,
  };
}
