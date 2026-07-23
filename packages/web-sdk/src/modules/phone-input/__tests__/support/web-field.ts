import type { InputController, InternationalDisplayConfig, NumberType, PhoneNumber, RegionCode } from '@telixon/core';
import { createInternationalInputController, createNationalInputController } from '@telixon/core';
import { readonlyArraysEqual } from '../../../../utils/readonly-arrays-equal';
import type { PhoneInput, PhoneInputState } from '../../models';
import { createPhoneInput } from '../../phone-input';
import { dispatchBeforeInput, dispatchCompositionEnd, dispatchKeyDown, placeCaret } from './dom-events';

export interface WebFieldConfig {
  readonly mode: 'national' | 'international';
  readonly defaultRegion?: RegionCode;
  readonly display?: InternationalDisplayConfig;
  readonly strict?: boolean;
}

/**
 * A phone input driven through DOM events, paired with a bare controller driven through its methods.
 * The adapter's `beforeinput` handler is a pass-through, so the same operation on both must land on
 * the same value and caret. The differential ops below feed both; the event-only ops feed just the
 * element, for cases the adapter translates on its own (word and line deletes, composition).
 */
export interface WebField {
  readonly value: string;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly state: PhoneInputState;
  readonly phoneNumber: PhoneNumber;

  readonly mirrorValue: string;
  readonly mirrorSelectionStart: number;
  readonly mirrorSelectionEnd: number;

  insert(text: string, inputType: string, start: number, end: number): void;
  deleteBackward(start: number, end: number): void;
  deleteForward(start: number, end: number): void;
  undoByKeyboard(): void;
  redoByKeyboard(): void;
  setValue(next: string): void;
  setRegion(region: RegionCode): void;
  setRegionFilter(regions: readonly RegionCode[] | null): void;
  setNumberTypeFilter(numberTypes: readonly NumberType[] | null): void;

  dispatchInputType(inputType: string, start: number, end: number): void;
  composition(text: string, start: number, end: number): void;

  destroy(): void;
}

type CallingCodeDisplay = Extract<InternationalDisplayConfig, { callingCodeInInput: true }>;

// Builds the DOM-bound input and a bare mirror controller from one config, so both see the same
// core options. Optional fields are omitted rather than passed as undefined.
function createControllers(
  config: WebFieldConfig,
  input: HTMLInputElement,
): { phone: PhoneInput; mirror: InputController } {
  const strict: boolean = config.strict === true;

  if (config.mode === 'national') {
    const core = { defaultRegion: config.defaultRegion ?? ('US' as RegionCode), strict };
    return {
      phone: createPhoneInput({ input, mode: 'national', ...core }),
      mirror: createNationalInputController(core),
    };
  }

  if (config.display?.callingCodeInInput === false) {
    const core = { defaultRegion: config.defaultRegion ?? ('US' as RegionCode), strict, display: config.display };
    return {
      phone: createPhoneInput({ input, mode: 'international', ...core }),
      mirror: createInternationalInputController(core),
    };
  }

  const core: { strict: boolean; defaultRegion?: RegionCode; display?: CallingCodeDisplay } = { strict };
  if (config.defaultRegion) core.defaultRegion = config.defaultRegion;
  if (config.display?.callingCodeInInput === true) core.display = config.display;
  return {
    phone: createPhoneInput({ input, mode: 'international', ...core }),
    mirror: createInternationalInputController(core),
  };
}

export function createWebField(config: WebFieldConfig): WebField {
  const input: HTMLInputElement = document.createElement('input');
  input.type = 'tel';
  document.body.appendChild(input);

  const { phone, mirror } = createControllers(config, input);
  let lastRegionFilter: readonly RegionCode[] | null = null;
  let lastNumberTypeFilter: readonly NumberType[] | null = null;

  return {
    get value(): string {
      return input.value;
    },
    get selectionStart(): number {
      return input.selectionStart ?? 0;
    },
    get selectionEnd(): number {
      return input.selectionEnd ?? 0;
    },
    get state(): PhoneInputState {
      return phone.getState();
    },
    get phoneNumber(): PhoneNumber {
      return phone.getPhoneNumber();
    },
    get mirrorValue(): string {
      return mirror.currentState.value;
    },
    get mirrorSelectionStart(): number {
      return mirror.currentState.selectionStart;
    },
    get mirrorSelectionEnd(): number {
      return mirror.currentState.selectionEnd;
    },

    insert(text: string, inputType: string, start: number, end: number): void {
      const value: string = input.value;
      placeCaret(input, start, end);
      dispatchBeforeInput(input, inputType, text);
      mirror.insert(value, text, start, end);
    },
    deleteBackward(start: number, end: number): void {
      const value: string = input.value;
      placeCaret(input, start, end);
      dispatchBeforeInput(input, 'deleteContentBackward');
      mirror.deleteBackward(value, start, end);
    },
    deleteForward(start: number, end: number): void {
      const value: string = input.value;
      placeCaret(input, start, end);
      dispatchBeforeInput(input, 'deleteContentForward');
      mirror.deleteForward(value, start, end);
    },
    undoByKeyboard(): void {
      dispatchKeyDown(input, 'z', { ctrlKey: true });
      if (mirror.canUndo) mirror.undo();
    },
    redoByKeyboard(): void {
      dispatchKeyDown(input, 'z', { ctrlKey: true, shiftKey: true });
      if (mirror.canRedo) mirror.redo();
    },
    setValue(next: string): void {
      phone.setValue(next);
      mirror.setValue(next);
    },
    setRegion(region: RegionCode): void {
      phone.setRegion(region);
      mirror.setRegion(region);
    },
    setRegionFilter(regions: readonly RegionCode[] | null): void {
      phone.setRegionFilter(regions);
      // The public setter caches by value; mirror the same no-op so the two stay in lockstep.
      if (!readonlyArraysEqual(regions, lastRegionFilter)) mirror.setRegionFilter(regions);
      lastRegionFilter = regions;
    },
    setNumberTypeFilter(numberTypes: readonly NumberType[] | null): void {
      phone.setNumberTypeFilter(numberTypes);
      if (!readonlyArraysEqual(numberTypes, lastNumberTypeFilter)) mirror.setNumberTypeFilter(numberTypes);
      lastNumberTypeFilter = numberTypes;
    },

    dispatchInputType(inputType: string, start: number, end: number): void {
      placeCaret(input, start, end);
      dispatchBeforeInput(input, inputType);
    },
    composition(text: string, start: number, end: number): void {
      placeCaret(input, start, end);
      dispatchCompositionEnd(input, text);
    },

    destroy(): void {
      phone.destroy();
      input.remove();
    },
  };
}

// The element value must always mirror the reported state, since the value only ever changes through
// an event the adapter applies. The caret is not compared here: a no-op event leaves the caret where
// the test placed it while the state keeps its own, exactly as a real caret sits apart between edits.
export function syncViolation(field: WebField): string | null {
  const { value, state } = field;
  if (value !== state.value) return `element value ${JSON.stringify(value)} !== state ${JSON.stringify(state.value)}`;
  return null;
}

/** The caret on the element stays inside the value. */
export function caretViolation(field: WebField): string | null {
  const { value, selectionStart, selectionEnd } = field;
  if (!Number.isInteger(selectionStart) || !Number.isInteger(selectionEnd)) return 'caret is not an integer';
  if (selectionStart < 0 || selectionStart > selectionEnd) return `caret range ${selectionStart}..${selectionEnd}`;
  if (selectionEnd > value.length) return `caret ${selectionEnd} past ${JSON.stringify(value)}`;
  return null;
}

/** A valid number is always possible. */
export function consistencyViolation(field: WebField): string | null {
  const phoneNumber: PhoneNumber = field.phoneNumber;
  if (phoneNumber.isValid() && !phoneNumber.isPossible())
    return `valid but not possible (${phoneNumber.getNationalNumber()})`;
  return null;
}

/** The element driven by events must match the controller driven by methods. */
export function differentialViolation(field: WebField): string | null {
  if (field.value !== field.mirrorValue) {
    return `value ${JSON.stringify(field.value)} !== mirror ${JSON.stringify(field.mirrorValue)}`;
  }
  if (field.selectionStart !== field.mirrorSelectionStart) {
    return `caret start ${field.selectionStart} !== mirror ${field.mirrorSelectionStart}`;
  }
  if (field.selectionEnd !== field.mirrorSelectionEnd) {
    return `caret end ${field.selectionEnd} !== mirror ${field.mirrorSelectionEnd}`;
  }
  return null;
}
