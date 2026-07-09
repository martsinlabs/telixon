import { ENGINE_DEAD, stepDigit } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { describe, expect, it } from 'vitest';
import { loadOracle } from '../oracle';
import { createAirtightEnumerator } from './airtight-enumerator';
import { geographicDomain } from './enumeration-domain';
import { decidingDigits, positionAfterCallingCode } from './number-reader';

// Proves "airtight": (1) every deciding-digit combination at every length, exactly once; (2) digits past
// the deciding point never change the outcome, so skipping them loses nothing.

const oracle = await loadOracle();
const { callingCodes } = geographicDomain(oracle);
const engine = getResourceProvider().engine;

describe('Airtight enumerator really is airtight', () => {
  // Completeness: independently brute-force the intended set (every deciding-digit value, padded), and
  // check the enumerator yields exactly that - each member once, nothing missing, nothing extra.
  it('yields every deciding-digit combination at every length, exactly once', () => {
    const sample = callingCodes.slice(0, 6);
    const minLength = 1;
    const maxLength = 3;
    const enumerator = createAirtightEnumerator(engine, sample, minLength, maxLength);

    const expected = new Set<string>();
    let expectedTotal = 0;
    for (const code of sample) {
      const afterCode = positionAfterCallingCode(engine, code);
      if (afterCode === ENGINE_DEAD) continue;
      const deciding = decidingDigits(engine, afterCode, maxLength + 1);
      for (let length = minLength; length <= maxLength; length++) {
        const decidingPart = Math.min(length, deciding);
        const filler = '0'.repeat(length - decidingPart);
        const combinations = 10 ** decidingPart;
        for (let value = 0; value < combinations; value++) {
          expected.add('+' + code + value.toString().padStart(decidingPart, '0') + filler);
        }
        expectedTotal += combinations;
      }
    }

    const produced: string[] = [];
    for (let index = 0; index < enumerator.total; index++) produced.push(enumerator.at(index));
    const producedSet = new Set(produced);

    expect(enumerator.total).toBe(expectedTotal); // the total count is exactly the number of combinations
    expect(produced.length).toBe(producedSet.size); // no number is produced twice
    expect(producedSet).toEqual(expected); // exactly the complete set: nothing missing, nothing extra
  });

  // Skipping trailing digits is safe: for the lowest-depth codes, brute-force every number past the
  // deciding point and confirm each ends exactly where its deciding-digit representative ends.
  it('trailing digits past the deciding point never change where the reader ends', () => {
    const finalPosition = (national: string, fromPosition: number): number => {
      let position = fromPosition;
      for (let index = 0; index < national.length && position !== ENGINE_DEAD; index++) {
        position = stepDigit(engine, position, national.charCodeAt(index) - 48);
      }
      return position;
    };

    const lowDepthCodes = callingCodes
      .map((code) => ({ code, afterCode: positionAfterCallingCode(engine, code) }))
      .filter((entry) => entry.afterCode !== ENGINE_DEAD)
      .map((entry) => ({ ...entry, deciding: decidingDigits(engine, entry.afterCode, 16) }))
      .filter((entry) => entry.deciding <= 2);

    expect(lowDepthCodes.length).toBeGreaterThan(0);

    let checked = 0;
    let mismatches = 0;
    for (const { afterCode, deciding } of lowDepthCodes) {
      const length = deciding + 3; // three digits past the deciding point, all of which must be irrelevant
      const everyNumber = 10 ** length;
      for (let value = 0; value < everyNumber; value++) {
        const national = value.toString().padStart(length, '0');
        const representative = national.slice(0, deciding) + '0'.repeat(length - deciding);
        if (finalPosition(national, afterCode) !== finalPosition(representative, afterCode)) mismatches++;
        checked++;
      }
    }

    console.log(
      `Checked ${checked.toLocaleString()} full numbers across ${lowDepthCodes.length} low-depth calling codes; trailing-digit mismatches: ${mismatches}`,
    );
    expect(mismatches).toBe(0);
  });
});
