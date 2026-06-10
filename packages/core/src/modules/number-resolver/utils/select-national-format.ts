import { selectCompleteFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// Index of the matching national format, or -1 (then the number stays ungrouped).
// Resolved by the format-select DFA layer (replaces the leadingDigits + full-pattern regex).
export function selectNationalFormatIndex(callingCodeIndex: number, nationalDigits: string): number {
  return selectCompleteFormat(getResourceProvider().formatSelectLayer, callingCodeIndex, nationalDigits).national;
}
