import { selectCompleteFormat, selectPartialFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// Index of the international format for `nationalDigits` within the calling code's list, or -1.
// Prefers a complete match (identical to formatInternational). The partial match is only for numbers
// still being typed (allowPartial); a complete number with no complete match stays ungrouped.
// Resolved by the format-select DFA layer (replaces the leadingDigits + full-pattern regex); the
// international partial ignores the profile mask, so 0 is passed.
export function selectInternationalFormatIndex(
  callingCodeIndex: number,
  nationalDigits: string,
  allowPartial: boolean,
): number {
  const { formatSelectLayer } = getResourceProvider();

  const complete: number = selectCompleteFormat(formatSelectLayer, callingCodeIndex, nationalDigits).international;
  if (complete !== -1) return complete;
  if (!allowPartial) return -1;

  return selectPartialFormat(formatSelectLayer, callingCodeIndex, nationalDigits, 0).international;
}
