import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import type {
  FlagProps,
  PhoneChangeHandler,
  PhoneFieldProps,
  PhoneStateHandler,
  RegionPickerProps,
} from './models/props';

type ElementProps<T> = DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & T;

/** Props of `<telixon-phone-field>` in JSX. React 19 sets the properties it finds on the element and listens to the events by their exact names. */
export type TelixonPhoneFieldProps = ElementProps<PhoneFieldProps> & {
  'ontelixon-change'?: PhoneChangeHandler;
  'ontelixon-state'?: PhoneStateHandler;
};

/** Props of `<telixon-region-picker>` in JSX. */
export type TelixonRegionPickerProps = ElementProps<RegionPickerProps>;

/** Props of `<telixon-flag>` in JSX. */
export type TelixonFlagProps = ElementProps<FlagProps>;

declare module 'react' {
  // React 19 types a custom element through this namespace.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'telixon-phone-field': TelixonPhoneFieldProps;
      'telixon-region-picker': TelixonRegionPickerProps;
      'telixon-flag': TelixonFlagProps;
    }
  }
}
