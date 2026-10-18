import type { ValidationError } from '@telixon/core';
import type { PhoneInputOptions, PhoneInputState } from '@telixon/web-sdk';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Options for `<telixon-phone-field>`, the options of `createPhoneInput` without `input` and
 * `initialValue`. The element runs on the input inside it, while the value comes from the form or
 * from the input.
 */
export type TelixonPhoneFieldOptions = DistributiveOmit<PhoneInputOptions, 'input' | 'initialValue'>;

/** Turns a fault into the message the element reports for it. */
export type TelixonPhoneMessage = (fault: ValidationError) => string;

/** The detail of a `telixon-change` event, the number in E.164 while it is valid and `null` otherwise. */
export type TelixonPhoneChangeDetail = {
  readonly value: string | null;
};

/** The detail of a `telixon-state` event, the latest state of the widget. */
export type TelixonPhoneStateDetail = {
  readonly state: PhoneInputState;
};
