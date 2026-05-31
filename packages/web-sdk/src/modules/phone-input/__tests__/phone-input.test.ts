// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { createPhoneInput } from '../phone-input';
import { getExampleNumber } from './__fixtures__/example-numbers';

const US_MOBILE = getExampleNumber('US', 'MOBILE');
const US_TOLL_FREE = getExampleNumber('US', 'TOLL_FREE');

function attachInput(type: string = 'text'): { input: HTMLInputElement; cleanup: () => void } {
  const input = document.createElement('input');
  input.type = type;
  document.body.appendChild(input);
  return {
    input,
    cleanup: () => {
      input.remove();
    },
  };
}

function dispatchBeforeInput(
  input: HTMLInputElement,
  inputType: string,
  init: { data?: string | null; isComposing?: boolean } = {},
): void {
  input.dispatchEvent(
    new InputEvent('beforeinput', {
      inputType,
      data: init.data ?? null,
      isComposing: init.isComposing ?? false,
      cancelable: true,
    }),
  );
}

function dispatchKeyDown(
  input: HTMLInputElement,
  key: string,
  modifiers: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {},
): void {
  input.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true, ...modifiers }));
}

function dispatchCompositionEnd(input: HTMLInputElement, data: string): void {
  // happy-dom aliases CompositionEvent to Event; attach data manually.
  const event = new Event('compositionend', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'data', { value: data });
  input.dispatchEvent(event);
}

function digits(value: string): string {
  return value.replace(/\D/g, '');
}

describe('PhoneInput createPhoneInput: input type', () => {
  it('accepts an <input type="text"> element', () => {
    const { input, cleanup } = attachInput('text');

    expect(() => createPhoneInput({ input, mode: 'national', country: 'US' })).not.toThrow();

    cleanup();
  });

  it('accepts an <input type="tel"> element', () => {
    const { input, cleanup } = attachInput('tel');

    expect(() => createPhoneInput({ input, mode: 'national', country: 'US' })).not.toThrow();

    cleanup();
  });

  it('rejects an <input type="email"> element', () => {
    const { input, cleanup } = attachInput('email');

    expect(() => createPhoneInput({ input, mode: 'national', country: 'US' })).toThrow(/type="email"/);

    cleanup();
  });

  it('rejects an <input type="number"> element', () => {
    const { input, cleanup } = attachInput('number');

    expect(() => createPhoneInput({ input, mode: 'national', country: 'US' })).toThrow(/type="number"/);

    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteSoftLineBackward', () => {
  it('deletes from start of line to caret when no selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(6, 6);

    dispatchBeforeInput(input, 'deleteSoftLineBackward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(3));

    phone.destroy();
    cleanup();
  });

  it('deletes from start of line through the selection end when a selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(2, 6);

    dispatchBeforeInput(input, 'deleteSoftLineBackward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(3));

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: insert with empty data', () => {
  it('does not modify the value when insertText has no data and no selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;
    input.setSelectionRange(5, 5);

    dispatchBeforeInput(input, 'insertText', { data: null });

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });

  it('does not delete the active selection when insertText has no data', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;
    input.setSelectionRange(2, 6);

    dispatchBeforeInput(input, 'insertText', { data: null });

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: composition inputTypes', () => {
  it('insertCompositionText does not modify the input value', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;

    dispatchBeforeInput(input, 'insertCompositionText', { data: 'こ' });

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });

  it('insertFromComposition does not modify the input value', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;

    dispatchBeforeInput(input, 'insertFromComposition', { data: 'こんにちは' });

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteHardLineBackward', () => {
  it('deletes from start of line to caret when no selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(6, 6);

    dispatchBeforeInput(input, 'deleteHardLineBackward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(3));

    phone.destroy();
    cleanup();
  });

  it('deletes from start of line through the selection end when a selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(2, 6);

    dispatchBeforeInput(input, 'deleteHardLineBackward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(3));

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteEntireSoftLine', () => {
  it('clears the entire value regardless of caret position', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(6, 6);

    dispatchBeforeInput(input, 'deleteEntireSoftLine');

    expect(input.value).toBe('');

    phone.destroy();
    cleanup();
  });

  it('clears the entire value when a selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(2, 6);

    dispatchBeforeInput(input, 'deleteEntireSoftLine');

    expect(input.value).toBe('');

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: insertText', () => {
  it('inserts a digit at the end of the value', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE.slice(0, -1));
    input.setSelectionRange(input.value.length, input.value.length);

    dispatchBeforeInput(input, 'insertText', { data: US_MOBILE.slice(-1) });

    expect(digits(input.value)).toBe(US_MOBILE);

    phone.destroy();
    cleanup();
  });

  it('does not modify the value when the inserted character is not a digit', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;
    input.setSelectionRange(input.value.length, input.value.length);

    dispatchBeforeInput(input, 'insertText', { data: 'a' });

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });

  it('replaces the active selection with the inserted digit', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(1, 4);

    dispatchBeforeInput(input, 'insertText', { data: '0' });

    expect(digits(input.value)).toBe(`0${US_MOBILE.slice(3)}`);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: insertFromPaste', () => {
  it('extracts digits from a formatted phone number on paste', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    input.setSelectionRange(0, 0);

    dispatchBeforeInput(input, 'insertFromPaste', {
      data: `(${US_MOBILE.slice(0, 3)}) ${US_MOBILE.slice(3, 6)}-${US_MOBILE.slice(6)}`,
    });

    expect(digits(input.value)).toBe(US_MOBILE);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteContentBackward', () => {
  it('deletes the last digit when the caret is at the end and no selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(input.value.length, input.value.length);

    dispatchBeforeInput(input, 'deleteContentBackward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(0, -1));

    phone.destroy();
    cleanup();
  });

  it('deletes the selected digits when a selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(1, 4);

    dispatchBeforeInput(input, 'deleteContentBackward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(3));

    phone.destroy();
    cleanup();
  });

  it('does not modify the value when the caret is at position 0', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;
    input.setSelectionRange(0, 0);

    dispatchBeforeInput(input, 'deleteContentBackward');

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteContentForward', () => {
  it('deletes the next digit when the caret is at a digit and no selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(1, 1);

    dispatchBeforeInput(input, 'deleteContentForward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(1));

    phone.destroy();
    cleanup();
  });

  it('deletes the selected digits when a selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(1, 4);

    dispatchBeforeInput(input, 'deleteContentForward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(3));

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteWordBackward', () => {
  it('deletes back to the previous word boundary when the caret is at the end', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(input.value.length, input.value.length);

    dispatchBeforeInput(input, 'deleteWordBackward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(0, 6));

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteWordForward', () => {
  it('deletes forward to the next word boundary when no selection is active', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(6, 6);

    dispatchBeforeInput(input, 'deleteWordForward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(0, 3) + US_MOBILE.slice(6));

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: deleteSoftLineForward', () => {
  it('deletes from the caret to the end of the value', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    input.setSelectionRange(6, 6);

    dispatchBeforeInput(input, 'deleteSoftLineForward');

    expect(digits(input.value)).toBe(US_MOBILE.slice(0, 3));

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: history', () => {
  it('undoes the previous operation on historyUndo when canUndo is true', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    phone.setValue(US_TOLL_FREE);

    dispatchBeforeInput(input, 'historyUndo');

    expect(digits(input.value)).toBe(US_MOBILE);

    phone.destroy();
    cleanup();
  });

  it('does not modify the value on historyUndo when canUndo is false', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    const before = input.value;

    dispatchBeforeInput(input, 'historyUndo');

    expect(input.value).toBe(before);
    expect(phone.canUndo()).toBe(false);

    phone.destroy();
    cleanup();
  });

  it('restores the next operation on historyRedo when canRedo is true', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    phone.undo();

    dispatchBeforeInput(input, 'historyRedo');

    expect(digits(input.value)).toBe(US_MOBILE);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput keydown: undo and redo shortcuts', () => {
  it('triggers undo on Ctrl+Z when canUndo is true', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);

    dispatchKeyDown(input, 'z', { ctrlKey: true });

    expect(input.value).toBe('');

    phone.destroy();
    cleanup();
  });

  it('triggers redo on Ctrl+Shift+Z when canRedo is true', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    phone.undo();

    dispatchKeyDown(input, 'z', { ctrlKey: true, shiftKey: true });

    expect(digits(input.value)).toBe(US_MOBILE);

    phone.destroy();
    cleanup();
  });

  it('triggers redo on Ctrl+Y when canRedo is true', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    phone.undo();

    dispatchKeyDown(input, 'y', { ctrlKey: true });

    expect(digits(input.value)).toBe(US_MOBILE);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: blocked and unknown inputTypes', () => {
  it('does not modify the value for a blocked inputType such as formatBold', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;

    dispatchBeforeInput(input, 'formatBold');

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });

  it('does not modify the value for an unknown inputType', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;

    dispatchBeforeInput(input, 'someUnknownInputType');

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput beforeinput: composition guard', () => {
  it('skips handling when isComposing is true even for an insertText with a digit payload', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    phone.setValue(US_MOBILE);
    const before = input.value;

    dispatchBeforeInput(input, 'insertText', { data: '0', isComposing: true });

    expect(input.value).toBe(before);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput filters: initial application', () => {
  it('reflects the initial countryFilter in the first emitted state', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({
      input,
      mode: 'national',
      country: 'US',
      countryFilter: ['US', 'CA'],
    });

    expect(phone.getState().countryFilter).toEqual(['US', 'CA']);

    phone.destroy();
    cleanup();
  });

  it('reflects the initial numberTypeFilter in the first emitted state', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({
      input,
      mode: 'national',
      country: 'US',
      numberTypeFilter: ['MOBILE'],
    });

    expect(phone.getState().numberTypeFilter).toEqual(['MOBILE']);

    phone.destroy();
    cleanup();
  });

  it('defaults both filters to null when not provided', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    expect(phone.getState().countryFilter).toBe(null);
    expect(phone.getState().numberTypeFilter).toBe(null);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput filters: runtime setters', () => {
  it('emits a new state with the updated countryFilter on setCountryFilter', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    let lastState = phone.getState();
    const unsubscribe = phone.subscribe((state) => {
      lastState = state;
    });

    phone.setCountryFilter(['US']);

    expect(lastState.countryFilter).toEqual(['US']);

    unsubscribe();
    phone.destroy();
    cleanup();
  });

  it('emits a new state with the updated numberTypeFilter on setNumberTypeFilter', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    let lastState = phone.getState();
    const unsubscribe = phone.subscribe((state) => {
      lastState = state;
    });

    phone.setNumberTypeFilter(['MOBILE']);

    expect(lastState.numberTypeFilter).toEqual(['MOBILE']);

    unsubscribe();
    phone.destroy();
    cleanup();
  });

  it('restores unfiltered state when a filter is set to null', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({
      input,
      mode: 'national',
      country: 'US',
      numberTypeFilter: ['FIXED_LINE'],
    });

    phone.setNumberTypeFilter(null);

    expect(phone.getState().numberTypeFilter).toBe(null);

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput filters: re-resolution', () => {
  it('drops the resolved country when setCountryFilter excludes it', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'international' });

    phone.setValue(`+1${US_MOBILE}`);
    expect(phone.getState().country).toBe('US');

    phone.setCountryFilter(['GB']);

    expect(phone.getState().country).not.toBe('US');

    phone.destroy();
    cleanup();
  });
});

describe('PhoneInput compositionend', () => {
  it('commits the IME composition data via inputController.insert', () => {
    const { input, cleanup } = attachInput();
    const phone = createPhoneInput({ input, mode: 'national', country: 'US' });

    input.setSelectionRange(0, 0);

    dispatchCompositionEnd(input, '5');

    expect(digits(input.value)).toBe('5');

    phone.destroy();
    cleanup();
  });
});
