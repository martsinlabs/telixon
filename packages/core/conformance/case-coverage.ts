import { ENGINE_DEAD, Engine, stepDigit } from '@telixon/core/engine';
import { decidingDigits, positionAfterCallingCode } from './number-reader';

// The library sorts numbers into a finite set of cases (same reader position at the same length = same
// outcome). This builds one example per case: the full sweep, with numbers handled identically collapsed.

// One example number for every case, across the given calling codes and national lengths.
export function buildCaseCoverage(
  engine: Engine,
  callingCodes: readonly string[],
  minLength: number,
  maxLength: number,
): string[] {
  const numbers: string[] = [];

  for (const callingCode of callingCodes) {
    const afterCode = positionAfterCallingCode(engine, callingCode);
    if (afterCode === ENGINE_DEAD) continue;

    // Reachable positions stop growing past the deciding digits, so we only explore that far.
    const deciding = decidingDigits(engine, afterCode, maxLength + 1);

    // One example path per reachable position, by length. exampleByPosition[n] = positions after n digits.
    const exampleByPosition: Map<number, string>[] = [new Map([[afterCode, '']])];
    for (let read = 1; read <= Math.min(maxLength, deciding); read++) {
      const next = new Map<number, string>();
      for (const [position, path] of exampleByPosition[read - 1]!) {
        for (let digit = 0; digit < 10; digit++) {
          const moved = stepDigit(engine, position, digit);
          if (moved !== ENGINE_DEAD && !next.has(moved)) next.set(moved, path + digit);
        }
      }
      exampleByPosition.push(next);
    }

    // Each case at length L: its deciding digits, padded to L with filler that can't change the outcome.
    for (let length = minLength; length <= maxLength; length++) {
      const decidingPart = Math.min(length, deciding);
      const filler = '0'.repeat(length - decidingPart);
      for (const path of exampleByPosition[decidingPart]!.values()) {
        numbers.push('+' + callingCode + path + filler);
      }
    }
  }

  return numbers;
}
