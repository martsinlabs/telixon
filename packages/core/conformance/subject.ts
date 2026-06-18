import {
  createInternationalInputController,
  createNationalInputController,
  InputController,
  InputState,
  parsePhoneNumber,
  PhoneNumber,
  RegionId,
} from '@telixon/core';
import { MethodResults } from '../oracle';

// Telixon's verdict for every compared behavior, parsed under the same conditions as the oracle: international by default, national when `defaultCountry` is given.
export function evaluateWithTelixon(input: string, defaultCountry?: RegionId): MethodResults {
  const phoneNumber: PhoneNumber =
    defaultCountry === undefined ? parsePhoneNumber(input) : parsePhoneNumber(input, { defaultCountry });
  return {
    isValid: phoneNumber.isValid(),
    isPossible: phoneNumber.isPossible(),
    isPossibleWithReason: phoneNumber.isPossibleWithReason(),
    getNumberType: phoneNumber.getNumberType(),
    getNationalNumber: phoneNumber.getNationalNumber(),
    getCallingCode: phoneNumber.getCallingCode(),
    getCountry: phoneNumber.getCountry(),
    formatE164: phoneNumber.formatE164(),
    formatNational: phoneNumber.formatNational(),
    formatInternational: phoneNumber.formatInternational(),
    formatRfc3966: phoneNumber.formatRfc3966(),
  };
}

// Telixon's live value after each input character, typed through the international controller (the real insert path), to compare against Google's formatter.
export function asYouTypeWithTelixon(input: string): string[] {
  const controller: InputController = createInternationalInputController({
    display: { callingCodeInInput: true, plusPrefix: true },
  });

  let state: InputState = controller.currentState;
  const snapshots: string[] = [];
  for (const character of input) {
    state = controller.insert(state.value, character, state.selectionStart, state.selectionEnd);
    snapshots.push(state.value);
  }
  return snapshots;
}

// As asYouTypeWithTelixon, but through the national controller for a fixed country, to compare against Google in national mode.
export function asYouTypeNationalWithTelixon(country: RegionId, input: string): string[] {
  const controller: InputController = createNationalInputController({ country });

  let state: InputState = controller.currentState;
  const snapshots: string[] = [];
  for (const character of input) {
    state = controller.insert(state.value, character, state.selectionStart, state.selectionEnd);
    snapshots.push(state.value);
  }
  return snapshots;
}
