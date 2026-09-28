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

// The only types that leave the text alone. A single-line input turns Enter into form submission
// instead of a break, which the widget must not cancel. Everything else is cancelled, which keeps
// every edit of the value inside the controller.
const TEXT_PRESERVING_INPUT_TYPES = new Set(['insertLineBreak', 'insertParagraph']);

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

export function isTextPreservingInputType(inputType: string): boolean {
  return TEXT_PRESERVING_INPUT_TYPES.has(inputType);
}
