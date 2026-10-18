import type { PhoneNumber, ValidationError } from '@telixon/core';
import { createPhoneInput, type PhoneInput, type PhoneInputState } from '@telixon/web-sdk';
import type { TelixonPhoneFieldOptions } from '../models';
import { formError } from './form-error';
import { formValue } from './form-value';
import { requiresRebuild } from './requires-rebuild';
import { toWidgetWrite, type WidgetWrite } from './widget-write';

/** What the widget reports after a change, read together by the element. */
export type WidgetReport = {
  readonly state: PhoneInputState;
  /** The number in E.164 while it is valid and `null` otherwise. */
  readonly value: string | null;
  /** The fault of an invalid number, `null` while the number is valid or holds no digits. */
  readonly fault: ValidationError | null;
};

export type WidgetBridgeOptions = {
  element: HTMLInputElement;
  /** Gets every state the widget reports, with the value and the fault it stands for. */
  onReport: (report: WidgetReport) => void;
  /** Gets the value whenever an edit or new options change it. A written value never reaches it. */
  onValueChange: (value: string | null) => void;
  /** Gets the widget when the bridge creates one and `null` when it destroys one. */
  onWidget: (phone: PhoneInput | null) => void;
};

/** A web-sdk phone input kept in step with the element it belongs to. */
export type WidgetBridge = {
  /** The widget, `null` before `attach` and after `destroy`. */
  phone(): PhoneInput | null;
  /** The latest state the widget reported, `null` before `attach`. */
  state(): PhoneInputState | null;
  /** The latest value, `null` before `attach` and while the number is not valid. */
  value(): string | null;
  /** The latest fault, `null` before `attach` and while the number is valid. */
  fault(): ValidationError | null;
  /** Create the widget over the element's current text. A no-op once one exists or after `destroy`. */
  attach(options: TelixonPhoneFieldOptions): void;
  /** Apply new options, through the widget's setters where it has them and with a new widget otherwise. */
  update(options: TelixonPhoneFieldOptions): void;
  /** Show text the form or the page holds. */
  write(text: string | null): void;
  /** Destroy the widget. Idempotent. */
  destroy(): void;
};

// Why a widget state exists. An edit or new options may change the value, while a write from the page and the seed before the widget existed never report one.
type Reporting = 'edit' | 'options' | 'write' | 'seed';

export function createWidgetBridge(options: WidgetBridgeOptions): WidgetBridge {
  const { element, onReport, onValueChange, onWidget } = options;

  let phone: PhoneInput | null = null;
  let state: PhoneInputState | null = null;
  let unsubscribe: (() => void) | null = null;
  let appliedOptions: TelixonPhoneFieldOptions | null = null;
  let heldValue: string | null = null;
  let heldFault: ValidationError | null = null;
  let writtenText: string | null = null;
  let reporting: Reporting = 'edit';
  let isDestroyed: boolean = false;

  function sync(widget: PhoneInput, widgetState: PhoneInputState): void {
    state = widgetState;
    const phoneNumber: PhoneNumber = widget.getPhoneNumber();
    const nextValue: string | null = formValue(phoneNumber);
    const nextFault: ValidationError | null = formError(phoneNumber);
    const valueChanged: boolean = nextValue !== heldValue;
    heldValue = nextValue;
    heldFault = nextFault;
    onReport({ state: widgetState, value: nextValue, fault: nextFault });

    // A written value is the page's own, which the page hears nothing about.
    if (reporting === 'write' || reporting === 'seed' || !valueChanged) return;
    onValueChange(nextValue);
  }

  function create(nextOptions: TelixonPhoneFieldOptions): PhoneInput {
    const widget: PhoneInput = createPhoneInput({ ...nextOptions, input: element });
    appliedOptions = nextOptions;
    unsubscribe = widget.subscribe((widgetState: PhoneInputState): void => sync(widget, widgetState));
    phone = widget;
    onWidget(widget);
    return widget;
  }

  function show(widget: PhoneInput, text: string, widgetOptions: TelixonPhoneFieldOptions): void {
    const write: WidgetWrite = toWidgetWrite(text, widgetOptions);
    if (write.region !== null) widget.setRegion(write.region);
    widget.setValue(write.text);
  }

  function teardown(): void {
    unsubscribe?.();
    unsubscribe = null;
    const widget: PhoneInput | null = phone;
    phone = null;
    if (widget === null) return;
    widget.destroy();
    onWidget(null);
  }

  function withReporting(mode: Reporting, run: () => void): void {
    const previous: Reporting = reporting;
    reporting = mode;
    try {
      run();
    } finally {
      reporting = previous;
    }
  }

  // Several widget calls reach the element as their sum, reported once under `mode`.
  function build(mode: Reporting, nextOptions: TelixonPhoneFieldOptions, text: string | null): void {
    const held = { value: heldValue, fault: heldFault };
    withReporting('write', () => {
      const widget: PhoneInput = create(nextOptions);
      if (text === null) return;
      show(widget, text, nextOptions);
      widget.clearHistory();
    });
    heldValue = held.value;
    heldFault = held.fault;

    const widget: PhoneInput | null = phone;
    if (widget !== null) withReporting(mode, () => sync(widget, widget.getState()));
  }

  function rebuild(widget: PhoneInput, nextOptions: TelixonPhoneFieldOptions): void {
    const phoneNumber: PhoneNumber = widget.getPhoneNumber();
    // A valid number moves over whole, whatever the new options show. Other text stays for the new widget to read.
    const carried: string | null = phoneNumber.isValid() ? phoneNumber.formatE164() : null;
    // Without national digits the field holds a calling code at most, which the new options seed again.
    const startsOver: boolean = carried !== null || phoneNumber.getNationalNumber() === '';
    teardown();
    if (startsOver) element.value = '';
    build('options', nextOptions, carried);
  }

  return {
    phone: (): PhoneInput | null => phone,
    state: (): PhoneInputState | null => state,
    value: (): string | null => heldValue,
    fault: (): ValidationError | null => heldFault,

    attach(nextOptions: TelixonPhoneFieldOptions): void {
      if (isDestroyed || phone !== null) return;
      // A field still holding exactly what was written tells the element nothing new about its value.
      const written: string | null = writtenText !== null && element.value === writtenText ? writtenText : null;
      writtenText = null;
      if (written === null) {
        build('edit', nextOptions, null);
        return;
      }
      // The widget takes the written number through `show`, the same way as a later write.
      element.value = '';
      build('seed', nextOptions, written === '' ? null : written);
    },

    update(nextOptions: TelixonPhoneFieldOptions): void {
      const widget: PhoneInput | null = phone;
      // Before the widget exists, attach reads the latest options on its own.
      if (widget === null || appliedOptions === null) return;
      const previousOptions: TelixonPhoneFieldOptions = appliedOptions;
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
      const widget: PhoneInput | null = phone;
      if (widget === null) {
        writtenText = shown;
        element.value = shown;
        return;
      }
      const widgetOptions: TelixonPhoneFieldOptions | null = appliedOptions;
      if (widgetOptions !== null) withReporting('write', () => show(widget, shown, widgetOptions));
    },

    destroy(): void {
      if (isDestroyed) return;
      isDestroyed = true;
      teardown();
    },
  };
}
