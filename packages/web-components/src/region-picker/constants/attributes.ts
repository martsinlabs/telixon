/** The id of the phone field, or of an element inside it. Without it the picker belongs to the field around it. The `forElement` property takes the element itself. */
export const FOR_ATTRIBUTE = 'for';
/** The BCP 47 tag of the region names. Absent falls back to the closest `lang`, then to the browser. */
export const LOCALE_ATTRIBUTE = 'locale';
/** Regions shown first, comma-separated, in this order. */
export const PRIORITIZE_ATTRIBUTE = 'prioritize';
/** `alphabetical` or `callingCode`. */
export const SORT_ATTRIBUTE = 'sort';
/** A selector naming the closest ancestor the list lines up with. */
export const ANCHOR_ATTRIBUTE = 'anchor';
export const TRIGGER_LABEL_ATTRIBUTE = 'trigger-label';
export const SEARCH_LABEL_ATTRIBUTE = 'search-label';
export const EMPTY_TEXT_ATTRIBUTE = 'empty-text';
/** `"false"` keeps focus off the search field when the list opens. */
export const AUTO_FOCUS_ATTRIBUTE = 'auto-focus';

export const OBSERVED_ATTRIBUTES: readonly string[] = Object.freeze([
  FOR_ATTRIBUTE,
  LOCALE_ATTRIBUTE,
  PRIORITIZE_ATTRIBUTE,
  SORT_ATTRIBUTE,
  ANCHOR_ATTRIBUTE,
  TRIGGER_LABEL_ATTRIBUTE,
  SEARCH_LABEL_ATTRIBUTE,
  EMPTY_TEXT_ATTRIBUTE,
]);

/** The host attribute set while the phone field is disabled or read-only, which makes the picker inert. A styling hook. */
export const DISABLED_DATA_ATTRIBUTE = 'data-disabled';

/** The `lang` attribute the locale falls back to. */
export const LANG_ATTRIBUTE = 'lang';
export const LANG_SELECTOR = '[lang]';
