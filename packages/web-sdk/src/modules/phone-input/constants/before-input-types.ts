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
