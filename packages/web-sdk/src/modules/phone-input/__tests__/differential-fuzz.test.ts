// @vitest-environment happy-dom

import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { INSERT_PAYLOADS, NUMBER_TYPES, randomSource, REGIONS, type RandomSource } from './support/random';
import {
  caretViolation,
  consistencyViolation,
  createWebField,
  differentialViolation,
  syncViolation,
  type WebField,
  type WebFieldConfig,
} from './support/web-field';

// The adapter's beforeinput handler passes what it reads off the element straight to the controller.
// So the same operation driven through DOM events must land where the controller lands when driven
// through its methods. Every pass-through operation feeds both, and the two are compared after each.

const SESSIONS = 800;
const OPERATIONS_PER_SESSION = 30;
const INSERT_INPUT_TYPES = ['insertText', 'insertFromPaste', 'insertReplacementText', 'insertFromDrop'];

function sessionConfig(random: RandomSource): WebFieldConfig {
  const strict: boolean = random.chance(0.25);
  if (random.chance(0.5)) return { mode: 'national', defaultRegion: random.pick(REGIONS), strict };
  if (random.chance(0.5)) {
    return {
      mode: 'international',
      defaultRegion: random.pick(REGIONS),
      display: { callingCodeInInput: false },
      strict,
    };
  }
  const plusPrefix = random.pick(['none', 'fixed', 'erasable'] as const);
  return { mode: 'international', display: { callingCodeInInput: true, plusPrefix }, strict };
}

function runSession(session: number): string | null {
  const random: RandomSource = randomSource(session);
  const config: WebFieldConfig = sessionConfig(random);
  const field: WebField = createWebField(config);
  const trail: string[] = [JSON.stringify(config)];

  const fail = (reason: string): string => `session ${session}: ${reason}\n  after: ${trail.join(' ')}`;

  try {
    // Most sessions start from a real number for the region, so the caret has structure to move over.
    if (config.defaultRegion && random.chance(0.6)) {
      const seed: string = getExampleNumber(config.defaultRegion, 'MOBILE');
      field.setValue(seed);
      trail.push(`setValue(${seed})`);
    }

    for (let step = 0; step < OPERATIONS_PER_SESSION; step++) {
      const length: number = field.value.length;
      const start: number = random.upTo(length + 1);
      const end: number = Math.min(length, start + random.upTo(4));

      switch (random.upTo(9)) {
        case 0:
        case 1: {
          const text: string = random.pick(INSERT_PAYLOADS);
          const inputType: string = random.pick(INSERT_INPUT_TYPES);
          trail.push(`insert(${JSON.stringify(text)} as ${inputType} @${start}..${end})`);
          field.insert(text, inputType, start, end);
          break;
        }
        case 2: {
          trail.push(`deleteBackward(${start}..${end})`);
          field.deleteBackward(start, end);
          break;
        }
        case 3: {
          trail.push(`deleteForward(${start}..${end})`);
          field.deleteForward(start, end);
          break;
        }
        case 4: {
          trail.push('undoByKeyboard');
          field.undoByKeyboard();
          break;
        }
        case 5: {
          trail.push('redoByKeyboard');
          field.redoByKeyboard();
          break;
        }
        case 6: {
          const digits: string = Array.from({ length: random.upTo(12) }, () => String(random.upTo(10))).join('');
          trail.push(`setValue(${JSON.stringify(digits)})`);
          field.setValue(digits);
          break;
        }
        case 7: {
          if (random.chance(0.5)) {
            const regions = random.chance(0.3) ? null : [random.pick(REGIONS), random.pick(REGIONS)];
            trail.push(`setRegionFilter(${regions ? `[${regions.join(',')}]` : 'null'})`);
            field.setRegionFilter(regions);
          } else {
            const types = random.chance(0.3) ? null : [random.pick(NUMBER_TYPES)];
            trail.push(`setNumberTypeFilter(${types ? `[${types.join(',')}]` : 'null'})`);
            field.setNumberTypeFilter(types);
          }
          break;
        }
        default: {
          const region = random.pick(REGIONS);
          trail.push(`setRegion(${region})`);
          field.setRegion(region);
          break;
        }
      }

      const label: string = trail[trail.length - 1]!;
      const differential: string | null = differentialViolation(field);
      if (differential !== null) return fail(`${label}: element diverged from the controller: ${differential}`);
      const sync: string | null = syncViolation(field);
      if (sync !== null) return fail(`${label}: ${sync}`);
      const caret: string | null = caretViolation(field);
      if (caret !== null) return fail(`${label}: ${caret}`);
      const consistency: string | null = consistencyViolation(field);
      if (consistency !== null) return fail(`${label}: the number is ${consistency}`);
    }
  } finally {
    field.destroy();
  }

  return null;
}

describe('phone input differential fuzz', () => {
  it('drives DOM events and controller methods to the same state', () => {
    const failures: string[] = [];
    for (let session = 0; session < SESSIONS && failures.length === 0; session++) {
      const failure: string | null = runSession(session);
      if (failure !== null) failures.push(failure);
    }
    expect(failures).toEqual([]);
  });
});
