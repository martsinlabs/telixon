import { ENGINE_DEAD, Engine } from '@telixon/core/engine';
import { decidingDigits, positionAfterCallingCode } from './number-reader';

// Exhaustive enumeration: the outcome depends only on calling code, length, and the deciding digits, so
// every combination of those at every length covers every distinct outcome. Each index = one number.

interface Block {
  readonly callingCode: string;
  readonly length: number;
  readonly prefixLength: number;
  readonly start: number;
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
  const blocks: Block[] = [];
  const starts: number[] = [];
  let total = 0;
  let callingCodeCount = 0;

  for (const callingCode of callingCodes) {
    const afterCode = positionAfterCallingCode(engine, callingCode);
    if (afterCode === ENGINE_DEAD) continue;
    callingCodeCount++;
    const deciding = decidingDigits(engine, afterCode, maxLength + 1);

    for (let length = minLength; length <= maxLength; length++) {
      const prefixLength = Math.min(length, deciding);
      blocks.push({ callingCode, length, prefixLength, start: total });
      starts.push(total);
      total += 10 ** prefixLength;
    }
  }

  function findBlock(index: number): Block {
    let low = 0;
    let high = blocks.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (starts[mid]! <= index) low = mid;
      else high = mid - 1;
    }
    return blocks[low]!;
  }

  return {
    total,
    callingCodeCount,
    at(index: number): string {
      const block: Block = findBlock(index);
      const prefix: string = (index - block.start).toString().padStart(block.prefixLength, '0');
      const national: string = prefix + '0'.repeat(block.length - block.prefixLength);
      return '+' + block.callingCode + national;
    },
  };
}
