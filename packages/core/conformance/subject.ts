import {
  createInternationalInputController,
  createNationalInputController,
  InputController,
  InputState,
  parsePhoneNumber,
  PhoneNumber,
  RegionCode,
} from '@telixon/core';
import { MethodResults } from '../oracle';

function toMethodResults(phoneNumber: PhoneNumber): MethodResults {
  return {
    isValid: phoneNumber.isValid(),
    isPossible: phoneNumber.isPossible(),
    isPossibleWithReason: phoneNumber.isPossibleWithReason(),
    getNumberType: phoneNumber.getNumberType(),
    getNationalNumber: phoneNumber.getNationalNumber(),
    getCallingCode: phoneNumber.getCallingCode(),
    getRegion: phoneNumber.getRegion(),
    formatE164: phoneNumber.formatE164(),
    formatNational: phoneNumber.formatNational(),
    formatInternational: phoneNumber.formatInternational(),
    formatRfc3966: phoneNumber.formatRfc3966(),
  };
}

// Telixon's verdict for every compared behavior, parsed under the same conditions as the oracle: international by default, national when `defaultRegion` is given.
export function evaluateWithTelixon(input: string, defaultRegion?: RegionCode): MethodResults {
  const phoneNumber: PhoneNumber =
    defaultRegion === undefined ? parsePhoneNumber(input) : parsePhoneNumber(input, { defaultRegion });
  return toMethodResults(phoneNumber);
}

// Telixon's live value after each input character, typed through the international controller (the real insert path), to compare against Google's formatter.
export function asYouTypeWithTelixon(input: string): string[] {
  const controller: InputController = createInternationalInputController({
    display: { callingCodeInInput: true, plusPrefix: 'fixed' },
  });

  let state: InputState = controller.currentState;
  const snapshots: string[] = [];
  for (const character of input) {
    state = controller.insert(state.value, character, state.selectionStart, state.selectionEnd);
    snapshots.push(state.value);
  }
  return snapshots;
}

// As asYouTypeWithTelixon, but through the national controller for a fixed region, to compare against Google in national mode.
export function asYouTypeNationalWithTelixon(region: RegionCode, input: string): string[] {
  const controller: InputController = createNationalInputController({ defaultRegion: region });

  let state: InputState = controller.currentState;
  const snapshots: string[] = [];
  for (const character of input) {
    state = controller.insert(state.value, character, state.selectionStart, state.selectionEnd);
    snapshots.push(state.value);
  }
  return snapshots;
}
