import type { Signal } from '@angular/core';
import type { ValidationError } from '@telixon/core';
import type { PhoneInput, PhoneInputOptions, PhoneInputState } from '@telixon/web-sdk';
import type { PHONE_ERROR_KEY } from '../constants/form-errors';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Options for {@link TelixonPhoneInput}, the options of `createPhoneInput` without `input` and
 * `initialValue`. The directive supplies its own element, while the value comes from the form or from
 * the element.
 */
export type TelixonPhoneInputOptions = DistributiveOmit<PhoneInputOptions, 'input' | 'initialValue'>;

/**
 * The directive a region picker links to through `[for]`, which runs the phone widget on an
 * `<input>`. `TelixonPhoneInput` and `TelixonPhoneField` both fit it.
 */
export type TelixonPhoneHost = {
  /** The options the field runs with. */
  readonly options: Signal<TelixonPhoneInputOptions>;
  /** The web-sdk widget behind the field, `null` until the field is live. */
  readonly phone: Signal<PhoneInput | null>;
  /** The field's latest state, `null` until the field is live. */
  readonly state: Signal<PhoneInputState | null>;
  /** Whether the form has disabled the field. */
  readonly disabled: Signal<boolean>;
  /** The input the directive sits on. */
  readonly element: HTMLInputElement;
  /** Move focus into the field. */
  focus(options?: FocusOptions): void;
};

/** Turns a fault into the message the field reports for it. */
export type TelixonPhoneMessage = (fault: ValidationError) => string;

/** The parse error a phone field reports to its Signal Form, under the kind `telixonPhone`. */
export type TelixonPhoneFieldError = {
  readonly kind: typeof PHONE_ERROR_KEY;
  readonly message: string;
  /** The fault behind the error, as `getValidationError` reports it. */
  readonly fault: ValidationError;
};

// What a parse of the raw text reports. A value goes to the form along with the fault. An error change leaves the value alone.
export type ParseReport = { readonly kind: 'value'; readonly value: string | null } | { readonly kind: 'error' };
