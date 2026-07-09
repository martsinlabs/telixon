import { ENGINE_DEAD, Engine, stepDigit } from '@telixon/core/engine';

// The engine reads a number digit by digit, moving through internal positions (stepDigit advances one;
// ENGINE_DEAD is a dead end). Two questions about that reader build every test number set.

// Position the reader lands on after the calling code, where national digits begin; ENGINE_DEAD if invalid.
export function positionAfterCallingCode(engine: Engine, callingCode: string): number {
  let position = 0;
  for (let index = 0; index < callingCode.length; index++) {
    position = stepDigit(engine, position, callingCode.charCodeAt(index) - 48);
    if (position === ENGINE_DEAD) return ENGINE_DEAD;
  }
  return position;
}

// How many leading national digits decide the case. The frontier holds every position the reader can
// occupy at a given depth. A depth is deciding while some frontier position reacts to the digit's
// value (different digits reach different targets); past the last deciding depth every digit moves
// the reader the same way, so only the count of remaining digits matters. `maxDigits` caps the search.
export function decidingDigits(engine: Engine, fromPosition: number, maxDigits: number): number {
  let frontier = new Set<number>([fromPosition]);
  let lastDecidingDepth = -1;
  for (let depth = 0; depth < maxDigits && frontier.size > 0; depth++) {
    const nextFrontier = new Set<number>();
    for (const position of frontier) {
      if (position === ENGINE_DEAD) continue;
      let firstTarget: number | null = null;
      let digitMatters = false;
      for (let digit = 0; digit < 10; digit++) {
        const target = stepDigit(engine, position, digit);
        if (firstTarget === null) firstTarget = target;
        else if (target !== firstTarget) digitMatters = true;
        if (target !== ENGINE_DEAD) nextFrontier.add(target);
      }
      if (digitMatters) lastDecidingDepth = depth;
    }
    frontier = nextFrontier;
  }
  return lastDecidingDepth + 1;
}
