import type { InputController, NumberType, PhoneNumber, RegionCode } from '@telixon/core';
import { readonlyArraysEqual } from '../../utils/readonly-arrays-equal';
import {
  isBackwardDeleteInputType,
  isForwardDeleteInputType,
  isInsertInputType,
  isWordBackwardDeleteInputType,
  isWordForwardDeleteInputType,
} from './constants/before-input-types';
import type { PhoneInput, PhoneInputListener, PhoneInputOptions, PhoneInputState } from './models';
import { applyInputState } from './utils/apply-input-state';
import { assertSupportedInputType } from './utils/assert-supported-input-type';
import { resolveInsertText } from './utils/before-input';
import { buildController } from './utils/build-controller';
import { deriveState } from './utils/derive-state';
import { buildPlaceholderConfig, resolvePlaceholder, type PlaceholderConfig } from './utils/resolve-placeholder';
import { findNextWordBoundary, findPreviousWordBoundary } from './utils/word-boundary';

const ATTACHED_INPUTS: WeakSet<HTMLInputElement> = new WeakSet();

function assertInputIsAvailable(input: HTMLInputElement): void {
  if (!ATTACHED_INPUTS.has(input)) return;

  throw new Error('@telixon/web-sdk cannot attach multiple phone inputs to the same DOM input element.');
}

/**
 * Attach a headless phone input controller to a DOM `<input>` element.
 *
 * Wires DOM events (`beforeinput`, `compositionend`, undo/redo keyboard shortcuts) to a Telixon
 * input controller and synchronizes the input value, selection, and resolved phone metadata.
 *
 * Throws if the element is not `type="text"` or `type="tel"`, if another PhoneInput is already
 * attached to the same element, or if the engine is not ready (`EngineNotReadyError`). Call
 * {@link PhoneInput.destroy} to release.
 */
export function createPhoneInput(options: PhoneInputOptions): PhoneInput {
  const { input } = options;
  assertSupportedInputType(input);
  assertInputIsAvailable(input);

  // Build the controller first: it throws EngineNotReadyError when the engine is not ready, so the
  // element must not be registered as attached until construction succeeds (else a retry would fail).
  const inputController: InputController = buildController(options);
  ATTACHED_INPUTS.add(input);
  const placeholderConfig: PlaceholderConfig = buildPlaceholderConfig(options);
  const listeners: Set<PhoneInputListener> = new Set();

  let isDestroyed: boolean = false;
  let currentRegionFilter: readonly RegionCode[] | null = options.regionFilter ?? null;
  let currentNumberTypeFilter: readonly NumberType[] | null = options.numberTypeFilter ?? null;

  // The placeholder follows the resolved region; an unresolved value falls back to `defaultRegion`.
  const placeholderFallbackRegion: RegionCode | null = options.defaultRegion ?? null;
  let cachedPlaceholderRegion: RegionCode | null = inputController.currentState.region ?? placeholderFallbackRegion;
  let cachedPlaceholder: string | null = resolvePlaceholder(cachedPlaceholderRegion, placeholderConfig);

  if (currentRegionFilter !== null) inputController.setRegionFilter(currentRegionFilter);
  if (currentNumberTypeFilter !== null) inputController.setNumberTypeFilter(currentNumberTypeFilter);

  function currentPlaceholder(region: RegionCode | null): string | null {
    const effectiveRegion: RegionCode | null = region ?? placeholderFallbackRegion;
    if (effectiveRegion === cachedPlaceholderRegion) return cachedPlaceholder;
    cachedPlaceholderRegion = effectiveRegion;
    cachedPlaceholder = resolvePlaceholder(effectiveRegion, placeholderConfig);
    return cachedPlaceholder;
  }

  function buildState(): PhoneInputState {
    const inputState = inputController.currentState;

    return deriveState(
      inputState,
      currentRegionFilter,
      currentNumberTypeFilter,
      currentPlaceholder(inputState.region),
      inputController.getPhoneNumber().getValidationError(),
    );
  }

  function emit(state: PhoneInputState): void {
    for (const listener of listeners) listener(state);
  }

  function notify(state: PhoneInputState): void {
    if (isDestroyed) return;

    applyInputState(input, state);
    emit(state);
  }

  function commit(change: () => void): void {
    change();
    notify(buildState());
  }

  function handleCompositionEnd(event: CompositionEvent): void {
    if (event.target !== input) return;
    if (!event.data) return;

    const start: number = input.selectionStart ?? 0;
    const end: number = input.selectionEnd ?? 0;

    commit(() => inputController.insert(input.value, event.data!, start, end));
  }

  function handleBeforeInput(event: InputEvent): void {
    if (event.target !== input) return;
    if (event.isComposing) return;

    const { inputType } = event;

    const value: string = input.value;
    const selectionStart: number = input.selectionStart ?? 0;
    const selectionEnd: number = input.selectionEnd ?? 0;

    event.preventDefault();

    if (isInsertInputType(inputType)) {
      const insertText: string = resolveInsertText(event);
      if (insertText === '') return;
      commit(() => {
        inputController.insert(value, insertText, selectionStart, selectionEnd);
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

    if (isWordBackwardDeleteInputType(inputType)) {
      const wordStart: number =
        selectionStart === selectionEnd ? findPreviousWordBoundary(value, selectionStart) : selectionStart;
      commit(() => {
        inputController.deleteBackward(value, wordStart, selectionEnd);
      });
      return;
    }

    if (isWordForwardDeleteInputType(inputType)) {
      const wordEnd: number =
        selectionStart === selectionEnd ? findNextWordBoundary(value, selectionEnd) : selectionEnd;
      commit(() => {
        inputController.deleteForward(value, selectionStart, wordEnd);
      });
      return;
    }

    switch (inputType) {
      case 'deleteSoftLineBackward':
      case 'deleteHardLineBackward': {
        commit(() => {
          inputController.deleteBackward(value, 0, selectionEnd);
        });
        return;
      }

      case 'deleteSoftLineForward':
      case 'deleteHardLineForward': {
        commit(() => {
          inputController.deleteForward(value, selectionEnd, value.length);
        });
        return;
      }

      case 'deleteEntireSoftLine':
      case 'deleteEntireHardLine': {
        commit(() => {
          inputController.deleteBackward(value, 0, value.length);
        });
        return;
      }

      case 'historyUndo':
        if (inputController.canUndo) commit(() => inputController.undo());
        return;

      case 'historyRedo':
        if (inputController.canRedo) commit(() => inputController.redo());
        return;

      default:
        return;
    }
  }

  function handleKeyDown(event: KeyboardEvent): void {
    if (event.target !== input) return;
    if (!event.ctrlKey && !event.metaKey) return;

    const key: string = event.key.toLowerCase();
    const isUndo: boolean = key === 'z' && !event.shiftKey;
    const isRedo: boolean = (key === 'z' && event.shiftKey) || key === 'y';

    if (!isUndo && !isRedo) return;

    event.preventDefault();

    if (isUndo && inputController.canUndo) commit(() => inputController.undo());
    else if (isRedo && inputController.canRedo) commit(() => inputController.redo());
  }

  input.addEventListener('compositionend', handleCompositionEnd);
  input.addEventListener('beforeinput', handleBeforeInput);
  input.addEventListener('keydown', handleKeyDown);
  notify(buildState());

  return {
    getState: buildState,

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

    setRegion(region: RegionCode): void {
      commit(() => inputController.setRegion(region));
    },

    undo(): void {
      if (inputController.canUndo) commit(() => inputController.undo());
    },

    redo(): void {
      if (inputController.canRedo) commit(() => inputController.redo());
    },

    clearHistory(): void {
      inputController.clearHistory();
      notify(buildState());
    },

    getPhoneNumber(): PhoneNumber {
      return inputController.getPhoneNumber();
    },

    setRegionFilter(regions: readonly RegionCode[] | null): void {
      if (readonlyArraysEqual(regions, currentRegionFilter)) return;
      currentRegionFilter = regions;
      inputController.setRegionFilter(regions);
      notify(buildState());
    },

    setNumberTypeFilter(numberTypes: readonly NumberType[] | null): void {
      if (readonlyArraysEqual(numberTypes, currentNumberTypeFilter)) return;
      currentNumberTypeFilter = numberTypes;
      inputController.setNumberTypeFilter(numberTypes);
      notify(buildState());
    },

    destroy(): void {
      isDestroyed = true;
      ATTACHED_INPUTS.delete(input);
      input.removeEventListener('compositionend', handleCompositionEnd);
      input.removeEventListener('beforeinput', handleBeforeInput);
      input.removeEventListener('keydown', handleKeyDown);
      listeners.clear();
    },
  };
}
