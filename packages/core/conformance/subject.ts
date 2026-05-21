import { createInternationalInputController, InputController, PhoneNumber } from '@telixon/core';
import { MethodResults } from './models';

// Telixon's verdict for every compared method, fed the E.164 number through the international controller.
export function evaluateWithTelixon(e164: string): MethodResults {
  const controller: InputController = createInternationalInputController({});
  controller.setValue(e164);

  const phoneNumber: PhoneNumber = controller.getPhoneNumber();
  return {
    isValid: phoneNumber.isValid(),
    isPossible: phoneNumber.isPossible(),
    isPossibleWithReason: phoneNumber.isPossibleWithReason(),
    getNumberType: phoneNumber.getNumberType(),
    getNationalNumber: phoneNumber.getNationalNumber(),
    getCallingCode: phoneNumber.getCallingCode(),
  };
}
