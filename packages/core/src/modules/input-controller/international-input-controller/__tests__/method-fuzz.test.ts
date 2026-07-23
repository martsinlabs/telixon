import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '..';
import type { NumberType, RegionCode } from '../../../../engine';
import { parsePhoneNumber } from '../../../parse-phone-number';
import {
  caretViolation,
  createRandom,
  digitsOf,
  firstMethodDifference,
  INSERT_PAYLOADS,
  methodResults,
  NUMBER_TYPES,
  REGIONS,
} from '../../__tests__/fuzz-support';
import type { InputState } from '../../models';
import type { PlusPrefixMode } from '../models';

// Calls every public controller method in a random order and re-checks the invariants after each
// call. A session is seeded from its index. A failure prints the exact sequence that replays it.
//
// The two display modes answer different questions. With the calling code in the field the value
// carries it, and getPhoneNumber must equal parsePhoneNumber of that value. In selector mode the
// field holds only the significant number, and getPhoneNumber reads it literally, so the check
// there is that the reported national number is exactly the digits on screen.

type Controller = ReturnType<typeof createInternationalInputController>;

const SESSIONS = 3000;
const OPERATIONS_PER_SESSION = 40;

const PLUS_PREFIXES: readonly PlusPrefixMode[] = ['none', 'fixed', 'erasable'];

function runSession(session: number): string | null {
  const random = createRandom(0x85ebca6b ^ (session * 2246822519));
  const pick = <Item>(items: readonly Item[]): Item => items[Math.floor(random() * items.length)]!;
  const upTo = (bound: number): number => Math.floor(random() * bound);

  const selectorMode: boolean = random() < 0.35;
  let region: RegionCode = pick(REGIONS);
  const plusPrefix: PlusPrefixMode = pick(PLUS_PREFIXES);

  const controller: Controller = selectorMode
    ? createInternationalInputController({ defaultRegion: region, display: { callingCodeInInput: false } })
    : createInternationalInputController({ display: { callingCodeInInput: true, plusPrefix } });

  const opening: string = selectorMode ? `selector(${region})` : `callingCode(plus=${plusPrefix})`;
  const history: string[] = [`new ${opening}`];
  // getPhoneNumber resolves with hasLeadingPlus and a default region together. parsePhoneNumber
  // cannot express that pair, since its defaultRegion option makes it read the value as a national
  // number instead. Once setRegion anchors the controller, the parser stops being a valid oracle.
  let comparableToParser = true;
  let regionFilterActive = false;
  let numberTypeFilterActive = false;

  const fail = (reason: string): string => `session ${session}: ${reason}\n  after: ${history.join(' ')}`;

  for (let step = 0; step < OPERATIONS_PER_SESSION; step++) {
    const value: string = controller.currentState.value;
    const rangeStart: number = upTo(value.length + 1);
    const rangeEnd: number = Math.min(value.length, rangeStart + upTo(4));
    let state: InputState;
    let label: string;

    switch (upTo(12)) {
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
        const digits: string = Array.from({ length: upTo(15) }, () => String(upTo(10))).join('');
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
        comparableToParser = false;
        label = `setRegion(${region})`;
        state = controller.setRegion(region);
        break;
      }
      case 10: {
        if (random() < 0.4) {
          label = 'setRegionFilter(null)';
          state = controller.setRegionFilter(null);
          regionFilterActive = false;
        } else {
          const regions: RegionCode[] = Array.from({ length: 1 + upTo(3) }, () => pick(REGIONS));
          label = `setRegionFilter([${regions.join(',')}])`;
          state = controller.setRegionFilter(regions);
          regionFilterActive = true;
        }
        break;
      }
      default: {
        if (random() < 0.3) {
          if (random() < 0.4) {
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

    if (selectorMode) {
      // The literal read never rewrites what the field shows.
      const reported: string = controller.getPhoneNumber().getNationalNumber();
      if (reported !== digitsOf(state.value)) {
        return fail(`${label} reported ${reported} for a field showing ${JSON.stringify(state.value)}`);
      }
      continue;
    }

    // getPhoneNumber reads the field as an international number, with the calling code inside it.
    // That is exactly what parsePhoneNumber does with no options. Three cases are left out. Filters
    // narrow validity the parser knows nothing about. An empty field resolves to nothing by design.
    // An anchored region is covered by the comment on comparableToParser.
    if (comparableToParser && !regionFilterActive && !numberTypeFilterActive && digitsOf(state.value) !== '') {
      const difference: string | null = firstMethodDifference(
        methodResults(controller.getPhoneNumber()),
        methodResults(parsePhoneNumber(state.value)),
      );
      if (difference !== null) {
        return fail(`${label} left getPhoneNumber disagreeing with parsePhoneNumber: ${difference}`);
      }
    }
  }

  return null;
}

describe('international controller method fuzz', () => {
  it('holds its invariants across randomised method combinations', () => {
    const failures: string[] = [];
    for (let session = 0; session < SESSIONS && failures.length === 0; session++) {
      const failure: string | null = runSession(session);
      if (failure !== null) failures.push(failure);
    }
    expect(failures).toEqual([]);
  });
});
