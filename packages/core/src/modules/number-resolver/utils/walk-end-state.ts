import { ENGINE_DEAD, Engine, walkDigit } from '@telixon/core/engine';

// Deepest non-dead state of walking `digits` from `startState` (startState itself if the first transition dies).
export function walkEndState(core: Engine, startState: number, digits: string): number {
  let endState: number = startState;
  let state: number = startState;
  for (let i = 0; i < digits.length; i++) {
    state = walkDigit(core, state, digits.charCodeAt(i) - 48);
    if (state === ENGINE_DEAD) break;
    endState = state;
  }
  return endState;
}
