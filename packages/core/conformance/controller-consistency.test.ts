import {
  createInternationalInputController,
  createNationalInputController,
  getCallingCodeForRegion,
  InputController,
  InputState,
  parsePhoneNumber,
  PhoneNumber,
} from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { loadOracle } from '../oracle';
import { geographicDomain } from './enumeration-domain';
import { COMPARED_METHODS, MethodName } from './models';
import { createNumberEnumerator } from './number-enumerator';

// The input controllers and parsePhoneNumber must share one resolve pipeline: getPhoneNumber has to
// equal parsePhoneNumber of the controller's displayed value. parsePhoneNumber is the Google-verified
// path, so this transitively holds the controllers to the same parity.

const oracle = await loadOracle();
const { regions, callingCodes } = geographicDomain(oracle);

function typeInto(controller: InputController, input: string): InputState {
  let state: InputState = controller.currentState;
  for (const character of input) {
    state = controller.insert(state.value, character, state.selectionStart, state.selectionEnd);
  }
  return state;
}

function collectDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function methods(phoneNumber: PhoneNumber): Record<string, string> {
  const values: Record<string, string> = {};
  for (const method of COMPARED_METHODS as readonly MethodName[]) {
    values[method] = String((phoneNumber as unknown as Record<string, () => unknown>)[method]!());
  }
  return values;
}

describe('Input controllers resolve identically to parsePhoneNumber', () => {
  it('getPhoneNumber equals parsePhoneNumber of the displayed value across enumerated inputs', () => {
    const enumerator = createNumberEnumerator({ callingCodes, regions, minLength: 5, maxLength: 14 });
    const count = 100_000;
    for (let index = 0; index < count; index++) {
      const number = enumerator.at(index);
      const controller: InputController =
        number.region === undefined
          ? createInternationalInputController({})
          : createNationalInputController({ defaultRegion: number.region });

      const state: InputState = typeInto(controller, number.input);
      const options = number.region === undefined ? undefined : { defaultRegion: number.region };

      expect(methods(controller.getPhoneNumber())).toEqual(methods(parsePhoneNumber(state.value, options)));
    }
  }, 120_000);

  // The literal selector read equals parsePhoneNumber of the calling code plus the displayed value;
  // when parse leniency drops leading digits and rescues the number, it answers NATIONAL_PREFIX_PRESENT instead.
  it('selector-mode getPhoneNumber holds the literal-read contract against parsePhoneNumber', () => {
    const enumerator = createNumberEnumerator({ callingCodes, regions, minLength: 5, maxLength: 14 });
    const count = 100_000;
    for (let index = 0; index < count; index++) {
      const number = enumerator.at(index);
      if (number.region === undefined) continue;

      const controller: InputController = createInternationalInputController({
        defaultRegion: number.region,
        display: { callingCodeInInput: false },
      });

      const state: InputState = typeInto(controller, number.input);
      const literalDigits: string = collectDigits(state.value);
      const callingCode: string = getCallingCodeForRegion(number.region);
      const parsed: PhoneNumber = parsePhoneNumber(`+${callingCode}${state.value}`);
      const literal: PhoneNumber = controller.getPhoneNumber();
      const literalError = literal.getValidationError();

      // The literal read never rewrites the typed digits.
      expect(literal.getNationalNumber()).toBe(literalDigits);

      // Soundness: the reported prefix plus the parse-side number reconstructs the typed digits exactly.
      if (literalError?.kind === 'NATIONAL_PREFIX_PRESENT') {
        expect(literal.isValid()).toBe(false);
        expect(parsed.isValid()).toBe(true);
        expect(literalError.prefix + parsed.getNationalNumber()).toBe(literalDigits);
      }

      if (parsed.getNationalNumber() === literalDigits) {
        expect(methods(literal)).toEqual(methods(parsed));
      } else if (!literal.isValid() && parsed.isValid() && literalDigits.endsWith(parsed.getNationalNumber())) {
        expect(literalError?.kind).toBe('NATIONAL_PREFIX_PRESENT');
      } else {
        expect(literalError === null).toBe(literal.isValid());
      }
    }
  }, 120_000);
});
