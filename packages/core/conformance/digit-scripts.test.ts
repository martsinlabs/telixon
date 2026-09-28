import {
  ensureEngineReady,
  getCallingCodeForRegion,
  getPlaceholders,
  parsePhoneNumber,
  REGION_CODES,
} from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { loadOracle } from '../oracle';
import { COMPARED_METHODS, MethodName } from './models';

// A clipboard carries the digits of the page it came from. Google maps three non-ASCII scripts in
// DIGIT_MAPPINGS and reads no others; every region's example is compared in all four.

await ensureEngineReady();
const oracle = await loadOracle();

const SCRIPTS = [
  { name: 'fullwidth', zero: 0xff10, mapped: true },
  { name: 'arabic-indic', zero: 0x0660, mapped: true },
  { name: 'extended arabic-indic', zero: 0x06f0, mapped: true },
  { name: 'devanagari', zero: 0x0966, mapped: false },
] as const;

function inScript(digits: string, zero: number): string {
  let written = '';
  for (const digit of digits) written += String.fromCharCode(zero + Number(digit));
  return written;
}

function telixonAnswers(input: string): Record<string, string> {
  const number = parsePhoneNumber(input);
  const answers: Record<string, string> = {};
  for (const method of COMPARED_METHODS as readonly MethodName[]) {
    answers[method] = String((number as unknown as Record<string, () => unknown>)[method]!());
  }
  return answers;
}

describe('Digit scripts resolve exactly like Google', () => {
  it('answers every region example written in each script the way Google answers it', () => {
    let compared = 0;
    let rejected = 0;

    for (const region of REGION_CODES) {
      const example: string | undefined =
        getPlaceholders(region, 'MOBILE')?.international ?? getPlaceholders(region, 'FIXED_LINE')?.international;
      if (example === undefined) continue;
      const digits = `${getCallingCodeForRegion(region)}${example.replace(/\D/g, '')}`;

      for (const script of SCRIPTS) {
        const input = `+${inScript(digits, script.zero)}`;
        const theirs = oracle.evaluate(input);
        const ours = telixonAnswers(input);

        if (theirs === null) {
          // Google rejects the input, so the script is one it does not read; neither do we.
          expect(script.mapped, `${region} ${script.name}`).toBe(false);
          expect(ours['isValid'], `${region} ${script.name}`).toBe('false');
          rejected++;
          continue;
        }

        for (const method of COMPARED_METHODS as readonly MethodName[]) {
          expect(ours[method], `${region} ${script.name} ${method}`).toBe(String(theirs[method]));
        }
        compared++;
      }
    }

    expect(compared).toBeGreaterThan(400);
    expect(rejected).toBeGreaterThan(200);
  }, 120_000);
});
