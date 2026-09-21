import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectorRef,
  DestroyRef,
  Directive,
  ElementRef,
  ErrorHandler,
  forwardRef,
  inject,
  input,
  Renderer2,
  untracked,
  type InputSignalWithTransform,
  type Signal,
} from '@angular/core';
import {
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  type ControlValueAccessor,
  type ValidationErrors,
  type Validator,
} from '@angular/forms';
import { ensureEngineReady } from '@telixon/core';
import type { PhoneInput, PhoneInputState } from '@telixon/web-sdk';
import type { TelixonPhoneInputOptions } from './models';
import { createFormControlBridge, type FormControlBridge } from './utils/form-control-bridge';
import { toValidationErrors } from './utils/form-error';
import { toPhoneInputOptions } from './utils/phone-input-options';

const NOOP = (): void => undefined;

/**
 * Turns an `<input>` into a phone field. The field formats as the user types, keeps the caret and the
 * history, and works as a form control.
 *
 * The form value is the number in E.164 while it is valid and `null` otherwise. The validator reports
 * an invalid number under `telixonPhone` with the kind of the fault. A field with no digits after the
 * calling code reports none, which leaves emptiness to `Validators.required`. The field comes to life
 * once the engine has loaded in the browser. On the server it stays a plain input.
 *
 * ```html
 * <input telixonPhoneInput [formControl]="phone" />
 * ```
 */
@Directive({
  selector: 'input[telixonPhoneInput]',
  exportAs: 'telixonPhoneInput',
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TelixonPhoneInput), multi: true },
    { provide: NG_VALIDATORS, useExisting: forwardRef(() => TelixonPhoneInput), multi: true },
  ],
  host: { '(blur)': 'markTouched()' },
})
export class TelixonPhoneInput implements ControlValueAccessor, Validator {
  /** The options of `createPhoneInput` for this field. A bare attribute makes an international field. */
  readonly options: InputSignalWithTransform<TelixonPhoneInputOptions, TelixonPhoneInputOptions | ''> = input.required({
    alias: 'telixonPhoneInput',
    transform: toPhoneInputOptions,
  });

  private readonly element: HTMLInputElement = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer: Renderer2 = inject(Renderer2);
  private readonly changeDetector: ChangeDetectorRef = inject(ChangeDetectorRef);

  private onChange: (value: string | null) => void = NOOP;
  private onTouched: () => void = NOOP;
  private onValidatorChange: () => void = NOOP;

  // The widget listens to the input on its own, which leaves no Angular listener to mark the view.
  private readonly bridge: FormControlBridge = createFormControlBridge({
    element: this.element,
    renderer: this.renderer,
    onValue: (value: string | null): void => {
      this.onChange(value);
      this.changeDetector.markForCheck();
    },
    onErrorChange: (): void => {
      this.onValidatorChange();
      this.changeDetector.markForCheck();
    },
  });

  /**
   * The web-sdk phone input behind the field, `null` until the engine has loaded. New filters apply to
   * it, while any other new option replaces it.
   */
  readonly phone: Signal<PhoneInput | null> = this.bridge.phone;

  /** The field's latest state, `null` until the engine has loaded. */
  readonly state: Signal<PhoneInputState | null> = this.bridge.state;

  constructor() {
    const errorHandler: ErrorHandler = inject(ErrorHandler);

    afterNextRender(() => {
      ensureEngineReady()
        .then((): void => this.bridge.attach(this.options()))
        .catch((error: unknown): void => errorHandler.handleError(error));
    });

    afterRenderEffect(() => {
      const options: TelixonPhoneInputOptions = this.options();
      untracked(() => this.bridge.update(options));
    });

    inject(DestroyRef).onDestroy(() => this.bridge.destroy());
  }

  /** Move focus into the field. */
  focus(options?: FocusOptions): void {
    this.element.focus(options);
  }

  writeValue(value: unknown): void {
    this.bridge.write(typeof value === 'string' ? value : null);
  }

  registerOnChange(onChange: (value: string | null) => void): void {
    this.onChange = onChange;
  }

  registerOnTouched(onTouched: () => void): void {
    this.onTouched = onTouched;
  }

  setDisabledState(isDisabled: boolean): void {
    this.renderer.setProperty(this.element, 'disabled', isDisabled);
  }

  validate(): ValidationErrors | null {
    return toValidationErrors(this.bridge.error());
  }

  registerOnValidatorChange(onValidatorChange: () => void): void {
    this.onValidatorChange = onValidatorChange;
  }

  protected markTouched(): void {
    this.onTouched();
  }
}
