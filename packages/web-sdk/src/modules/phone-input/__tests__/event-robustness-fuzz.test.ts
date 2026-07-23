// @vitest-environment happy-dom

import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { NUMBER_TYPES, randomSource, REGIONS, type RandomSource } from './support/random';
import {
  caretViolation,
  consistencyViolation,
  createWebField,
  syncViolation,
  type WebField,
  type WebFieldConfig,
} from './support/web-field';

// Fires every beforeinput type the adapter handles, plus composition and the keyboard shortcuts, in
// random order. There is no controller to compare against here, since word and line deletes are the
// adapter's own translation. Instead it checks that the adapter never throws, the element stays in
// step with the reported state, the caret stays in range, and a valid number stays possible.

const SESSIONS = 800;
const OPERATIONS_PER_SESSION = 30;

const INSERT_TYPES = ['insertText', 'insertReplacementText', 'insertFromPaste', 'insertFromDrop', 'insertFromYank'];

const NON_INSERT_TYPES = [
  'deleteContentBackward',
  'deleteByCut',
  'deleteContent',
  'deleteByDrag',
  'deleteContentForward',
  'deleteWordBackward',
  'deleteWordForward',
  'deleteSoftLineBackward',
  'deleteHardLineBackward',
  'deleteSoftLineForward',
  'deleteHardLineForward',
  'deleteEntireSoftLine',
  'deleteEntireHardLine',
  'historyUndo',
  'historyRedo',
];

const DIGITS = ['5', '90', '415', '2', '0'];

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
    if (config.defaultRegion && random.chance(0.6)) {
      const seed: string = getExampleNumber(config.defaultRegion, 'MOBILE');
      field.setValue(seed);
      trail.push(`setValue(${seed})`);
    }

    for (let step = 0; step < OPERATIONS_PER_SESSION; step++) {
      const length: number = field.value.length;
      const start: number = random.upTo(length + 1);
      const end: number = Math.min(length, start + random.upTo(4));
      let label: string;

      try {
        switch (random.upTo(10)) {
          case 0:
          case 1:
          case 2: {
            const text: string = random.pick(DIGITS);
            const inputType: string = random.pick(INSERT_TYPES);
            label = `insert(${JSON.stringify(text)} as ${inputType} @${start}..${end})`;
            field.insert(text, inputType, start, end);
            break;
          }
          case 3:
          case 4:
          case 5:
          case 6: {
            const inputType: string = random.pick(NON_INSERT_TYPES);
            label = `${inputType} @${start}..${end}`;
            field.dispatchInputType(inputType, start, end);
            break;
          }
          case 7: {
            const text: string = random.pick(DIGITS);
            label = `composition(${JSON.stringify(text)} @${start}..${end})`;
            field.composition(text, start, end);
            break;
          }
          case 8: {
            if (random.chance(0.5)) {
              label = 'undoByKeyboard';
              field.undoByKeyboard();
            } else {
              label = 'redoByKeyboard';
              field.redoByKeyboard();
            }
            break;
          }
          default: {
            if (random.chance(0.4)) {
              const region = random.pick(REGIONS);
              label = `setRegion(${region})`;
              field.setRegion(region);
            } else if (random.chance(0.5)) {
              const regions = random.chance(0.3) ? null : [random.pick(REGIONS)];
              label = `setRegionFilter(${regions ? `[${regions.join(',')}]` : 'null'})`;
              field.setRegionFilter(regions);
            } else {
              const types = random.chance(0.3) ? null : [random.pick(NUMBER_TYPES)];
              label = `setNumberTypeFilter(${types ? `[${types.join(',')}]` : 'null'})`;
              field.setNumberTypeFilter(types);
            }
            break;
          }
        }
      } catch (error) {
        return fail(`${trail[trail.length - 1] ?? 'op'} threw: ${(error as Error).message}`);
      }

      trail.push(label);

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

describe('phone input event robustness fuzz', () => {
  it('holds under every handled event kind', () => {
    const failures: string[] = [];
    for (let session = 0; session < SESSIONS && failures.length === 0; session++) {
      const failure: string | null = runSession(session);
      if (failure !== null) failures.push(failure);
    }
    expect(failures).toEqual([]);
  });
});
