import { selectCompleteFormat, selectPartialFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// National format index for `nationalDigits`, or -1: complete match (= formatNational), else partial while typing.
export function selectNationalFormatIndex(
  callingCodeIndex: number,
  nationalDigits: string,
  allowPartial: boolean,
): number {
  const { engine } = getResourceProvider();

  const complete: number = selectCompleteFormat(engine, callingCodeIndex, nationalDigits).national;
  if (complete !== -1) return complete;
  if (!allowPartial) return -1;

  return selectPartialFormat(engine, callingCodeIndex, nationalDigits, 0).national;
}
