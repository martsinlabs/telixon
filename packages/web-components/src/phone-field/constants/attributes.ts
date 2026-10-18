export const MODE_ATTRIBUTE = 'mode';
export const DEFAULT_REGION_ATTRIBUTE = 'default-region';
export const CALLING_CODE_IN_INPUT_ATTRIBUTE = 'calling-code-in-input';
export const PLUS_PREFIX_ATTRIBUTE = 'plus-prefix';
export const STRICT_ATTRIBUTE = 'strict';
export const REGION_FILTER_ATTRIBUTE = 'region-filter';
export const NUMBER_TYPE_FILTER_ATTRIBUTE = 'number-type-filter';
export const PLACEHOLDER_NUMBER_TYPE_ATTRIBUTE = 'placeholder-number-type';
export const AUTO_PLACEHOLDER_ATTRIBUTE = 'auto-placeholder';
export const ERROR_MESSAGE_ATTRIBUTE = 'error-message';
export const VALUE_ATTRIBUTE = 'value';
export const NAME_ATTRIBUTE = 'name';
export const REQUIRED_ATTRIBUTE = 'required';
export const DISABLED_ATTRIBUTE = 'disabled';
export const READONLY_ATTRIBUTE = 'readonly';

/** The attributes that map to options. A change of any of them applies the options again. */
export const OPTION_ATTRIBUTES: readonly string[] = Object.freeze([
  MODE_ATTRIBUTE,
  DEFAULT_REGION_ATTRIBUTE,
  CALLING_CODE_IN_INPUT_ATTRIBUTE,
  PLUS_PREFIX_ATTRIBUTE,
  STRICT_ATTRIBUTE,
  REGION_FILTER_ATTRIBUTE,
  NUMBER_TYPE_FILTER_ATTRIBUTE,
  PLACEHOLDER_NUMBER_TYPE_ATTRIBUTE,
]);

/** The attributes mirrored onto the inner input. `disabled` arrives through `formDisabledCallback` instead. */
export const MIRRORED_ATTRIBUTES: readonly string[] = Object.freeze([READONLY_ATTRIBUTE]);

/** The attributes with a callback. `value` is read at attach and on reset, `name` by the form, `disabled` through `formDisabledCallback`. */
export const OBSERVED_ATTRIBUTES: readonly string[] = Object.freeze([
  ...OPTION_ATTRIBUTES,
  ...MIRRORED_ATTRIBUTES,
  REQUIRED_ATTRIBUTE,
  AUTO_PLACEHOLDER_ATTRIBUTE,
  ERROR_MESSAGE_ATTRIBUTE,
]);
