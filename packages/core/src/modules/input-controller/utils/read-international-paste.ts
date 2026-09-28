import { BinaryFilter } from '@telixon/core/models';
import { firstPlusOrDigitIndex } from '@telixon/core/utils/first-plus-or-digit-index';
import { NumberResolverSnapshot } from '../../number-resolver/models';
import { ResolvedNumberState, resolveNumber } from '../../number-resolver/resolve-number';
import { parsePhoneNumber } from '../../parse-phone-number';
import { PhoneNumber } from '../../phone-number';
import { collectDigits } from './collect-digits';

/** A pasted text read as one international number. */
export interface PastedInternationalNumber {
  /** The number in international form, without a written trunk prefix and without an extension. */
  readonly text: string;
  readonly resolved: ResolvedNumberState;
  readonly snapshot: NumberResolverSnapshot;
}

/**
 * Reads `text` as one whole international number: a plus before any digit, a complete calling code,
 * and a national part. Whatever a clipboard puts in front of the plus, such as a label, a `tel:`
 * scheme, quotes or a text direction mark, is skipped. Text that carries no such number returns
 * `null`, which leaves it to the ordinary edit path. A written trunk prefix and an extension are
 * dropped, since no field shows them.
 */
export function readInternationalPaste(
  text: string,
  defaultRegionIndex: number,
  regionFilter: BinaryFilter | null,
  numberTypeFilter: BinaryFilter | null,
): PastedInternationalNumber | null {
  const start: number = firstPlusOrDigitIndex(text);
  const code: number = start === -1 ? 0 : text.charCodeAt(start);
  if (code !== 0x2b && code !== 0xff0b) return null;
  // The number from its plus on, with the plus written the way the parser reads it.
  const trimmed: string = `+${text.slice(start + 1)}`;
  if (collectDigits(trimmed) === '') return null;

  const parsed: PhoneNumber = parsePhoneNumber(trimmed);
  const callingCode: string | null = parsed.getCallingCode();
  const nationalNumber: string = parsed.getNationalNumber();
  if (callingCode === null || nationalNumber === '') return null;

  // The number as the field must hold it, read the way every other value is read.
  const pasted: string = `+${callingCode}${nationalNumber}`;
  const resolved: ResolvedNumberState = resolveNumber({
    input: pasted,
    hasLeadingPlus: true,
    seedCallingCode: null,
    defaultRegionIndex,
    regionFilter,
    numberTypeFilter,
    // The number's own region decides here; a strict field pins the region after this read.
    strict: false,
  });
  const { snapshot } = resolved;
  if (!snapshot.callingCodeCompleted || snapshot.nationalDigits === '') return null;

  return { text: pasted, resolved, snapshot };
}
