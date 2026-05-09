function isDeleteSelection(selectionStart: number, selectionEnd: number): boolean {
  return selectionStart !== selectionEnd;
}

export function resolveLineDeleteBackwardRange(
  selectionStart: number,
  selectionEnd: number,
): { start: number; end: number } {
  if (isDeleteSelection(selectionStart, selectionEnd)) {
    return { start: selectionStart, end: selectionEnd };
  }

  return { start: 0, end: selectionStart };
}

export function resolveLineDeleteForwardRange(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { start: number; end: number } {
  if (isDeleteSelection(selectionStart, selectionEnd)) {
    return { start: selectionStart, end: selectionEnd };
  }

  return { start: selectionEnd, end: value.length };
}

export function resolveEntireValueRange(
  value: string,
  selectionStart: number,
  selectionEnd: number,
): { start: number; end: number } {
  if (isDeleteSelection(selectionStart, selectionEnd)) {
    return { start: selectionStart, end: selectionEnd };
  }

  return { start: 0, end: value.length };
}

export function resolveInsertText(event: InputEvent): string {
  return event.data ?? event.dataTransfer?.getData('text/plain') ?? '';
}