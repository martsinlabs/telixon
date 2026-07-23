import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import type { NumberType, RegionCode } from '../../../../engine';
import { parsePhoneNumber } from '../../../parse-phone-number';
import {
  caretViolation,
  createRandom,
  firstMethodDifference,
  INSERT_PAYLOADS,
  methodResults,
  NUMBER_TYPES,
  regionFilterViolation,
  REGIONS,
} from '../../__tests__/fuzz-support';
import type { InputState } from '../../models';

// Calls every public controller method in a random order and re-checks the invariants after each
// call. A session is seeded from its index. A failure prints the exact sequence that replays it.
//
// After every call a few things have to hold. The caret stays inside the value. Undo then redo
// comes back to the same value. setValue of the value already shown changes nothing. While no
// filter is set, getPhoneNumber answers exactly what parsePhoneNumber answers for that value.

type Controller = ReturnType<typeof createNationalInputController>;

const SESSIONS = 3000;
const OPERATIONS_PER_SESSION = 40;

function runSession(session: number): string | null {
  const random = createRandom(0x9e3779b9 ^ (session * 2654435761));
  const pick = <Item>(items: readonly Item[]): Item => items[Math.floor(random() * items.length)]!;
  const upTo = (bound: number): number => Math.floor(random() * bound);

  let region: RegionCode = pick(REGIONS);
  const strict: boolean = random() < 0.25;
  const controller: Controller = createNationalInputController({ defaultRegion: region, strict });
  const history: string[] = [`new(${region}, strict=${strict})`];
  let regionFilterActive = false;
  let numberTypeFilterActive = false;

  const fail = (reason: string): string => `session ${session}: ${reason}\n  after: ${history.join(' ')}`;

  for (let step = 0; step < OPERATIONS_PER_SESSION; step++) {
    const value: string = controller.currentState.value;
    const rangeStart: number = upTo(value.length + 1);
    const rangeEnd: number = Math.min(value.length, rangeStart + upTo(4));
    let state: InputState;
    let label: string;

    switch (upTo(13)) {
      case 0:
      case 1: {
        const payload: string = pick(INSERT_PAYLOADS);
        label = `insert(${JSON.stringify(payload)} @${rangeStart}..${rangeEnd})`;
        state = controller.insert(value, payload, rangeStart, rangeEnd);
        break;
      }
      case 2: {
        const digit: string = String(upTo(10));
        label = `insert(${digit} @${rangeStart})`;
        state = controller.insert(value, digit, rangeStart, rangeStart);
        break;
      }
      case 3: {
        label = `deleteBackward(${rangeStart}..${rangeEnd})`;
        state = controller.deleteBackward(value, rangeStart, rangeEnd);
        break;
      }
      case 4: {
        label = `deleteForward(${rangeStart}..${rangeEnd})`;
        state = controller.deleteForward(value, rangeStart, rangeEnd);
        break;
      }
      case 5: {
        label = `deleteBackward(${rangeStart})`;
        state = controller.deleteBackward(value, rangeStart, rangeStart);
        break;
      }
      case 6: {
        label = `deleteForward(${rangeStart})`;
        state = controller.deleteForward(value, rangeStart, rangeStart);
        break;
      }
      case 7: {
        const digits: string = Array.from({ length: upTo(14) }, () => String(upTo(10))).join('');
        label = `setValue(${JSON.stringify(digits)})`;
        state = controller.setValue(digits);
        break;
      }
      case 8: {
        // Setting the value the field already shows must change nothing.
        label = 'setValue(own value)';
        state = controller.setValue(value);
        if (state.value !== value) {
          return fail(`${label} rewrote ${JSON.stringify(value)} as ${JSON.stringify(state.value)}`);
        }
        break;
      }
      case 9: {
        region = pick(REGIONS);
        label = `setRegion(${region})`;
        state = controller.setRegion(region);
        break;
      }
      case 10: {
        if (random() < 0.35) {
          label = 'setRegionFilter(null)';
          state = controller.setRegionFilter(null);
          regionFilterActive = false;
        } else if (random() < 0.5) {
          const violation: string | null = regionFilterViolation(controller);
          label = 'regionFilter oracle';
          if (violation !== null) return fail(`${label}: ${violation}`);
          regionFilterActive = false;
          state = controller.currentState;
        } else {
          const regions: RegionCode[] = Array.from({ length: 1 + upTo(3) }, () => pick(REGIONS));
          label = `setRegionFilter([${regions.join(',')}])`;
          state = controller.setRegionFilter(regions);
          regionFilterActive = true;
        }
        break;
      }
      case 11: {
        if (random() < 0.35) {
          label = 'setNumberTypeFilter(null)';
          state = controller.setNumberTypeFilter(null);
          numberTypeFilterActive = false;
        } else {
          const types: NumberType[] = Array.from({ length: 1 + upTo(3) }, () => pick(NUMBER_TYPES));
          label = `setNumberTypeFilter([${types.join(',')}])`;
          state = controller.setNumberTypeFilter(types);
          numberTypeFilterActive = true;
        }
        break;
      }
      default: {
        if (random() < 0.2) {
          label = 'clearHistory()';
          controller.clearHistory();
          state = controller.currentState;
          break;
        }
        // Undo followed by redo must land back on the same value.
        const restored: string = controller.currentState.value;
        label = 'undo()+redo()';
        controller.undo();
        state = controller.redo();
        if (state.value !== restored) {
          return fail(`${label} turned ${JSON.stringify(restored)} into ${JSON.stringify(state.value)}`);
        }
        break;
      }
    }

    history.push(label);

    const caret: string | null = caretViolation(state);
    if (caret !== null) return fail(`${label} left ${caret}`);

    // parsePhoneNumber knows nothing about filters. Only compare while none is set.
    if (!regionFilterActive && !numberTypeFilterActive) {
      const difference: string | null = firstMethodDifference(
        methodResults(controller.getPhoneNumber()),
        methodResults(parsePhoneNumber(state.value, { defaultRegion: region, strict })),
      );
      if (difference !== null) {
        return fail(`${label} left getPhoneNumber disagreeing with parsePhoneNumber: ${difference}`);
      }
    }
  }

  return null;
}

describe('national controller method fuzz', () => {
  it('holds its invariants across randomised method combinations', () => {
    const failures: string[] = [];
    for (let session = 0; session < SESSIONS && failures.length === 0; session++) {
      const failure: string | null = runSession(session);
      if (failure !== null) failures.push(failure);
    }
    expect(failures).toEqual([]);
  });
});
