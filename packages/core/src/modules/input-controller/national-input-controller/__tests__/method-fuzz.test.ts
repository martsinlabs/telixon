import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';
import type { NumberType, RegionCode } from '../../../../engine';
import { getCallingCodeForRegion } from '../../../calling-code-for-region';
import { parsePhoneNumber } from '../../../parse-phone-number';
import type { PhoneNumber } from '../../../phone-number';
import type { InputState } from '../../models';

// Calls every public controller method in a random order and re-checks the invariants after each
// call. A session is seeded from its index, so a failure prints the exact sequence that replays it.
//
// Invariants: the caret stays inside the value, undo then redo returns the same value, setValue of
// the shown value changes nothing, and with no filter active getPhoneNumber answers exactly what
// parsePhoneNumber answers for the shown value.

type Controller = ReturnType<typeof createNationalInputController>;

const SESSIONS = 3000;
const OPERATIONS_PER_SESSION = 40;

// Regions chosen to cover the hard cases. AR writes extra digits into the display, BY and BR hide
// a typed digit, US and CA share one calling code. The rest are ordinary formats.
const REGIONS: readonly RegionCode[] = [
  'US',
  'CA',
  'GB',
  'AR',
  'BY',
  'BR',
  'DE',
  'FR',
  'IT',
  'ES',
  'MX',
  'RU',
  'UA',
  'AU',
  'NL',
  'PL',
  'JP',
  'IN',
  'ZA',
  'SE',
];

const NUMBER_TYPES: readonly NumberType[] = [
  'FIXED_LINE',
  'MOBILE',
  'FIXED_LINE_OR_MOBILE',
  'TOLL_FREE',
  'PREMIUM_RATE',
  'VOIP',
  'PAGER',
  'UAN',
];

// Bare digits, formatted text, a leading plus, and non-digit noise all reach a real field.
const INSERT_PAYLOADS: readonly string[] = [
  '5',
  '12',
  '007',
  '15',
  '+549',
  '(201) 555',
  '+44 20',
  '  9-9 ',
  '00',
  'abc',
  '+',
  '() -',
  '99999999999999',
];

const COMPARED_METHODS = [
  'isValid',
  'isPossible',
  'isPossibleWithReason',
  'getNumberType',
  'getNationalNumber',
  'getCallingCode',
  'getRegion',
  'formatE164',
  'formatNational',
  'formatInternational',
  'formatRfc3966',
] as const;

/** Deterministic generator so any failure replays from its session index alone. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function methodResults(phoneNumber: PhoneNumber): Record<string, string> {
  const results: Record<string, string> = {};
  const callable = phoneNumber as unknown as Record<string, () => unknown>;
  for (const method of COMPARED_METHODS) results[method] = String(callable[method]!());
  return results;
}

function firstMethodDifference(actual: Record<string, string>, expected: Record<string, string>): string | null {
  for (const method of COMPARED_METHODS) {
    if (actual[method] !== expected[method]) return `${method} is ${actual[method]}, expected ${expected[method]}`;
  }
  return null;
}

function caretViolation(state: InputState): string | null {
  const { value, selectionStart, selectionEnd } = state;
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd)) return 'caret is not an integer';
  if (selectionStart < 0 || selectionStart > selectionEnd) return `caret range ${selectionStart}..${selectionEnd}`;
  if (selectionEnd > value.length) return `caret ${selectionEnd} past ${JSON.stringify(value)}`;
  return null;
}

/** A region whose calling code differs, so a number of `callingCode` cannot be valid under it. */
function regionWithForeignCallingCode(callingCode: string | null): RegionCode {
  for (const region of REGIONS) {
    if (getCallingCodeForRegion(region) !== callingCode) return region;
  }
  return REGIONS[0]!;
}

/**
 * Checks two things about the region filter. Filtering to the region the number already resolved to
 * must change nothing. Filtering to a region with a different calling code must make it invalid.
 * Leaves the filter cleared on every path.
 */
function regionFilterViolation(controller: Controller): string | null {
  // Clear first so the baseline is the unfiltered answer.
  controller.setRegionFilter(null);
  const before: PhoneNumber = controller.getPhoneNumber();
  const resolvedRegion: RegionCode | null = before.getRegion();
  const baseline: Record<string, string> = methodResults(before);
  let violation: string | null = null;

  if (resolvedRegion !== null) {
    controller.setRegionFilter([resolvedRegion]);
    const admittedDifference: string | null = firstMethodDifference(
      methodResults(controller.getPhoneNumber()),
      baseline,
    );

    const foreignRegion: RegionCode = regionWithForeignCallingCode(before.getCallingCode());
    controller.setRegionFilter([foreignRegion]);
    const survivesExclusion: boolean = controller.getPhoneNumber().isValid();

    if (admittedDifference !== null) {
      violation = `filter [${resolvedRegion}] changed the resolution: ${admittedDifference}`;
    } else if (survivesExclusion) {
      violation = `filter [${foreignRegion}] left a ${resolvedRegion} number valid`;
    }
  }

  controller.setRegionFilter(null);
  return violation;
}

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

    // parsePhoneNumber knows nothing about filters, so only compare while none is set.
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
