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

// Telixon's verdict for every compared behavior, parsed from the E.164 number with the standalone parser.
export function evaluateWithTelixon(e164: string): MethodResults {
  const phoneNumber: PhoneNumber = parsePhoneNumber(e164);
  return {
    isValid: phoneNumber.isValid(),
    isPossible: phoneNumber.isPossible(),
    isPossibleWithReason: phoneNumber.isPossibleWithReason(),
    getNumberType: phoneNumber.getNumberType(),
    getNationalNumber: phoneNumber.getNationalNumber(),
    getCallingCode: phoneNumber.getCallingCode(),
    getCountry: phoneNumber.getCountry(),
    getE164: phoneNumber.getE164(),
    formatNational: phoneNumber.formatNational(),
    formatInternational: phoneNumber.formatInternational(),
    getURI: phoneNumber.getURI(),
  };
}

// Telixon's live value after each input character of `input`, typed one character at a time through the
// international controller: the real as-you-type path (insert), to compare against Google's formatter.
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

// As asYouTypeWithTelixon, but through the national controller for a fixed country: typing the national
// number (national prefix + NSN) one character at a time, to compare against Google in national mode.
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
