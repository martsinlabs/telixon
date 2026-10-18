import type { DefineComponent, HTMLAttributes } from 'vue';
import type {
  FlagProps,
  PhoneChangeHandler,
  PhoneFieldProps,
  PhoneStateHandler,
  RegionPickerProps,
} from './models/props';

type ElementComponent<T> = DefineComponent<HTMLAttributes & T>;

/** Makes the three elements known to Vue templates. A `@telixon-change` listener compiles to the `onTelixonChange` prop. */
declare module 'vue' {
  interface GlobalComponents {
    'telixon-phone-field': ElementComponent<
      PhoneFieldProps & { onTelixonChange?: PhoneChangeHandler; onTelixonState?: PhoneStateHandler }
    >;
    'telixon-region-picker': ElementComponent<RegionPickerProps>;
    'telixon-flag': ElementComponent<FlagProps>;
  }
}

export {};
