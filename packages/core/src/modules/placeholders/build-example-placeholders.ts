import {
  formatNumber,
  PhoneNumberFormat,
  PhoneNumberFormatList,
  PhoneNumberFormattingContext,
  PhoneNumberType,
  ReferenceMapping,
  selectCompleteFormat,
  TerritorySpec,
} from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

/** Example placeholder variants for one number type, all optional. */
export interface Placeholders {
  national?: string;
  nationalWithPrefix?: string;
  international?: string;
}

// Format the NSN selects, via the format-select DFA layer (no regex). International selection skips
// formats with `intlFormat === 'NA'`.
function chooseFormat(
  formats: PhoneNumberFormatList,
  international: boolean,
  nsn: string,
  callingCodeIndex: number,
): PhoneNumberFormat | null {
  const selected = selectCompleteFormat(getResourceProvider().formatSelectLayer, callingCodeIndex, nsn);
  const index: number = international ? selected.international : selected.national;
  return index === -1 ? null : formats[index]!;
}

// Fills a placeholder mask with the example NSN via the engine's formatter.
function fill(mask: string, nsn: string, ref: ReferenceMapping, nationalPrefix?: string): string {
  const context: PhoneNumberFormattingContext = {
    mask,
    nationalNumber: nsn,
    digitPlaceholder: ref.digitPlaceholder,
    nationalPrefixPlaceholder: ref.nationalPrefixPlaceholder,
    ignoredDigitPlaceholder: ref.ignoredDigitPlaceholder,
  };
  if (nationalPrefix !== undefined) context.nationalPrefix = nationalPrefix;
  return formatNumber(context).formatted;
}

// Derives example placeholders for a number type on demand from the shipped formats + masks, instead of
// reading a pre-built field. Reproduces the formerly-shipped placeholders.
export function buildExamplePlaceholders(
  numberType: PhoneNumberType,
  territory: TerritorySpec,
  formats: PhoneNumberFormatList,
  ref: ReferenceMapping,
  callingCodeIndex: number,
): Placeholders | null {
  if (numberType.exampleNumber === undefined) return null;
  const nsn: string = String(numberType.exampleNumber);
  const length: number = nsn.length;
  const placeholders: Placeholders = {};

  const national: PhoneNumberFormat | null = chooseFormat(formats, false, nsn, callingCodeIndex);
  if (national) {
    const nationalMask: string | undefined = national.masks.national[length];
    if (nationalMask !== undefined) placeholders.national = fill(nationalMask, nsn, ref);

    const prefixMask: string | undefined = national.masks.nationalWithPrefix?.[length];
    if (prefixMask !== undefined)
      placeholders.nationalWithPrefix = fill(prefixMask, nsn, ref, territory.nationalPrefix);
  }

  const hasInternational: boolean = formats.some((format) => format.intlFormat !== 'NA');
  const international: PhoneNumberFormat | null = chooseFormat(formats, hasInternational, nsn, callingCodeIndex);
  if (international) {
    const mask: string | undefined =
      international.masks.international?.[length] ?? international.masks.national[length];
    if (mask !== undefined) placeholders.international = fill(mask, nsn, ref);
  }

  return placeholders.national || placeholders.nationalWithPrefix || placeholders.international ? placeholders : null;
}
