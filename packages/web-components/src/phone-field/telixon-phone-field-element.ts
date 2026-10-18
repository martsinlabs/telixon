import { ensureEngineReady, type ValidationError } from '@telixon/core';
import type { PhoneInput, PhoneInputState } from '@telixon/web-sdk';
import { announceFieldChange } from '../utils/field-channel';
import {
  AUTO_PLACEHOLDER_ATTRIBUTE,
  DISABLED_ATTRIBUTE,
  ERROR_MESSAGE_ATTRIBUTE,
  MIRRORED_ATTRIBUTES,
  NAME_ATTRIBUTE,
  OBSERVED_ATTRIBUTES,
  OPTION_ATTRIBUTES,
  READONLY_ATTRIBUTE,
  REQUIRED_ATTRIBUTE,
  VALUE_ATTRIBUTE,
} from './constants/attributes';
import { ENGINE_LOADING_STATE } from './constants/custom-states';
import { DEFAULT_PHONE_FIELD_OPTIONS } from './constants/default-options';
import { CHANGE_EVENT, STATE_EVENT } from './constants/events';
import { HOST_INPUT_SELECTOR } from './constants/host-input';
import { INVALID_EVENT, TOUCH_EVENT } from './constants/touch-events';
import type {
  TelixonPhoneChangeDetail,
  TelixonPhoneFieldOptions,
  TelixonPhoneMessage,
  TelixonPhoneStateDetail,
} from './models';
import { attributeOptions } from './utils/attribute-options';
import { defaultPhoneMessage } from './utils/default-phone-message';
import { createFormAssociation, type FormAssociation, type FormReport } from './utils/form-association';
import { validateOptions } from './utils/validate-options';
import { createWidgetBridge, type WidgetBridge, type WidgetReport } from './utils/widget-bridge';

/** The flags the page put on the input itself. The host's own flags join them. */
type AuthoredFlags = {
  readonly readOnly: boolean;
  readonly disabled: boolean;
};

/**
 * Turns the `<input>` inside it into a phone field that takes part in its form.
 *
 * The form value is the number in E.164 while it is valid and `null` otherwise, under the element's
 * `name`. An invalid number blocks submission with a message anchored at the input. An empty
 * `required` field does the same. The field runs once the engine has loaded. Until then, and on the
 * server, the input stays plain.
 *
 * ```html
 * <telixon-phone-field name="phone" default-region="US">
 *   <input type="tel" autocomplete="tel" />
 * </telixon-phone-field>
 * ```
 */
export class TelixonPhoneFieldElement extends HTMLElement {
  static readonly formAssociated: boolean = true;
  static readonly observedAttributes: readonly string[] = OBSERVED_ATTRIBUTES;

  private readonly internals: ElementInternals = this.attachInternals();
  private readonly association: FormAssociation = createFormAssociation({
    internals: this.internals,
    anchor: (): HTMLInputElement | null => this.attachedInput,
  });

  private bridge: WidgetBridge | null = null;
  private attachedInput: HTMLInputElement | null = null;
  private authored: AuthoredFlags | null = null;
  private observer: MutationObserver | null = null;
  private isEngineReady: boolean = false;
  private isDisabledByForm: boolean = false;
  private explicitOptions: TelixonPhoneFieldOptions | null = null;
  // The attribute options, parsed once per attribute change and reused for every state.
  private parsedAttributeOptions: TelixonPhoneFieldOptions | null = null;
  private messageFunction: TelixonPhoneMessage | null = null;
  private pendingValue: string | null = null;
  private hasPendingValue: boolean = false;

  constructor() {
    super();
    this.addEventListener(TOUCH_EVENT, (event: Event): void => {
      if (event.target === this.attachedInput) this.association.touch();
    });
    this.addEventListener(INVALID_EVENT, (): void => this.association.touch());
  }

  /** The input the element runs on, the first `<input>` inside it. `null` while there is none. */
  get inputElement(): HTMLInputElement | null {
    return this.attachedInput ?? this.querySelector<HTMLInputElement>(HOST_INPUT_SELECTOR);
  }

  /**
   * The options of `createPhoneInput` the field runs with. A set object replaces the attributes as a
   * whole. `null` hands the options back to the attributes.
   */
  get options(): TelixonPhoneFieldOptions {
    return this.explicitOptions ?? this.attributeOptions();
  }

  set options(options: TelixonPhoneFieldOptions | null) {
    this.explicitOptions = options === null ? null : validateOptions(options);
    this.applyOptions();
  }

  /**
   * The number in E.164 while it is valid and `null` otherwise. A set writes through the widget,
   * unless it carries the value the field already reports. `''` clears the field.
   */
  get value(): string | null {
    if (this.bridge !== null) return this.bridge.value();
    return this.hasPendingValue ? this.pendingValue : null;
  }

  set value(value: string | null) {
    if (this.bridge === null) {
      this.pendingValue = value;
      this.hasPendingValue = true;
      return;
    }
    if (value === this.bridge.value()) return;
    this.bridge.write(value);
  }

  /** The widget's latest state, `null` until the field is live. */
  get state(): PhoneInputState | null {
    return this.bridge?.state() ?? null;
  }

  /** The web-sdk phone input behind the field, `null` until the field is live. */
  get phone(): PhoneInput | null {
    return this.bridge?.phone() ?? null;
  }

  /** The fault of an invalid number, `null` while the number is valid or holds no digits. */
  get fault(): ValidationError | null {
    return this.bridge?.fault() ?? null;
  }

  /** Turns a fault into its message. `null` leaves the message to the `error-message` attribute or to the default. */
  get errorMessage(): TelixonPhoneMessage | null {
    return this.messageFunction;
  }

  set errorMessage(message: TelixonPhoneMessage | null) {
    this.messageFunction = message;
    this.reportToForm();
  }

  /** Whether the form or the `disabled` attribute has disabled the field. A set reflects to the attribute. */
  get disabled(): boolean {
    return this.isDisabledByForm;
  }

  set disabled(isDisabled: boolean) {
    this.toggleAttribute(DISABLED_ATTRIBUTE, isDisabled);
  }

  /** Whether the field must hold a number. Reflected to the `required` attribute. */
  get required(): boolean {
    return this.hasAttribute(REQUIRED_ATTRIBUTE);
  }

  set required(isRequired: boolean) {
    this.toggleAttribute(REQUIRED_ATTRIBUTE, isRequired);
  }

  /** Whether the field is read-only. Reflected to the `readonly` attribute and mirrored onto the input. */
  get readOnly(): boolean {
    return this.hasAttribute(READONLY_ATTRIBUTE);
  }

  set readOnly(isReadOnly: boolean) {
    this.toggleAttribute(READONLY_ATTRIBUTE, isReadOnly);
  }

  /** The form the element belongs to, `null` outside any. */
  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  /** The name the value is submitted under. Reflected to the `name` attribute. */
  get name(): string {
    return this.getAttribute(NAME_ATTRIBUTE) ?? '';
  }

  set name(name: string) {
    this.setAttribute(NAME_ATTRIBUTE, name);
  }

  get validity(): ValidityState {
    return this.internals.validity;
  }

  get validationMessage(): string {
    return this.internals.validationMessage;
  }

  get willValidate(): boolean {
    return this.internals.willValidate;
  }

  get labels(): NodeList {
    return this.internals.labels;
  }

  checkValidity(): boolean {
    return this.internals.checkValidity();
  }

  reportValidity(): boolean {
    this.association.touch();
    return this.internals.reportValidity();
  }

  /** Move focus into the input. */
  override focus(options?: FocusOptions): void {
    this.inputElement?.focus(options);
  }

  connectedCallback(): void {
    this.observer = new MutationObserver((): void => this.attachToInput());
    this.observer.observe(this, { childList: true, subtree: true });
    if (this.isEngineReady) {
      this.attachToInput();
      return;
    }
    this.internals.states.add(ENGINE_LOADING_STATE);
    ensureEngineReady().then(
      (): void => {
        this.isEngineReady = true;
        this.internals.states.delete(ENGINE_LOADING_STATE);
        if (this.isConnected) this.attachToInput();
      },
      (error: unknown): void => {
        this.internals.states.delete(ENGINE_LOADING_STATE);
        reportError(error);
      },
    );
  }

  disconnectedCallback(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.detachFromInput();
  }

  attributeChangedCallback(name: string, previous: string | null, next: string | null): void {
    if (previous === next) return;
    if (OPTION_ATTRIBUTES.includes(name)) {
      this.parsedAttributeOptions = null;
      // While an options object is set, a changed attribute only refreshes the cache.
      if (this.explicitOptions === null) this.applyOptions();
    } else if (MIRRORED_ATTRIBUTES.includes(name)) this.mirrorFlags();
    else if (name === REQUIRED_ATTRIBUTE || name === ERROR_MESSAGE_ATTRIBUTE) this.reportToForm();
    else if (name === AUTO_PLACEHOLDER_ATTRIBUTE) this.applyPlaceholder();
  }

  formDisabledCallback(isDisabled: boolean): void {
    this.isDisabledByForm = isDisabled;
    this.mirrorFlags();
  }

  formResetCallback(): void {
    this.association.untouch();
    this.value = this.getAttribute(VALUE_ATTRIBUTE) ?? '';
  }

  formStateRestoreCallback(state: unknown): void {
    if (typeof state === 'string') this.value = state;
  }

  private attributeOptions(): TelixonPhoneFieldOptions {
    if (this.parsedAttributeOptions === null) {
      const hasOptionAttributes: boolean = OPTION_ATTRIBUTES.some((attribute: string): boolean =>
        this.hasAttribute(attribute),
      );
      this.parsedAttributeOptions = hasOptionAttributes ? attributeOptions(this) : DEFAULT_PHONE_FIELD_OPTIONS;
    }
    return this.parsedAttributeOptions;
  }

  // An empty message from the attribute or the function falls back to the default, which the form needs non-empty.
  private currentMessage(): TelixonPhoneMessage {
    const text: string | null = this.getAttribute(ERROR_MESSAGE_ATTRIBUTE);
    const custom: TelixonPhoneMessage | null = this.messageFunction;
    return (fault: ValidationError): string => custom?.(fault) || text || defaultPhoneMessage(fault);
  }

  // The input may arrive after the element, as it does under the parser, or be replaced by a framework.
  private attachToInput(): void {
    if (!this.isEngineReady || !this.isConnected) return;
    const input: HTMLInputElement | null = this.querySelector<HTMLInputElement>(HOST_INPUT_SELECTOR);
    if (input === this.attachedInput) return;
    this.detachFromInput();
    if (input === null) return;
    try {
      this.attach(input);
    } catch (error: unknown) {
      // A rejected option or input leaves the field detached. The next change tries again.
      this.detachFromInput();
      reportError(error);
    }
  }

  private attach(input: HTMLInputElement): void {
    const options: TelixonPhoneFieldOptions = this.options;
    this.attachedInput = input;
    this.authored = { readOnly: input.readOnly, disabled: input.disabled };
    this.mirrorFlags();
    const bridge: WidgetBridge = createWidgetBridge({
      element: input,
      onReport: (report: WidgetReport): void => this.handleReport(report),
      onValueChange: (value: string | null): void => this.dispatchChange(value),
      onWidget: (): void => announceFieldChange(this),
    });
    this.bridge = bridge;
    // A value set on the element wins. The attribute only fills an input that holds nothing yet.
    const initialValue: string | null = this.hasPendingValue
      ? this.pendingValue
      : input.value === ''
        ? this.getAttribute(VALUE_ATTRIBUTE)
        : null;
    this.pendingValue = null;
    this.hasPendingValue = false;
    if (initialValue !== null) bridge.write(initialValue);
    bridge.attach(options);
  }

  private detachFromInput(): void {
    this.bridge?.destroy();
    this.bridge = null;
    this.attachedInput = null;
    this.authored = null;
  }

  private applyOptions(): void {
    if (this.bridge !== null) {
      this.bridge.update(this.options);
      return;
    }
    this.attachToInput();
    // Without a widget to announce, the options reach the pickers through the field itself.
    if (this.bridge === null) announceFieldChange(this);
  }

  // The host's flags join the ones the page wrote on the input itself.
  private mirrorFlags(): void {
    const input: HTMLInputElement | null = this.attachedInput;
    const authored: AuthoredFlags | null = this.authored;
    if (input === null || authored === null) return;
    input.readOnly = authored.readOnly || this.hasAttribute(READONLY_ATTRIBUTE);
    input.disabled = authored.disabled || this.isDisabledByForm;
  }

  private applyPlaceholder(): void {
    const input: HTMLInputElement | null = this.attachedInput;
    if (input === null || !this.hasAttribute(AUTO_PLACEHOLDER_ATTRIBUTE)) return;
    const placeholder: string = this.state?.placeholder ?? '';
    if (input.placeholder !== placeholder) input.placeholder = placeholder;
  }

  private handleReport(report: WidgetReport): void {
    this.association.report(this.toFormReport(report));
    this.applyPlaceholder();
    const detail: TelixonPhoneStateDetail = { state: report.state };
    this.dispatchEvent(new CustomEvent<TelixonPhoneStateDetail>(STATE_EVENT, { detail, bubbles: true }));
  }

  private reportToForm(): void {
    const state: PhoneInputState | null = this.state;
    if (state === null) return;
    this.association.report(this.toFormReport({ state, value: this.value, fault: this.fault }));
  }

  private toFormReport(report: WidgetReport): FormReport {
    return {
      value: report.value,
      text: report.state.value,
      fault: report.fault,
      required: this.hasAttribute(REQUIRED_ATTRIBUTE),
      message: this.currentMessage(),
    };
  }

  private dispatchChange(value: string | null): void {
    const detail: TelixonPhoneChangeDetail = { value };
    this.dispatchEvent(new CustomEvent<TelixonPhoneChangeDetail>(CHANGE_EVENT, { detail, bubbles: true }));
  }
}
