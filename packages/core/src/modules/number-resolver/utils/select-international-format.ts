import { selectCompleteFormat, selectPartialFormat } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';

// International format index for `nationalDigits`, or -1: complete match (= formatInternational), else partial while typing.
export function selectInternationalFormatIndex(
  callingCodeIndex: number,
  nationalDigits: string,
  allowPartial: boolean,
): number {
  const { engine } = getResourceProvider();

  const complete: number = selectCompleteFormat(engine, callingCodeIndex, nationalDigits).international;
  if (complete !== -1) return complete;
  if (!allowPartial) return -1;

  return selectPartialFormat(engine, callingCodeIndex, nationalDigits, 0).international;
}
