import {
  ChangeDetectionStrategy,
  Component,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { createPhoneInput } from '@telixon/web-sdk';
import { afterEach, describe, expect, it } from 'vitest';
import type { TelixonPhoneInputOptions } from '../models';
import { TelixonPhoneInput } from '../telixon-phone-input';

afterEach(() => {
  TestBed.resetTestingModule();
});

@Component({
  imports: [ReactiveFormsModule, TelixonPhoneInput],
  template: `
    <input #phone="telixonPhoneInput" [telixonPhoneInput]="options()" [formControl]="control" />
    <p id="value">{{ control.value ?? 'null' }}</p>
    <p id="error">{{ control.errors?.['telixonPhone']?.kind ?? 'none' }}</p>
  `,
})
class ReactiveHost {
  readonly options = signal<TelixonPhoneInputOptions>({ mode: 'international' });
  readonly control = new FormControl<string | null>(null);
  readonly directive = viewChild.required(TelixonPhoneInput);
}

@Component({
  imports: [ReactiveFormsModule, TelixonPhoneInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input telixonPhoneInput [formControl]="control" />
    <p id="value">{{ control.value ?? 'null' }}</p>
    <p id="error">{{ control.errors?.['telixonPhone']?.kind ?? 'none' }}</p>
  `,
})
class OnPushHost {
  readonly control = new FormControl<string | null>(null);
}

@Component({
  imports: [TelixonPhoneInput],
  template: `<input telixonPhoneInput />`,
})
class BareHost {
  readonly directive = viewChild.required(TelixonPhoneInput);
}

@Component({
  imports: [FormsModule, TelixonPhoneInput],
  template: `<input telixonPhoneInput name="phone" [(ngModel)]="value" />`,
})
class TemplateHost {
  value: string | null = '+14155550132';
  readonly directive = viewChild.required(TelixonPhoneInput);
}

function configure(): void {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
}

// Renders, lets the engine promise resolve, then renders what the widget reported.
async function settle<T>(fixture: ComponentFixture<T>): Promise<void> {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve, 0));
  await fixture.whenStable();
}

async function mount<T>(host: Type<T>): Promise<ComponentFixture<T>> {
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  await settle(fixture);
  return fixture;
}

function inputOf(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input');
}

function typeText(input: HTMLInputElement, text: string): void {
  for (const data of text) {
    input.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true }),
    );
  }
}

function deleteBackward(input: HTMLInputElement, count: number): void {
  for (let step = 0; step < count; step++) {
    input.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'deleteContentBackward', bubbles: true, cancelable: true }),
    );
  }
}

function text(fixture: ComponentFixture<unknown>, selector: string): string {
  return fixture.nativeElement.querySelector(selector).textContent.trim();
}

describe('TelixonPhoneInput: change detection', () => {
  it('refreshes a zoneless template that reads only the form control', async () => {
    configure();
    const fixture = await mount(ReactiveHost);

    typeText(inputOf(fixture), '+1415555');
    await settle(fixture);
    expect(text(fixture, '#error')).toBe('TOO_SHORT');

    typeText(inputOf(fixture), '0132');
    await settle(fixture);
    expect(text(fixture, '#value')).toBe('+14155550132');
    expect(text(fixture, '#error')).toBe('none');
  });

  it('refreshes an OnPush template on every change the field makes', async () => {
    configure();
    const fixture = await mount(OnPushHost);

    typeText(inputOf(fixture), '+1415');
    await settle(fixture);
    expect(text(fixture, '#error')).toBe('TOO_SHORT');

    typeText(inputOf(fixture), '555013299');
    await settle(fixture);
    expect(text(fixture, '#error')).toBe('TOO_LONG');

    deleteBackward(inputOf(fixture), 2);
    await settle(fixture);
    expect(text(fixture, '#value')).toBe('+14155550132');
  });

  // Neither the status nor the dirty flag moves, which leaves Angular's own bindings quiet.
  it('refreshes a zoneless template when the fault changes while the control stays invalid', async () => {
    configure();
    const fixture = await mount(ReactiveHost);

    typeText(inputOf(fixture), '+1200555013');
    await settle(fixture);
    expect(text(fixture, '#error')).toBe('TOO_SHORT');

    typeText(inputOf(fixture), '2');
    await settle(fixture);
    expect(text(fixture, '#error')).toBe('PATTERN_MISMATCH');
  });

  it('refreshes an OnPush template when one edit moves the value between two valid numbers', async () => {
    configure();
    const fixture = await mount(OnPushHost);
    const input = inputOf(fixture);

    typeText(input, '+14155550132');
    await settle(fixture);
    expect(text(fixture, '#value')).toBe('+14155550132');

    input.setSelectionRange(input.value.length - 1, input.value.length);
    typeText(input, '3');
    await settle(fixture);
    expect(text(fixture, '#value')).toBe('+14155550133');
  });

  it('refreshes a zoneless template when new options change the fault', async () => {
    configure();
    const fixture = await mount(ReactiveHost);

    typeText(inputOf(fixture), '+1415');
    await settle(fixture);
    expect(text(fixture, '#error')).toBe('TOO_SHORT');

    fixture.componentInstance.options.set({ mode: 'international', regionFilter: ['GB'] });
    await settle(fixture);
    expect(text(fixture, '#error')).toBe('INVALID_CALLING_CODE');
  });
});

describe('TelixonPhoneInput: form value and validation', () => {
  it('holds null while the number is partial and the E.164 number once it is valid', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;

    typeText(inputOf(fixture), '+1415555');
    expect(control.value).toBe(null);

    typeText(inputOf(fixture), '0132');
    expect(control.value).toBe('+14155550132');
    expect(control.valid).toBe(true);
  });

  it('reports the fault under telixonPhone and nothing for an empty field', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;
    expect(control.errors).toBe(null);

    typeText(inputOf(fixture), '+1415');
    expect(control.errors).toEqual({ telixonPhone: { kind: 'TOO_SHORT', minLength: 10 } });
  });

  it('holds null for a number of possible length that does not exist', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control, directive } = fixture.componentInstance;

    typeText(inputOf(fixture), '+12005550132');

    expect(directive().phone()?.getPhoneNumber().formatE164()).toBe('+12005550132');
    expect(control.value).toBe(null);
    expect(control.errors?.['telixonPhone'].kind).toBe('PATTERN_MISMATCH');
  });

  it('leaves an empty field to Validators.required', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.control.addValidators(Validators.required);
    await settle(fixture);
    fixture.componentInstance.control.updateValueAndValidity();

    expect(fixture.componentInstance.control.errors).toEqual({ required: true });
  });

  it('leaves a field holding only its calling code to Validators.required', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'international', defaultRegion: 'US' });
    fixture.componentInstance.control.addValidators(Validators.required);
    await settle(fixture);

    expect(inputOf(fixture).value).toBe('1 ');
    expect(fixture.componentInstance.control.errors).toEqual({ required: true });
  });

  it('reports nothing for an empty national field', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'GB' });
    await settle(fixture);

    expect(fixture.componentInstance.control.errors).toBe(null);
    expect(fixture.componentInstance.control.valid).toBe(true);
  });

  it('keeps a valid number typed without its trunk prefix valid', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'GB' });
    await settle(fixture);
    const { control, directive } = fixture.componentInstance;

    typeText(inputOf(fixture), '2071838750');

    expect(control.value).toBe('+442071838750');
    expect(control.errors).toBe(null);
    expect(directive().state()?.validationError?.kind).toBe('NATIONAL_PREFIX_MISSING');
  });

  it('marks the control dirty on the first edit, while the number is still partial', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;

    typeText(inputOf(fixture), '+1');

    expect(control.value).toBe(null);
    expect(control.dirty).toBe(true);
  });

  it('stays quiet for a key the field rejects', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;
    const emitted: (string | null)[] = [];
    const subscription = control.valueChanges.subscribe((value) => emitted.push(value));

    typeText(inputOf(fixture), 'a');

    expect(emitted).toEqual([]);
    expect(control.pristine).toBe(true);
    subscription.unsubscribe();
  });

  it('hands every edit to the form, the number once it is valid', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;
    typeText(inputOf(fixture), '+141555501');
    const emitted: (string | null)[] = [];
    const subscription = control.valueChanges.subscribe((value) => emitted.push(value));

    typeText(inputOf(fixture), '32');

    expect(emitted).toEqual([null, '+14155550132']);
    subscription.unsubscribe();
  });

  it('validates again when the fault changes while the value stays null', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;

    typeText(inputOf(fixture), '+1415');
    expect(control.errors?.['telixonPhone'].kind).toBe('TOO_SHORT');

    typeText(inputOf(fixture), '555013299');
    expect(control.value).toBe(null);
    expect(control.errors?.['telixonPhone'].kind).toBe('TOO_LONG');
  });
});

describe('TelixonPhoneInput: writing a value', () => {
  it('formats a written value and leaves the control pristine', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;

    control.setValue('+14155550132');

    expect(inputOf(fixture).value).toBe(fixture.componentInstance.directive().state()?.value);
    expect(inputOf(fixture).value).not.toBe('+14155550132');
    expect(control.value).toBe('+14155550132');
    expect(control.pristine).toBe(true);
    expect(control.valid).toBe(true);
  });

  it('shows a value written before the engine loads and validates it once the field is live', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.control.setValue('+1415');
    await settle(fixture);
    const { control } = fixture.componentInstance;

    expect(inputOf(fixture).value).toBe(fixture.componentInstance.directive().state()?.value);
    expect(control.value).toBe('+1415');
    expect(control.pristine).toBe(true);
    expect(control.errors?.['telixonPhone'].kind).toBe('TOO_SHORT');
  });

  it('hands text typed before the engine loads to the form', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.detectChanges();
    inputOf(fixture).value = '+14155550132';
    await settle(fixture);

    expect(fixture.componentInstance.control.value).toBe('+14155550132');
  });

  it('emits a written value once', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;
    const emitted: (string | null)[] = [];
    const subscription = control.valueChanges.subscribe((value) => emitted.push(value));

    control.setValue('+1415');

    expect(emitted).toEqual(['+1415']);
    expect(control.errors?.['telixonPhone'].kind).toBe('TOO_SHORT');
    subscription.unsubscribe();
  });

  it('takes a written number apart for a field that keeps the calling code out of its text', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    await settle(fixture);
    const { control, directive } = fixture.componentInstance;

    control.setValue('+442071838750');

    expect(directive().state()?.region).toBe('GB');
    expect(inputOf(fixture).value).toBe('20 7183 8750');
    expect(control.valid).toBe(true);
    expect(control.value).toBe('+442071838750');
    expect(control.pristine).toBe(true);
  });

  it('takes apart a number written before the engine loads, with nothing to undo', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    fixture.componentInstance.control.setValue('+14155550132');
    await settle(fixture);
    const { control, directive } = fixture.componentInstance;

    expect(inputOf(fixture).value).toBe('415-555-0132');
    expect(control.valid).toBe(true);
    expect(control.pristine).toBe(true);
    expect(directive().phone()?.canUndo()).toBe(false);
  });

  it('writes a number into a national field in its national format and follows its region', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'GB' });
    await settle(fixture);
    const { control, directive } = fixture.componentInstance;

    control.setValue('+442071838750');
    expect(inputOf(fixture).value).toBe('020 7183 8750');
    expect(control.valid).toBe(true);

    control.setValue('+14155550132');
    expect(directive().state()?.region).toBe('US');
    expect(inputOf(fixture).value).toBe('(415) 555-0132');
    expect(control.valid).toBe(true);
  });

  it('clears the field for null', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;
    control.setValue('+14155550132');

    control.setValue(null);

    expect(inputOf(fixture).value).toBe('');
    expect(control.errors).toBe(null);
  });

  it('works with ngModel', async () => {
    configure();
    const fixture = await mount(TemplateHost);
    expect(inputOf(fixture).value).toBe(fixture.componentInstance.directive().state()?.value);
    expect(fixture.componentInstance.directive().state()?.region).toBe('US');

    typeText(inputOf(fixture), '9');
    await settle(fixture);

    expect(fixture.componentInstance.value).toBe(null);
  });
});

describe('TelixonPhoneInput: options', () => {
  it('applies filters through the widget it already has', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const before = fixture.componentInstance.directive().phone();

    fixture.componentInstance.options.set({ mode: 'international', regionFilter: ['US', 'CA'] });
    await settle(fixture);

    expect(fixture.componentInstance.directive().phone()).toBe(before);
    expect(before?.getState().regionFilter).toEqual(['US', 'CA']);
  });

  it('builds a new widget for a new default region and keeps the text', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'US' });
    await settle(fixture);
    const before = fixture.componentInstance.directive().phone();
    typeText(inputOf(fixture), '4155550132');

    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'CA' });
    await settle(fixture);
    const after = fixture.componentInstance.directive().phone();

    expect(after).not.toBe(before);
    expect(after?.getState().value).toBe(inputOf(fixture).value);
    expect(inputOf(fixture).value).not.toBe('');
  });

  it('hands the form a value that new options change', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;
    typeText(inputOf(fixture), '+14155550132');
    expect(control.value).toBe('+14155550132');

    fixture.componentInstance.options.set({ mode: 'international', regionFilter: ['GB'] });
    await settle(fixture);
    expect(control.value).toBe(null);

    fixture.componentInstance.options.set({ mode: 'international' });
    await settle(fixture);
    expect(control.value).toBe('+14155550132');
  });

  it('hands the form a value that a new widget changes', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { control } = fixture.componentInstance;
    typeText(inputOf(fixture), '+14155550132');
    expect(control.value).toBe('+14155550132');

    fixture.componentInstance.options.set({ mode: 'international', strict: true, regionFilter: ['GB'] });
    await settle(fixture);

    expect(control.value).toBe(null);
    expect(control.invalid).toBe(true);
  });

  it('leaves the control pristine when new options keep the value', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.control.setValue('+14155550132');
    await settle(fixture);

    fixture.componentInstance.options.set({
      mode: 'international',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });
    await settle(fixture);

    expect(inputOf(fixture).value).toBe('+1 415-555-0132');
    expect(fixture.componentInstance.control.pristine).toBe(true);
  });

  it('leaves a value the form wrote before the engine loaded alone when new options keep the number', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.control.setValue('+1 415 555 0132');
    await settle(fixture);

    fixture.componentInstance.options.set({ mode: 'international', regionFilter: ['US'] });
    await settle(fixture);

    expect(fixture.componentInstance.control.value).toBe('+1 415 555 0132');
    expect(fixture.componentInstance.control.pristine).toBe(true);
  });

  it('leaves a partial value the form wrote alone when new options arrive', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    fixture.componentInstance.control.setValue('+1415');

    fixture.componentInstance.options.set({ mode: 'international', regionFilter: ['US'] });
    await settle(fixture);

    expect(fixture.componentInstance.control.value).toBe('+1415');
    expect(fixture.componentInstance.control.pristine).toBe(true);
  });

  it('carries a valid number into a new widget, whatever the new options show', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'US' });
    fixture.componentInstance.control.setValue('+14155550132');
    await settle(fixture);
    const { control } = fixture.componentInstance;
    const emitted: (string | null)[] = [];
    const subscription = control.valueChanges.subscribe((value) => emitted.push(value));

    fixture.componentInstance.options.set({ mode: 'international', defaultRegion: 'US' });
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('1 415-555-0132');

    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('415-555-0132');

    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'GB' });
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('(415) 555-0132');

    expect(control.value).toBe('+14155550132');
    expect(control.valid).toBe(true);
    expect(control.pristine).toBe(true);
    expect(emitted).toEqual([]);
    subscription.unsubscribe();
  });

  it('keeps a region picked for a field through a new widget', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    await settle(fixture);
    const { control, directive } = fixture.componentInstance;
    directive().phone()?.setRegion('GB');
    typeText(inputOf(fixture), '2071838750');
    expect(control.value).toBe('+442071838750');

    fixture.componentInstance.options.set({
      mode: 'international',
      defaultRegion: 'US',
      strict: true,
      display: { callingCodeInInput: false },
    });
    await settle(fixture);

    expect(directive().state()?.region).toBe('GB');
    expect(control.value).toBe('+442071838750');
  });

  it('seeds the new calling code when the default region changes under an untouched field', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'international', defaultRegion: 'US' });
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('1 ');

    fixture.componentInstance.options.set({ mode: 'international', defaultRegion: 'GB' });
    await settle(fixture);

    expect(inputOf(fixture).value).toBe('44 ');
    expect(fixture.componentInstance.control.pristine).toBe(true);
  });

  it('keeps an untouched field empty and valid through a switch to national', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({ mode: 'international', defaultRegion: 'US' });
    await settle(fixture);

    fixture.componentInstance.options.set({ mode: 'national', defaultRegion: 'US' });
    await settle(fixture);

    expect(inputOf(fixture).value).toBe('');
    expect(fixture.componentInstance.control.valid).toBe(true);
    expect(fixture.componentInstance.control.pristine).toBe(true);
  });

  it('keeps the widget for a structurally equal options object', async () => {
    configure();
    const fixture = TestBed.createComponent(ReactiveHost);
    fixture.componentInstance.options.set({
      mode: 'international',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });
    await settle(fixture);
    const before = fixture.componentInstance.directive().phone();

    fixture.componentInstance.options.set({
      mode: 'international',
      display: { callingCodeInInput: true, plusPrefix: 'fixed' },
    });
    await settle(fixture);

    expect(fixture.componentInstance.directive().phone()).toBe(before);
  });

  it('makes an international field from a bare attribute', async () => {
    configure();
    const fixture = await mount(BareHost);

    typeText(inputOf(fixture), '+442071838750');

    expect(fixture.componentInstance.directive().state()?.region).toBe('GB');
  });
});

describe('TelixonPhoneInput: state, focus, and control state', () => {
  it('exposes the widget and its state once the engine has loaded', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const { directive } = fixture.componentInstance;

    expect(directive().phone()).not.toBe(null);
    typeText(inputOf(fixture), '+14155550132');
    expect(directive().state()?.region).toBe('US');
  });

  it('moves focus into the field', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    document.body.append(fixture.nativeElement);

    fixture.componentInstance.directive().focus();

    expect(document.activeElement).toBe(inputOf(fixture));
    fixture.nativeElement.remove();
  });

  it('disables the input with the control', async () => {
    configure();
    const fixture = await mount(ReactiveHost);

    fixture.componentInstance.control.disable();
    expect(inputOf(fixture).disabled).toBe(true);

    fixture.componentInstance.control.enable();
    expect(inputOf(fixture).disabled).toBe(false);
  });

  it('marks the control touched on blur', async () => {
    configure();
    const fixture = await mount(ReactiveHost);

    inputOf(fixture).dispatchEvent(new FocusEvent('blur'));

    expect(fixture.componentInstance.control.touched).toBe(true);
  });
});

describe('TelixonPhoneInput: lifecycle', () => {
  it('releases the element when the directive is destroyed', async () => {
    configure();
    const fixture = await mount(ReactiveHost);
    const input = inputOf(fixture);

    fixture.destroy();

    expect(fixture.componentInstance.directive).toBeDefined();
    expect(() => createPhoneInput({ mode: 'international', input }).destroy()).not.toThrow();
  });

  // Angular skips render hooks wherever platform-server sets this flag.
  it('stays a plain input on the server', async () => {
    const scope = globalThis as { ngServerMode?: boolean };
    scope.ngServerMode = true;
    try {
      configure();
      const fixture = await mount(ReactiveHost);
      fixture.componentInstance.control.setValue('+14155550132');

      expect(fixture.componentInstance.directive().phone()).toBe(null);
      expect(inputOf(fixture).value).toBe('+14155550132');
    } finally {
      delete scope.ngServerMode;
    }
  });

  it('reports an input it cannot drive to ErrorHandler', async () => {
    const reported: unknown[] = [];
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: ErrorHandler, useValue: { handleError: (error: unknown) => reported.push(error) } },
      ],
    });
    TestBed.overrideTemplate(BareHost, `<input type="number" telixonPhoneInput />`);
    await mount(BareHost);

    expect(reported).toHaveLength(1);
  });
});
