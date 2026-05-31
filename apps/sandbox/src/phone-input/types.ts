import type { PhoneInput } from '@telixon/web-sdk';

export type Mode = 'national' | 'international';

export type Controller = {
  mode: Mode;
  phone: PhoneInput;
  unsubscribe: () => void;
};
