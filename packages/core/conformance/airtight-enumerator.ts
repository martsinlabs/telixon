import { ENGINE_DEAD, Engine } from '@telixon/core/engine';
import { decidingDigits, positionAfterCallingCode } from './number-reader';

// Past its deciding depth the engine stops reacting to digit values, so trying every deciding-digit
// combination once per calling code and length, with a zero tail, covers every distinct case exactly
// once. `sections` lists those runs back to back; an index writes its offset as the deciding digits.

// One run of consecutive indices: every deciding-digit combination for one calling code and length.
interface Section {
  readonly callingCode: string;
  readonly decidingDigitCount: number;
  readonly zeroTail: string;
  readonly firstIndex: number;
}

export interface AirtightEnumerator {
  readonly total: number;
  readonly callingCodeCount: number;
  // International input "+<callingCode><national>" for the given index.
  at(index: number): string;
}

export function createAirtightEnumerator(
  engine: Engine,
  callingCodes: readonly string[],
  minLength: number,
  maxLength: number,
): AirtightEnumerator {
  const sections: Section[] = [];
  let total = 0;
  let callingCodeCount = 0;

  for (const callingCode of callingCodes) {
    const afterCode = positionAfterCallingCode(engine, callingCode);
    if (afterCode === ENGINE_DEAD) continue;
    callingCodeCount++;
    const decidingDepth = decidingDigits(engine, afterCode, maxLength + 1);

    for (let nationalLength = minLength; nationalLength <= maxLength; nationalLength++) {
      const decidingDigitCount = Math.min(nationalLength, decidingDepth);
      sections.push({
        callingCode,
        decidingDigitCount,
        zeroTail: '0'.repeat(nationalLength - decidingDigitCount),
        firstIndex: total,
      });
      total += 10 ** decidingDigitCount;
    }
  }

  // The last section whose firstIndex is at or below the index; sections are contiguous, so it owns
  // the index. The midpoint is biased up because the search converges on the last match.
  function sectionContaining(index: number): Section {
    let low = 0;
    let high = sections.length - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (sections[middle]!.firstIndex <= index) low = middle;
      else high = middle - 1;
    }
    return sections[low]!;
  }

  return {
    total,
    callingCodeCount,
    at(index: number): string {
      const section = sectionContaining(index);
      const offset = index - section.firstIndex;
      const decidingPart = offset.toString().padStart(section.decidingDigitCount, '0');
      return '+' + section.callingCode + decidingPart + section.zeroTail;
    },
  };
}
