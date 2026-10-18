import type { ValidationError } from '@telixon/core';
import { INVALID_STATE, USER_INVALID_STATE, USER_VALID_STATE, VALID_STATE } from '../constants/custom-states';
import { EMPTY_FAULT } from '../constants/empty-fault';
import type { TelixonPhoneMessage } from '../models';

export type FormAssociationOptions = {
  internals: ElementInternals;
  /** The input the native validation message points at, `null` while the element has none. */
  anchor: () => HTMLInputElement | null;
};

/** The submission value, the fault, and the message the element hands its form. */
export type FormReport = {
  readonly value: string | null;
  /** The text shown in the input, restored after navigation. */
  readonly text: string;
  readonly fault: ValidationError | null;
  /** Whether the field must hold a number. Without digits it then reports `valueMissing`. */
  readonly required: boolean;
  readonly message: TelixonPhoneMessage;
};

/** The form side of the element, which holds the submission value, the validity, and the states styling it. */
export type FormAssociation = {
  /** Hand the form the latest value and validity. */
  report(report: FormReport): void;
  /** Mark the field as touched, after which `user-valid` and `user-invalid` apply. */
  touch(): void;
  /** Forget the touch, which a form reset does. */
  untouch(): void;
};

function setState(states: CustomStateSet, state: string, isOn: boolean): void {
  if (isOn) states.add(state);
  else states.delete(state);
}

export function createFormAssociation(options: FormAssociationOptions): FormAssociation {
  const { internals, anchor } = options;
  let isTouched: boolean = false;
  let isValid: boolean = false;
  let isInvalid: boolean = false;

  function paint(): void {
    const states: CustomStateSet = internals.states;
    setState(states, VALID_STATE, isValid);
    setState(states, INVALID_STATE, isInvalid);
    setState(states, USER_VALID_STATE, isValid && isTouched);
    setState(states, USER_INVALID_STATE, isInvalid && isTouched);
  }

  return {
    report(report: FormReport): void {
      const { value, text, fault, required, message } = report;
      // A field with a fault holds digits. Without a fault and without a value it holds none.
      const isMissing: boolean = required && fault === null && value === null;
      internals.setFormValue(value, text);
      if (fault !== null) internals.setValidity({ customError: true }, message(fault), anchor() ?? undefined);
      else if (isMissing) internals.setValidity({ valueMissing: true }, message(EMPTY_FAULT), anchor() ?? undefined);
      else internals.setValidity({});
      isValid = value !== null;
      isInvalid = fault !== null || isMissing;
      paint();
    },

    touch(): void {
      if (isTouched) return;
      isTouched = true;
      paint();
    },

    untouch(): void {
      if (!isTouched) return;
      isTouched = false;
      paint();
    },
  };
}
