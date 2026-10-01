import type { ValidationError } from '@telixon/core';

/** The English message for a fault, used while the field has no `errorMessage` of its own. */
export function defaultPhoneMessage(fault: ValidationError): string {
  switch (fault.kind) {
    case 'INVALID_CALLING_CODE':
      return 'No country uses this calling code.';
    case 'EMPTY':
    case 'TOO_SHORT':
    case 'POSSIBLE_LOCAL_ONLY':
      return 'This number is too short.';
    case 'TOO_LONG':
      return 'This number is too long.';
    case 'INVALID_LENGTH':
      return 'This number has the wrong length.';
    case 'NATIONAL_PREFIX_MISSING':
      return `Add the leading ${fault.expectedPrefix}.`;
    case 'NATIONAL_PREFIX_PRESENT':
      return `Remove the leading ${fault.prefix}.`;
    case 'PATTERN_MISMATCH':
      return 'This number does not exist.';
  }
}
