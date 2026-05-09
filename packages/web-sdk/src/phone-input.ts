import { InputController } from '@telixon/core';
import {
  isBackwardDeleteInputType,
  isBlockedInputType,
  isCompositionInputType,
  isForwardDeleteInputType,
  isInsertInputType,
} from './constants/before-input-types';
import type { PhoneInput, PhoneInputListener, PhoneInputOptions, PhoneInputState } from './models';
import { applyInputState } from './utils/apply-input-state';
import { assertTextInputType } from './utils/assert-text-input-type';
import {
  resolveEntireValueRange,
  resolveInsertText,
  resolveLineDeleteBackwardRange,
  resolveLineDeleteForwardRange,
} from './utils/before-input';
import { buildController } from './utils/build-controller';
import { deriveState } from './utils/derive-state';

const ATTACHED_INPUTS: WeakSet<HTMLInputElement> = new WeakSet();

function assertInputIsAvailable(input: HTMLInputElement): void {
  if (!ATTACHED_INPUTS.has(input)) {
    return;
  }

  throw new Error('@telixon/web-sdk cannot attach multiple phone inputs to the same DOM input element.');
}

export function createPhoneInput(options: PhoneInputOptions): PhoneInput {
  const { initialValue, input } = options;
  assertTextInputType(input);
  assertInputIsAvailable(input);
  ATTACHED_INPUTS.add(input);

  const inputController: InputController = buildController(options);
  const listeners: Set<PhoneInputListener> = new Set();

  let isComposing: boolean = false;
  let isSyncingComposition: boolean = false;
  let isDestroyed: boolean = false;

  if (initialValue !== undefined) {
    inputController.setValue(initialValue);
  }

  function getState(): PhoneInputState {
    return deriveState(inputController.currentState);
  }

  function notify(state: PhoneInputState): void {
    if (isDestroyed) return;

    applyInputState(input, state);

    for (const listener of listeners) listener(state);
  }

  function commit(change: () => void): void {
    change();
    notify(getState());
  }

  function syncCompositionValue(): void {
    isSyncingComposition = true;

    queueMicrotask(() => {
      // Let the browser finish committing the final IME text before reading from the DOM.
      if (isDestroyed) return;

      isSyncingComposition = false;
      commit(() => {
        inputController.setValue(input.value);
      });
    });
  }

  function handleCompositionStart(event: CompositionEvent): void {
    if (event.target !== input) return;

    isComposing = true;
    isSyncingComposition = false;
  }

  function handleCompositionEnd(event: CompositionEvent): void {
    if (event.target !== input) return;

    isComposing = false;
    syncCompositionValue();
  }

  function handleBeforeInput(event: InputEvent): void {
    if (event.target !== input) return;

    const { inputType } = event;

    // During IME composition the browser owns the transient DOM value and caret.
    if (isComposing || isSyncingComposition || isCompositionInputType(inputType)) return;

    const value: string = input.value;
    const selectionStart: number = input.selectionStart ?? 0;
    const selectionEnd: number = input.selectionEnd ?? 0;

    event.preventDefault();

    if (isInsertInputType(inputType)) {
      commit(() => {
        inputController.insert(value, resolveInsertText(event), selectionStart, selectionEnd);
      });
      return;
    }

    if (isBackwardDeleteInputType(inputType)) {
      commit(() => {
        inputController.deleteBackward(value, selectionStart, selectionEnd);
      });
      return;
    }

    if (isForwardDeleteInputType(inputType)) {
      commit(() => {
        inputController.deleteForward(value, selectionStart, selectionEnd);
      });
      return;
    }

    switch (inputType) {
      case 'deleteSoftLineBackward': {
        const range = resolveLineDeleteBackwardRange(selectionStart, selectionEnd);

        commit(() => {
          inputController.deleteBackward(value, range.start, range.end);
        });
        return;
      }

      case 'deleteSoftLineForward':
      case 'deleteHardLineForward':
      case 'deleteEntireSoftLine': {
        const range = resolveLineDeleteForwardRange(value, selectionStart, selectionEnd);

        commit(() => {
          inputController.deleteForward(value, range.start, range.end);
        });
        return;
      }

      case 'deleteEntireHardLine': {
        const range = resolveEntireValueRange(value, selectionStart, selectionEnd);

        commit(() => {
          inputController.deleteBackward(value, range.start, range.end);
        });
        return;
      }

      case 'historyUndo':
        commit(() => {
          inputController.undo();
        });
        return;

      case 'historyRedo':
        commit(() => {
          inputController.redo();
        });
        return;

      default:
        if (isBlockedInputType(inputType)) {
          return;
        }

        return;
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.target !== input) return;
    if (isComposing || isSyncingComposition) return;
    if (!event.ctrlKey && !event.metaKey) return;

    const isUndo = event.key === 'z' && !event.shiftKey;
    const isRedo = (event.key === 'z' && event.shiftKey) || event.key === 'y';

    if (!isUndo && !isRedo) return;

    event.preventDefault();

    commit(() => {
      if (isUndo) {
        inputController.undo();
      } else {
        inputController.redo();
      }
    });
  }

  input.addEventListener('beforeinput', handleBeforeInput);
  input.addEventListener('compositionstart', handleCompositionStart);
  input.addEventListener('compositionend', handleCompositionEnd);
  input.addEventListener('keydown', handleKeyDown);
  notify(getState());

  return {
    getState,

    canUndo(): boolean {
      return inputController.canUndo;
    },

    canRedo(): boolean {
      return inputController.canRedo;
    },

    subscribe(listener: PhoneInputListener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    setValue(value: string): void {
      commit(() => inputController.setValue(value));
    },

    setCountry(country: string): void {
      commit(() => inputController.setCountry(country));
    },

    undo(): void {
      commit(() => inputController.undo());
    },

    redo(): void {
      commit(() => inputController.redo());
    },

    destroy(): void {
      isDestroyed = true;
      ATTACHED_INPUTS.delete(input);
      input.removeEventListener('beforeinput', handleBeforeInput);
      input.removeEventListener('compositionstart', handleCompositionStart);
      input.removeEventListener('compositionend', handleCompositionEnd);
      input.removeEventListener('keydown', handleKeyDown);
      listeners.clear();
    },
  };
}
