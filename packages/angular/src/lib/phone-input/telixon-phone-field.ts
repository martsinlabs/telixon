import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  ErrorHandler,
  inject,
  input,
  model,
  output,
  Renderer2,
  untracked,
  type InputSignal,
  type InputSignalWithTransform,
  type ModelSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import {
  transformedValue,
  type FormValueControl,
  type ParseResult,
  type TransformedValueSignal,
} from '@angular/forms/signals';
import { ensureEngineReady, type ValidationError } from '@telixon/core';
import type { PhoneInput, PhoneInputState } from '@telixon/web-sdk';
import { CLASSIC_FORM_DIRECTIVE_MESSAGE, CLASSIC_FORM_DIRECTIVES } from './constants/classic-form-directives';
import { ERROR_REPORT } from './constants/parse-report';
import type {
  ParseReport,
  TelixonPhoneFieldError,
  TelixonPhoneHost,
  TelixonPhoneInputOptions,
  TelixonPhoneMessage,
} from './models';
import { defaultPhoneMessage } from './utils/default-phone-message';
import { createFormControlBridge, type FormControlBridge } from './utils/form-control-bridge';
import { toPhoneFieldError } from './utils/phone-field-error';
import { toPhoneInputOptions } from './utils/phone-input-options';

/**
 * Puts a phone field on an `<input>` inside a Signal Form.
 *
 * The field's value is the number in E.164 while it is valid and `null` otherwise. An invalid number
 * reaches the field's `errors()` as a parse error of kind `telixonPhone`, which carries the fault and
 * a message. A field with no digits after the calling code reports no error, which leaves the empty
 * field to the schema's `required`. It runs the same widget as {@link TelixonPhoneInput}, with the same
 * lifecycle.
 *
 * ```html
 * <input telixonPhoneField [formField]="form.phone" />
 * ```
 */
@Directive({
  selector: 'input[telixonPhoneField]',
  exportAs: 'telixonPhoneField',
  host: { '(blur)': 'touch.emit()' },
})
export class TelixonPhoneField implements FormValueControl<string | null>, TelixonPhoneHost {
  /** The options of `createPhoneInput` for this field. A bare attribute makes an international field. */
  readonly options: InputSignalWithTransform<TelixonPhoneInputOptions, TelixonPhoneInputOptions | ''> = input.required({
    alias: 'telixonPhoneField',
    transform: toPhoneInputOptions,
  });

  /** The number in E.164 while it is valid and `null` otherwise. */
  readonly value: ModelSignal<string | null> = model<string | null>(null);

  /** Whether the field is disabled. A bare attribute counts as `true`. */
  readonly disabled: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  /** Whether the field is read-only. A bare attribute counts as `true`. */
  readonly readonly: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  /** Whether the field is required. A bare attribute counts as `true`. */
  readonly required: InputSignalWithTransform<boolean, unknown> = input(false, { transform: booleanAttribute });

  /** Turns a fault into the message of the error. English by default. */
  readonly errorMessage: InputSignal<TelixonPhoneMessage> = input<TelixonPhoneMessage>(defaultPhoneMessage);

  /** Fires when focus leaves the field, which marks it touched. */
  readonly touch: OutputEmitterRef<void> = output();

  /** The input the directive sits on. */
  readonly element: HTMLInputElement = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  private readonly renderer: Renderer2 = inject(Renderer2);
  private nextReport: ParseReport = ERROR_REPORT;
  private resetPending: boolean = false;

  private readonly bridge: FormControlBridge = createFormControlBridge({
    element: this.element,
    renderer: this.renderer,
    onValue: (value: string | null): void => this.edit(value),
    onErrorChange: (): void => this.report(ERROR_REPORT),
  });

  /** The web-sdk phone input behind the field, `null` until the field is live. */
  readonly phone: Signal<PhoneInput | null> = this.bridge.phone;

  /** The field's latest state, `null` until the field is live. */
  readonly state: Signal<PhoneInputState | null> = this.bridge.state;

  // The raw side holds the text the widget shows. A parse reads the fault the bridge resolved for that text.
  private readonly text: TransformedValueSignal<string> = transformedValue(this.value, {
    parse: (): ParseResult<string | null> => this.parse(),
    format: (value: string | null): string => value ?? '',
  });

  constructor() {
    for (const classic of CLASSIC_FORM_DIRECTIVES) {
      if (inject(classic, { optional: true, self: true }) !== null) throw new Error(CLASSIC_FORM_DIRECTIVE_MESSAGE);
    }
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

    // The form puts the value it writes or resets to on the raw side. Text the widget reported is on screen already.
    effect(() => {
      const text: string = this.text();
      untracked(() => this.show(text));
    });

    // A new message function rewrites the error the field holds.
    effect(() => {
      this.errorMessage();
      untracked(() => {
        if (this.text.parseErrors().length > 0) this.report(ERROR_REPORT);
      });
    });

    effect(() => this.renderer.setProperty(this.element, 'disabled', this.disabled()));
    effect(() => this.renderer.setProperty(this.element, 'readOnly', this.readonly()));
    effect(() => this.renderer.setProperty(this.element, 'required', this.required()));

    inject(DestroyRef).onDestroy(() => this.bridge.destroy());
  }

  /** Move focus into the field. */
  focus(options?: FocusOptions): void {
    this.element.focus(options);
  }

  /** Drop the undo history. A form reset calls it and then shows the field's value again. */
  reset(): void {
    this.resetPending = true;
    this.phone()?.clearHistory();
  }

  private shownText(): string {
    return this.state()?.value ?? this.element.value;
  }

  // Text from the form goes into the widget, or into the plain input until the field is live.
  // The write that follows a reset starts the undo history over.
  private show(text: string): void {
    const shown: string | undefined = this.state()?.value;
    if (shown !== undefined && text === shown) return;
    const value: string | null = text === '' ? null : text;
    this.bridge.write(value);
    this.report({ kind: 'value', value });
    if (this.resetPending) this.phone()?.clearHistory();
    this.resetPending = false;
  }

  // An edit the widget reported ends the fresh start of a reset.
  private edit(value: string | null): void {
    this.resetPending = false;
    this.report({ kind: 'value', value });
  }

  // Setting the raw text runs the parse, which reads `nextReport` to shape its result.
  private report(next: ParseReport): void {
    this.nextReport = next;
    try {
      this.text.set(this.shownText());
    } finally {
      this.nextReport = ERROR_REPORT;
    }
  }

  private parse(): ParseResult<string | null> {
    if (this.phone() === null) return {};
    const fault: ValidationError | null = this.bridge.error();
    const error: TelixonPhoneFieldError | undefined =
      fault === null ? undefined : toPhoneFieldError(fault, this.errorMessage());
    const report: ParseReport = this.nextReport;
    if (report.kind === 'error') return error === undefined ? {} : { error };
    return error === undefined ? { value: report.value } : { value: report.value, error };
  }
}
