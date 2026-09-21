import { signal, type Renderer2, type Signal, type WritableSignal } from '@angular/core';
import type { PhoneNumber, ValidationError } from '@telixon/core';
import { createPhoneInput, type PhoneInput, type PhoneInputState } from '@telixon/web-sdk';
import type { TelixonPhoneInputOptions } from '../models';
import { formError } from './form-error';
import { formValue } from './form-value';
import { requiresRebuild } from './requires-rebuild';
import { sameValidationError } from './same-validation-error';

export type FormControlBridgeOptions = {
  element: HTMLInputElement;
  renderer: Renderer2;
  /** Gets the form value on every edit and whenever new options change it. A write from the form never reaches it. */
  onValue: (value: string | null) => void;
  /** Called when the error changes while the form value stays the same. */
  onErrorChange: () => void;
};

/** A web-sdk phone input kept in step with the callbacks of an Angular form control. */
export type FormControlBridge = {
  /** The widget, `null` before `attach` and after `destroy`. */
  readonly phone: Signal<PhoneInput | null>;
  /** The latest state the widget reported, `null` before `attach`. */
  readonly state: Signal<PhoneInputState | null>;
  /** Create the widget over the element's current text. A no-op once one exists or after `destroy`. */
  attach(options: TelixonPhoneInputOptions): void;
  /** Apply new options, through the widget's setters where it has them and with a new widget otherwise. */
  update(options: TelixonPhoneInputOptions): void;
  /** Show text the form holds. */
  write(text: string | null): void;
  /** The error the form sees, `null` while no widget exists. */
  error(): ValidationError | null;
  /** Destroy the widget. Idempotent. */
  destroy(): void;
};

// The cause of a widget state. An edit reports a changed text, while new options report a changed value.
// A write is validated by the form itself, while text written before the widget existed was validated against none.
type Reporting = 'edit' | 'options' | 'write' | 'seed';

export function createFormControlBridge(options: FormControlBridgeOptions): FormControlBridge {
  const { element, renderer, onValue, onErrorChange } = options;

  const phone: WritableSignal<PhoneInput | null> = signal(null);
  const state: WritableSignal<PhoneInputState | null> = signal(null);
  let unsubscribe: (() => void) | null = null;
  let appliedOptions: TelixonPhoneInputOptions | null = null;
  let heldValue: string | null = null;
  let heldError: ValidationError | null = null;
  let heldText: string | null = null;
  let writtenText: string | null = null;
  let reporting: Reporting = 'edit';
  let isDestroyed: boolean = false;

  function sync(widget: PhoneInput, widgetState: PhoneInputState): void {
    state.set(widgetState);
    const phoneNumber: PhoneNumber = widget.getPhoneNumber();
    const nextValue: string | null = formValue(phoneNumber);
    const nextError: ValidationError | null = formError(phoneNumber);
    const valueChanged: boolean = nextValue !== heldValue;
    const errorChanged: boolean = !sameValidationError(heldError, nextError);
    const textChanged: boolean = widgetState.value !== heldText;
    heldValue = nextValue;
    heldError = nextError;
    heldText = widgetState.value;

    if (reporting === 'write') return;
    const isEdit: boolean = reporting === 'edit' && (textChanged || valueChanged);
    const isNewValue: boolean = reporting === 'options' && valueChanged;
    // Handing the value over marks the control dirty and makes the form validate, which reads the error set above.
    if (isEdit || isNewValue) {
      onValue(nextValue);
      return;
    }
    if (errorChanged) onErrorChange();
  }

  function create(nextOptions: TelixonPhoneInputOptions): void {
    const widget: PhoneInput = createPhoneInput({ ...nextOptions, input: element });
    appliedOptions = nextOptions;
    unsubscribe = widget.subscribe((widgetState: PhoneInputState): void => sync(widget, widgetState));
    phone.set(widget);
    sync(widget, widget.getState());
  }

  function teardown(): void {
    unsubscribe?.();
    unsubscribe = null;
    phone()?.destroy();
    phone.set(null);
  }

  function rebuild(widget: PhoneInput, nextOptions: TelixonPhoneInputOptions): void {
    // Without national digits the field holds a calling code at most, which the new options seed again.
    const startsOver: boolean = widget.getPhoneNumber().getNationalNumber() === '';
    teardown();
    if (startsOver) renderer.setProperty(element, 'value', '');
    // The new widget reads the text the element holds and formats it again.
    create(nextOptions);
  }

  function withReporting(mode: Reporting, run: () => void): void {
    reporting = mode;
    try {
      run();
    } finally {
      reporting = 'edit';
    }
  }

  return {
    phone: phone.asReadonly(),
    state: state.asReadonly(),

    attach(nextOptions: TelixonPhoneInputOptions): void {
      if (isDestroyed || phone() !== null) return;
      // A field still holding exactly what the form wrote tells the form nothing new about its value.
      const holdsWrittenText: boolean = writtenText !== null && element.value === writtenText;
      writtenText = null;
      withReporting(holdsWrittenText ? 'seed' : 'edit', () => create(nextOptions));
    },

    update(nextOptions: TelixonPhoneInputOptions): void {
      const widget: PhoneInput | null = phone();
      // Before the widget exists, attach reads the latest options on its own.
      if (widget === null || appliedOptions === null) return;
      const previousOptions: TelixonPhoneInputOptions = appliedOptions;
      withReporting('options', () => {
        if (requiresRebuild(previousOptions, nextOptions)) {
          rebuild(widget, nextOptions);
          return;
        }
        appliedOptions = nextOptions;
        widget.setRegionFilter(nextOptions.regionFilter ?? null);
        widget.setNumberTypeFilter(nextOptions.numberTypeFilter ?? null);
      });
    },

    write(text: string | null): void {
      const shown: string = text ?? '';
      const widget: PhoneInput | null = phone();
      if (widget === null) {
        writtenText = shown;
        renderer.setProperty(element, 'value', shown);
        return;
      }
      withReporting('write', () => widget.setValue(shown));
    },

    error(): ValidationError | null {
      return heldError;
    },

    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      teardown();
    },
  };
}
