import type { NumberType, PlusPrefixMode, RegionCode } from '@telixon/core';
import type { RegionListSort } from '@telixon/web-sdk';
import type {
  TelixonPhoneChangeDetail,
  TelixonPhoneFieldOptions,
  TelixonPhoneMessage,
  TelixonPhoneStateDetail,
} from '../phone-field';
import type { TelixonPopupOffset, TelixonRenderOption, TelixonRenderTrigger } from '../region-picker';

/** Handles `telixon-change`. */
export type PhoneChangeHandler = (event: CustomEvent<TelixonPhoneChangeDetail>) => void;

/** Handles `telixon-state`. */
export type PhoneStateHandler = (event: CustomEvent<TelixonPhoneStateDetail>) => void;

/** The attributes and properties a template can set on `<telixon-phone-field>`. */
export type PhoneFieldProps = {
  name?: string;
  value?: string | null;
  mode?: TelixonPhoneFieldOptions['mode'];
  'default-region'?: RegionCode;
  'calling-code-in-input'?: 'true' | 'false';
  'plus-prefix'?: PlusPrefixMode;
  strict?: boolean;
  'region-filter'?: string;
  'number-type-filter'?: string;
  'placeholder-number-type'?: NumberType;
  'auto-placeholder'?: boolean;
  'error-message'?: string;
  required?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  options?: TelixonPhoneFieldOptions | null;
  errorMessage?: TelixonPhoneMessage | null;
};

/** The attributes and properties a template can set on `<telixon-region-picker>`. */
export type RegionPickerProps = {
  for?: string;
  locale?: string;
  prioritize?: string;
  sort?: RegionListSort;
  anchor?: HTMLElement | string | null;
  'trigger-label'?: string;
  'search-label'?: string;
  'empty-text'?: string;
  'auto-focus'?: 'true' | 'false';
  forElement?: Element | null;
  popupOffset?: TelixonPopupOffset;
  renderOption?: TelixonRenderOption | null;
  renderTrigger?: TelixonRenderTrigger | null;
};

/** The attributes and properties a template can set on `<telixon-flag>`. */
export type FlagProps = {
  region?: RegionCode | null;
};
