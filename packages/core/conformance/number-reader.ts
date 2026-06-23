import { ENGINE_DEAD, Engine, walkDigit } from '@telixon/core/engine';

// The engine reads a number digit by digit, moving through internal positions (walkDigit advances one;
// ENGINE_DEAD is a dead end). Two questions about that reader build every test number set.

// Position the reader lands on after the calling code, where national digits begin; ENGINE_DEAD if invalid.
export function positionAfterCallingCode(engine: Engine, callingCode: string): number {
  let position = 0;
  for (let index = 0; index < callingCode.length; index++) {
    position = walkDigit(engine, position, callingCode.charCodeAt(index) - 48);
    if (position === ENGINE_DEAD) return ENGINE_DEAD;
  }
  return position;
}

// How many leading national digits decide the case. Past this count every digit moves the reader the same
// way, so the rest cannot change classification. `maxDigits` caps the search.
export function decidingDigits(engine: Engine, fromPosition: number, maxDigits: number): number {
  let positions = new Set<number>([fromPosition]);
  let lastDeciding = -1;
  for (let read = 0; read < maxDigits && positions.size > 0; read++) {
    const next = new Set<number>();
    for (const position of positions) {
      if (position === ENGINE_DEAD) continue;
      let firstTarget = -2;
      let dependsOnDigit = false;
      for (let digit = 0; digit < 10; digit++) {
        const target = walkDigit(engine, position, digit);
        if (firstTarget === -2) firstTarget = target;
        else if (target !== firstTarget) dependsOnDigit = true;
        if (target !== ENGINE_DEAD) next.add(target);
      }
      if (dependsOnDigit) lastDeciding = read;
    }
    positions = next;
  }
  return lastDeciding + 1;
}
