// Faithful DOM events for the phone input. The adapter reads the element value and caret at event
// time, then cancels the event and writes the result back, so a test only has to place the caret and
// dispatch the same event a browser would.

export function placeCaret(input: HTMLInputElement, start: number, end: number): void {
  input.setSelectionRange(start, end);
}

export function dispatchBeforeInput(input: HTMLInputElement, inputType: string, data: string | null = null): void {
  input.dispatchEvent(new InputEvent('beforeinput', { inputType, data, isComposing: false, cancelable: true }));
}

export function dispatchCompositionEnd(input: HTMLInputElement, data: string): void {
  input.dispatchEvent(new CompositionEvent('compositionend', { data }));
}

export function dispatchKeyDown(
  input: HTMLInputElement,
  key: string,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {},
): void {
  input.dispatchEvent(
    new KeyboardEvent('keydown', {
      key,
      ctrlKey: modifiers.ctrlKey ?? false,
      metaKey: modifiers.metaKey ?? false,
      shiftKey: modifiers.shiftKey ?? false,
      cancelable: true,
    }),
  );
}
