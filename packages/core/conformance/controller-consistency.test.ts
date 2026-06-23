import {
  createInternationalInputController,
  createNationalInputController,
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
        number.country === undefined
          ? createInternationalInputController({})
          : createNationalInputController({ country: number.country });

      const state: InputState = typeInto(controller, number.input);
      const options = number.country === undefined ? undefined : { defaultCountry: number.country };

      expect(methods(controller.getPhoneNumber())).toEqual(methods(parsePhoneNumber(state.value, options)));
    }
  }, 120_000);
});
