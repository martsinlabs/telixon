import { describe, expect, it } from 'vitest';
import { createInternationalInputController } from '..';
import type { NumberType, RegionCode } from '../../../../engine';
import { getCallingCodeForRegion } from '../../../calling-code-for-region';
import { parsePhoneNumber } from '../../../parse-phone-number';
import {
  caretViolation,
  consistencyViolation,
  createRandom,
  digitsOf,
  filterMonotonicityViolation,
  firstMethodDifference,
  INSERT_PAYLOADS,
  methodResults,
  NUMBER_TYPES,
  numberTypeFilterViolation,
  regionFilterViolation,
  REGIONS,
} from '../../__tests__/fuzz-support';
import type { InputState } from '../../models';
import type { PlusPrefixMode } from '../models';

// Calls every public controller method in a random order and re-checks the invariants after each
// call. A session is seeded from its index. A failure prints the exact sequence that replays it.
//
// The two modes need different checks. When the calling code sits in the field, the value is the
// whole number. parsePhoneNumber of it has to give the same answers. In selector mode the field
// holds only the significant part. The calling code then comes from the selected region.

type Controller = ReturnType<typeof createInternationalInputController>;

const SESSIONS = 3000;
const OPERATIONS_PER_SESSION = 40;

const PLUS_PREFIXES: readonly PlusPrefixMode[] = ['none', 'fixed', 'erasable'];

// getPhoneNumber always reads the field as an international number. The field does not always show
// the plus. Adding it back lets parsePhoneNumber read the value the same way.
const forcedPlus = (value: string): string => (value.startsWith('+') ? value : `+${value}`);

function runSession(session: number): string | null {
  const random = createRandom(0x85ebca6b ^ (session * 2246822519));
  const pick = <Item>(items: readonly Item[]): Item => items[Math.floor(random() * items.length)]!;
  const upTo = (bound: number): number => Math.floor(random() * bound);

  const selectorMode: boolean = random() < 0.35;
  // getPhoneNumber reads the field with a forced plus and a default region at once. No single
  // parsePhoneNumber call can do both. Without options it cannot see the region. With defaultRegion
  // it reads the value as a national number instead. That is why a calling-code session picks a
  // side. It either moves the region around or keeps comparing against the parser.
  const anchoredSession: boolean = random() < 0.4;
  let region: RegionCode = pick(REGIONS);
  const plusPrefix: PlusPrefixMode = pick(PLUS_PREFIXES);

  const controller: Controller = selectorMode
    ? createInternationalInputController({ defaultRegion: region, display: { callingCodeInInput: false } })
    : createInternationalInputController({ display: { callingCodeInInput: true, plusPrefix } });

  const opening: string = selectorMode ? `selector(${region})` : `callingCode(plus=${plusPrefix})`;
  const history: string[] = [`new ${opening}`];
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
        if (!selectorMode && !anchoredSession) {
          const digit: string = String(upTo(10));
          label = `insert(${digit} @${rangeStart})`;
          state = controller.insert(value, digit, rangeStart, rangeStart);
          break;
        }
        region = pick(REGIONS);
        label = `setRegion(${region})`;
        state = controller.setRegion(region);
        break;
      }
      case 10: {
        if (random() < 0.3) {
          label = 'setRegionFilter(null)';
          state = controller.setRegionFilter(null);
          regionFilterActive = false;
        } else if (random() < 0.5) {
          const violation: string | null = regionFilterViolation(controller);
          label = 'regionFilter oracle';
          if (violation !== null) return fail(`${label}: ${violation}`);
          regionFilterActive = false;
          numberTypeFilterActive = false;
          state = controller.currentState;
        } else if (random() < 0.35) {
          const first: RegionCode[] = Array.from({ length: 1 + upTo(2) }, () => pick(REGIONS));
          const second: RegionCode[] = Array.from({ length: 1 + upTo(2) }, () => pick(REGIONS));
          const violation: string | null = filterMonotonicityViolation<RegionCode>(
            controller,
            'region',
            (values) => controller.setRegionFilter(values),
            first,
            second,
          );
          label = 'regionFilter monotonicity';
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
      default: {
        if (random() < 0.3) {
          const roll: number = random();
          if (roll < 0.3) {
            label = 'setNumberTypeFilter(null)';
            state = controller.setNumberTypeFilter(null);
            numberTypeFilterActive = false;
          } else if (roll < 0.5) {
            const violation: string | null = numberTypeFilterViolation(controller);
            label = 'numberTypeFilter oracle';
            if (violation !== null) return fail(`${label}: ${violation}`);
            numberTypeFilterActive = false;
            state = controller.currentState;
          } else if (roll < 0.65) {
            const first: NumberType[] = Array.from({ length: 1 + upTo(2) }, () => pick(NUMBER_TYPES));
            const second: NumberType[] = Array.from({ length: 1 + upTo(2) }, () => pick(NUMBER_TYPES));
            const violation: string | null = filterMonotonicityViolation<NumberType>(
              controller,
              'number type',
              (values) => controller.setNumberTypeFilter(values),
              first,
              second,
            );
            label = 'numberTypeFilter monotonicity';
            if (violation !== null) return fail(`${label}: ${violation}`);
            numberTypeFilterActive = false;
            state = controller.currentState;
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

    const inconsistency: string | null = consistencyViolation(controller.getPhoneNumber());
    if (inconsistency !== null) return fail(`${label} left the number ${inconsistency}`);

    if (selectorMode) {
      const literal = controller.getPhoneNumber();
      const shownDigits: string = digitsOf(state.value);

      // The literal read never rewrites what the field shows.
      if (literal.getNationalNumber() !== shownDigits) {
        return fail(
          `${label} reported ${literal.getNationalNumber()} for a field showing ${JSON.stringify(state.value)}`,
        );
      }

      // Behind the selected region's calling code the parser sees the same number. Its leniency
      // sometimes drops digits. The two then describe different numbers, and there is nothing to
      // compare.
      if (!regionFilterActive && !numberTypeFilterActive && shownDigits !== '') {
        const parsed = parsePhoneNumber(`+${getCallingCodeForRegion(region)}${state.value}`);
        if (parsed.getNationalNumber() === shownDigits) {
          const difference: string | null = firstMethodDifference(methodResults(literal), methodResults(parsed));
          if (difference !== null) {
            return fail(`${label} left the literal read disagreeing with parsePhoneNumber: ${difference}`);
          }
        }
      }
      continue;
    }

    // Some states have nothing to compare against. An anchored session has no sound oracle, as
    // noted above. A filter narrows validity in a way the parser cannot know about. An empty field
    // resolves to nothing on purpose, while the parser would still answer from the region.
    if (!anchoredSession && !regionFilterActive && !numberTypeFilterActive && digitsOf(state.value) !== '') {
      const difference: string | null = firstMethodDifference(
        methodResults(controller.getPhoneNumber()),
        methodResults(parsePhoneNumber(forcedPlus(state.value))),
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
