import type { PhoneInputOptions } from '@telixon/web-sdk';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Options for {@link TelixonPhoneInput}, the options of `createPhoneInput` without `input` and
 * `initialValue`. The directive supplies its own element, while the value comes from the form or from
 * the element.
 */
export type TelixonPhoneInputOptions = DistributiveOmit<PhoneInputOptions, 'input' | 'initialValue'>;
