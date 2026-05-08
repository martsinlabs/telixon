import {
  formatNumber,
  FormattingDirection,
  getCallingCodePrimaryCountry,
  getCountryIndex,
  PhoneNumberFormat,
  PhoneNumberFormattingContext,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { NumberResolverSnapshot, NumberTypeProfileRef } from '../../../number-resolver/models';
import { resolveFormatFromProfile } from '../../../number-resolver/resolve-format-from-profile';
import { resolvePhoneNumberFormat } from '../../../number-resolver/utils/resolve-phone-number-format';
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
  const { refMapping, countryScopeLayer, callingCodeLayer } = getResourceProvider();

  const callingCodeLength: number = snapshot.callingCodeDigits.length;
  const nationalCaretIndex: number = display.callingCodeInInput ? caretIndex - callingCodeLength : caretIndex;
  const caretInCallingCode: boolean = display.callingCodeInInput && nationalCaretIndex < 0;

  let formattedNationalNumber: string = snapshot.nationalDigits;
  let formattedNationalCaretIndex: number = caretInCallingCode ? 0 : nationalCaretIndex;
  let formatIndex: number | null = null;

  if (profile) {
    const formatRef = resolveFormatFromProfile(profile, snapshot.nationalDigits.length);

    if (formatRef) {
      formatIndex = formatRef.formatIndex;
      const format: PhoneNumberFormat = resolvePhoneNumberFormat(formatRef);

      const mask: string = display.callingCodeInInput ? format.masks.international : format.masks.national;

      const formattingContext: PhoneNumberFormattingContext = {
        mask,
        nationalNumber: snapshot.nationalDigits,
        digitPlaceholder: refMapping.digitPlaceholder,
        nationalPrefixPlaceholder: refMapping.nationalPrefixPlaceholder,
        ignoredDigitPlaceholder: refMapping.ignoredDigitPlaceholder,
      };

      const { formatted, caretIndex: natCaretFormatted } = formatNumber(
        formattingContext,
        caretInCallingCode ? 0 : nationalCaretIndex,
        direction,
      );

      formattedNationalNumber = formatted;

      if (!caretInCallingCode) {
        formattedNationalCaretIndex = natCaretFormatted;
      }
    }
  }

  let country: string | null = null;

  if (profile) {
    country = refMapping.countries.indexToKey[getCountryIndex(countryScopeLayer, profile.stateCountryIndex)]!;
  } else if (snapshot.callingCodeState !== -1) {
    const primaryCountryIndex: number = getCallingCodePrimaryCountry(callingCodeLayer, snapshot.callingCodeState);

    country = refMapping.countries.indexToKey[primaryCountryIndex] ?? null;
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
    state: snapshot.state,
    terminalStates: snapshot.terminalStates,
    profileRef: profile,
    formatIndex,
  };
}
