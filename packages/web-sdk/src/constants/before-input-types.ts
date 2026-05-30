const INSERT_INPUT_TYPES = new Set([
  'insertText',
  'insertReplacementText',
  'insertFromPaste',
  'insertFromDrop',
  'insertFromYank',
]);

const BACKWARD_DELETE_INPUT_TYPES = new Set(['deleteContentBackward', 'deleteByCut', 'deleteContent', 'deleteByDrag']);

const FORWARD_DELETE_INPUT_TYPES = new Set(['deleteContentForward']);

const WORD_BACKWARD_DELETE_INPUT_TYPES = new Set(['deleteWordBackward']);

const WORD_FORWARD_DELETE_INPUT_TYPES = new Set(['deleteWordForward']);

// Composition input is committed via the compositionend listener, not through the beforeinput path.
const COMPOSITION_INPUT_TYPES = new Set(['insertCompositionText', 'insertFromComposition']);

const BLOCKED_INPUT_TYPES = new Set([
  'insertLineBreak',
  'insertParagraph',
  'insertOrderedList',
  'insertUnorderedList',
  'insertHorizontalRule',
  'insertLink',
  'insertTranspose',
  'insertFromPasteAsQuotation',
  'formatBackColor',
  'formatBold',
  'formatFontColor',
  'formatFontName',
  'formatIndent',
  'formatItalic',
  'formatJustifyCenter',
  'formatJustifyFull',
  'formatJustifyRight',
  'formatJustifyLeft',
  'formatOutdent',
  'formatRemove',
  'formatSetBlockTextDirection',
  'formatSetInlineTextDirection',
  'formatStrikeThrough',
  'formatSubscript',
  'formatSuperscript',
  'formatUnderline',
  'historyUndo',
  'historyRedo',
]);

export function isInsertInputType(inputType: string): boolean {
  return INSERT_INPUT_TYPES.has(inputType);
}

export function isBackwardDeleteInputType(inputType: string): boolean {
  return BACKWARD_DELETE_INPUT_TYPES.has(inputType);
}

export function isForwardDeleteInputType(inputType: string): boolean {
  return FORWARD_DELETE_INPUT_TYPES.has(inputType);
}

export function isWordBackwardDeleteInputType(inputType: string): boolean {
  return WORD_BACKWARD_DELETE_INPUT_TYPES.has(inputType);
}

export function isWordForwardDeleteInputType(inputType: string): boolean {
  return WORD_FORWARD_DELETE_INPUT_TYPES.has(inputType);
}

export function isBlockedInputType(inputType: string): boolean {
  return BLOCKED_INPUT_TYPES.has(inputType);
}

export function isCompositionInputType(inputType: string): boolean {
  return COMPOSITION_INPUT_TYPES.has(inputType);
}
