import { createInternationalInputController, InputController, PhoneNumber } from '@telixon/core';
import { MethodResults } from './models';

// Telixon's verdict for every compared behavior, fed the E.164 number through the international controller.
// plusPrefix renders the controller's live value as '+<calling code> <national>', matching the oracle.
export function evaluateWithTelixon(e164: string): MethodResults {
  const controller: InputController = createInternationalInputController({
    display: { callingCodeInInput: true, plusPrefix: true },
  });
  controller.setValue(e164);

  const phoneNumber: PhoneNumber = controller.getPhoneNumber();
  return {
    isValid: phoneNumber.isValid(),
    isPossible: phoneNumber.isPossible(),
    isPossibleWithReason: phoneNumber.isPossibleWithReason(),
    getNumberType: phoneNumber.getNumberType(),
    getNationalNumber: phoneNumber.getNationalNumber(),
    getCallingCode: phoneNumber.getCallingCode(),
    getE164: phoneNumber.getE164(),
    formatInternational: phoneNumber.formatInternational(),
    formatAsYouType: controller.currentState.value,
  };
}
