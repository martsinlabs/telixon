/** The attributes of the field's input that make the picker inert. The field mirrors its own flags onto that input. */
export const FIELD_DISABLED_ATTRIBUTE = 'disabled';
export const FIELD_READONLY_ATTRIBUTE = 'readonly';
export const INERT_ATTRIBUTE_FILTER: readonly string[] = Object.freeze([
  FIELD_DISABLED_ATTRIBUTE,
  FIELD_READONLY_ATTRIBUTE,
]);
