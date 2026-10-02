import {
  ChangeDetectionStrategy,
  Component,
  computed,
  provideZonelessChangeDetection,
  signal,
  viewChild,
  type Type,
} from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, disabled, form, readonly, required } from '@angular/forms/signals';
import type { ValidationError } from '@telixon/core';
import { createPhoneInput } from '@telixon/web-sdk';
import { afterEach, describe, expect, it } from 'vitest';
import { TelixonRegionPicker } from '../../region-picker';
import type { TelixonPhoneInputOptions } from '../models';
import { TelixonPhoneField } from '../telixon-phone-field';

afterEach(() => {
  TestBed.resetTestingModule();
});

type PhoneModel = { phone: string | null };

@Component({
  imports: [FormField, TelixonPhoneField],
  template: `
    <input #phone="telixonPhoneField" [telixonPhoneField]="options()" [formField]="f.phone" />
    <p id="value">{{ model().phone ?? 'null' }}</p>
    <p id="errors">{{ errorKinds() }}</p>
  `,
})
class FieldHost {
  readonly options = signal<TelixonPhoneInputOptions>({ mode: 'international' });
  readonly model = signal<PhoneModel>({ phone: null });
  readonly locked = signal(false);
  readonly frozen = signal(false);
  readonly f = form(this.model, (schema) => {
    required(schema.phone, { message: 'Phone is required' });
    disabled(schema.phone, () => this.locked());
    readonly(schema.phone, () => this.frozen());
  });
  readonly errorKinds = computed(() =>
    this.f
      .phone()
      .errors()
      .map((error) => error.kind)
      .join(','),
  );
  readonly directive = viewChild.required(TelixonPhoneField);
}

@Component({
  imports: [FormField, TelixonPhoneField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <input #input telixonPhoneField [formField]="f.phone" />
    <p id="shown">{{ input.value }}</p>
  `,
})
class OnPushHost {
  readonly model = signal<PhoneModel>({ phone: null });
  readonly f = form(this.model);
}

@Component({
  imports: [FormField, TelixonPhoneField],
  template: `<input telixonPhoneField [formField]="f.phone" [errorMessage]="message()" />`,
})
class MessageHost {
  readonly model = signal<PhoneModel>({ phone: null });
  readonly f = form(this.model);
  readonly message = signal((fault: ValidationError): string => `custom ${fault.kind}`);
}

@Component({
  imports: [TelixonPhoneField],
  template: `<input telixonPhoneField [(value)]="phone" />`,
})
class TwoWayHost {
  phone: string | null = null;
}

@Component({
  imports: [ReactiveFormsModule, TelixonPhoneField],
  template: `<input telixonPhoneField [formControl]="control" />`,
})
class ClassicHost {
  readonly control = new FormControl<string | null>(null);
}

@Component({
  imports: [ReactiveFormsModule, TelixonPhoneField],
  template: `
    <form [formGroup]="group">
      <input telixonPhoneField formControlName="phone" />
    </form>
  `,
})
class GroupClassicHost {
  readonly group = new FormGroup({ phone: new FormControl<string | null>(null) });
}

@Component({
  imports: [FormsModule, TelixonPhoneField],
  template: `<input telixonPhoneField name="phone" [(ngModel)]="phone" />`,
})
class TemplateClassicHost {
  phone: string | null = null;
}

@Component({
  imports: [FormField, TelixonPhoneField],
  template: `<input telixonPhoneField [formField]="f.phone" />`,
})
class PartialSeedHost {
  readonly model = signal<PhoneModel>({ phone: '+1415' });
  readonly f = form(this.model);
}

@Component({
  imports: [FormField, TelixonPhoneField, TelixonRegionPicker],
  template: `
    <telixon-region-picker [for]="phone" />
    <input
      #phone="telixonPhoneField"
      [telixonPhoneField]="{ mode: 'international', defaultRegion: 'US', display: { callingCodeInInput: false } }"
      [formField]="f.phone"
    />
  `,
})
class PickerHost {
  readonly model = signal<PhoneModel>({ phone: null });
  readonly locked = signal(false);
  readonly f = form(this.model, (schema) => {
    disabled(schema.phone, () => this.locked());
  });
  readonly picker = viewChild.required(TelixonRegionPicker);
  readonly directive = viewChild.required(TelixonPhoneField);
}

@Component({
  imports: [FormField, TelixonPhoneField],
  template: `<input telixonPhoneField [formField]="f.phone" />`,
})
class SeededHost {
  readonly model = signal<PhoneModel>({ phone: '+14155550132' });
  readonly f = form(this.model);
  readonly directive = viewChild.required(TelixonPhoneField);
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
  configure();
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  await settle(fixture);
  return fixture;
}

function inputOf(fixture: ComponentFixture<unknown>): HTMLInputElement {
  return fixture.nativeElement.querySelector('input:not(.tlx-region-picker__search)');
}

function typeText(input: HTMLInputElement, text: string): void {
  for (const data of text) {
    input.dispatchEvent(
      new InputEvent('beforeinput', { inputType: 'insertText', data, bubbles: true, cancelable: true }),
    );
  }
}

function text(fixture: ComponentFixture<unknown>, selector: string): string {
  return fixture.nativeElement.querySelector(selector).textContent.trim();
}

describe('TelixonPhoneField: value and errors', () => {
  it('holds null while the number is partial and the E.164 number once it is valid', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    typeText(inputOf(fixture), '+1415555');
    await settle(fixture);
    expect(host.model().phone).toBe(null);
    expect(inputOf(fixture).value).toBe('1 415-555-');

    typeText(inputOf(fixture), '0132');
    await settle(fixture);
    expect(host.model().phone).toBe('+14155550132');
    expect(inputOf(fixture).value).toBe('1 415-555-0132');
    expect(host.f.phone().valid()).toBe(true);
    expect(text(fixture, '#value')).toBe('+14155550132');
  });

  it('reports the fault as a parse error under telixonPhone, with a message', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    typeText(inputOf(fixture), '+1415');
    await settle(fixture);
    const errors = host.f.phone().errors();
    expect(errors.map((error) => error.kind)).toEqual(['telixonPhone', 'required']);
    expect(errors[0]).toMatchObject({
      kind: 'telixonPhone',
      message: 'This number is too short.',
      fault: { kind: 'TOO_SHORT', minLength: 10 },
    });
    expect(text(fixture, '#errors')).toBe('telixonPhone,required');
  });

  it('follows the fault from one kind to the next', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    typeText(inputOf(fixture), '+1200555013');
    await settle(fixture);
    expect(host.f.phone().errors()[0]).toMatchObject({ fault: { kind: 'TOO_SHORT' } });

    typeText(inputOf(fixture), '2');
    await settle(fixture);
    expect(host.f.phone().errors()[0]).toMatchObject({ fault: { kind: 'PATTERN_MISMATCH' } });

    typeText(inputOf(fixture), '2');
    await settle(fixture);
    expect(host.f.phone().errors()[0]).toMatchObject({ fault: { kind: 'TOO_LONG' } });
  });

  it('leaves an empty field to the schema', async () => {
    const fixture = await mount(FieldHost);
    expect(
      fixture.componentInstance.f
        .phone()
        .errors()
        .map((error) => error.kind),
    ).toEqual(['required']);
  });

  it('turns dirty once the value changes, as Signal Forms defines it', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    typeText(inputOf(fixture), '+1415555');
    await settle(fixture);
    expect(host.f.phone().dirty()).toBe(false);

    typeText(inputOf(fixture), '0132');
    await settle(fixture);
    expect(host.f.phone().dirty()).toBe(true);
  });

  it('uses the errorMessage function for the message and follows a new one', async () => {
    const fixture = await mount(MessageHost);
    const host = fixture.componentInstance;
    typeText(inputOf(fixture), '+1415');
    await settle(fixture);
    expect(host.f.phone().errors()[0]?.message).toBe('custom TOO_SHORT');

    host.message.set((fault) => `other ${fault.kind}`);
    await settle(fixture);
    expect(host.f.phone().errors()[0]?.message).toBe('other TOO_SHORT');
    expect(host.model().phone).toBe(null);
  });

  it('keeps the value while only the fault changes', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;
    typeText(inputOf(fixture), '+1415');
    await settle(fixture);

    host.options.set({ mode: 'international', regionFilter: ['GB'] });
    await settle(fixture);
    expect(host.f.phone().errors()[0]).toMatchObject({ fault: { kind: 'INVALID_CALLING_CODE' } });
    expect(host.model().phone).toBe(null);
    expect(host.f.phone().dirty()).toBe(false);
  });

  it('works through a two-way value binding without a form', async () => {
    const fixture = await mount(TwoWayHost);
    typeText(inputOf(fixture), '+14155550132');
    await settle(fixture);
    expect(fixture.componentInstance.phone).toBe('+14155550132');
  });

  it('refuses a classic form directive on the same input', async () => {
    configure();
    expect(() => TestBed.createComponent(ClassicHost)).toThrowError(/telixonPhoneInput/);
    expect(() => TestBed.createComponent(GroupClassicHost)).toThrowError(/telixonPhoneInput/);
    expect(() => TestBed.createComponent(TemplateClassicHost)).toThrowError(/telixonPhoneInput/);
  });

  it('makes an international field from the bare attribute', async () => {
    const fixture = await mount(MessageHost);
    typeText(inputOf(fixture), '+442071838750');
    await settle(fixture);
    expect(fixture.componentInstance.model().phone).toBe('+442071838750');
    expect(inputOf(fixture).value).toBe('44 20 7183 8750');
  });
});

describe('TelixonPhoneField: values from the form', () => {
  it('shows a value the form writes and keeps the field pristine', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    host.model.set({ phone: '+442071838750' });
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('44 20 7183 8750');
    expect(host.f.phone().dirty()).toBe(false);
    expect(host.f.phone().valid()).toBe(true);

    host.model.set({ phone: null });
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('');
  });

  it('shows the form value the field starts with', async () => {
    const fixture = await mount(SeededHost);
    expect(inputOf(fixture).value).toBe('1 415-555-0132');
    expect(fixture.componentInstance.model().phone).toBe('+14155550132');
    expect(fixture.componentInstance.f.phone().dirty()).toBe(false);
  });

  it('keeps a valid value the form writes in its own spelling', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    host.f.phone().value.set('+1 (415) 555-0199');
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('1 415-555-0199');
    expect(host.model().phone).toBe('+1 (415) 555-0199');
    expect(host.f.phone().valid()).toBe(true);
    expect(host.f.phone().dirty()).toBe(false);
  });

  it('restores the previous model on a keyboard undo', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;
    const input = inputOf(fixture);

    typeText(input, '+14155550132');
    await settle(fixture);
    typeText(input, '9');
    await settle(fixture);
    expect(host.model().phone).toBe(null);

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    await settle(fixture);
    expect(input.value).toBe('1 415-555-0132');
    expect(host.model().phone).toBe('+14155550132');
  });

  it('keeps a written value and reports its fault', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    host.model.set({ phone: '+1415' });
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('1 415-');
    expect(host.model().phone).toBe('+1415');
    expect(host.f.phone().errors()[0]).toMatchObject({ kind: 'telixonPhone', fault: { kind: 'TOO_SHORT' } });
    expect(host.f.phone().valid()).toBe(false);
    expect(host.f.phone().dirty()).toBe(false);
  });

  it('keeps a value written before the engine loads and reports its fault once live', async () => {
    const fixture = await mount(PartialSeedHost);
    const host = fixture.componentInstance;
    expect(inputOf(fixture).value).toBe('1 415-');
    expect(host.model().phone).toBe('+1415');
    expect(host.f.phone().errors()[0]).toMatchObject({ fault: { kind: 'TOO_SHORT' } });
    expect(host.f.phone().dirty()).toBe(false);
  });

  it('resets a partial number to the form value with nothing to undo', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    typeText(inputOf(fixture), '+1415');
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('1 415-');

    host.f.phone().reset();
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('');
    expect(
      host.f
        .phone()
        .errors()
        .map((error) => error.kind),
    ).toEqual(['required']);
    expect(host.directive().phone()?.canUndo()).toBe(false);
  });

  it('resets a valid number with nothing to undo', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;
    typeText(inputOf(fixture), '+14155550132');
    await settle(fixture);
    expect(host.directive().phone()?.canUndo()).toBe(true);

    host.f.phone().reset();
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('1 415-555-0132');
    expect(host.model().phone).toBe('+14155550132');
    expect(host.f.phone().dirty()).toBe(false);
    expect(host.directive().phone()?.canUndo()).toBe(false);
  });

  it('resets to a new value with nothing to undo', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;
    typeText(inputOf(fixture), '+1415');
    await settle(fixture);

    host.f.phone().reset('+14155550199');
    await settle(fixture);
    expect(inputOf(fixture).value).toBe('1 415-555-0199');
    expect(host.model().phone).toBe('+14155550199');
    expect(host.f.phone().valid()).toBe(true);
    expect(host.f.phone().dirty()).toBe(false);
    expect(host.directive().phone()?.canUndo()).toBe(false);
  });

  it('keeps a value the server rendered pristine through hydration', async () => {
    configure();
    const fixture = TestBed.createComponent(PartialSeedHost);
    inputOf(fixture).value = '+1415';
    await settle(fixture);
    const host = fixture.componentInstance;

    expect(inputOf(fixture).value).toBe('1 415-');
    expect(host.model().phone).toBe('+1415');
    expect(host.f.phone().errors()[0]).toMatchObject({ fault: { kind: 'TOO_SHORT' } });
    expect(host.f.phone().dirty()).toBe(false);
  });

  it('hands text typed before the engine loads to the form', async () => {
    configure();
    const fixture = TestBed.createComponent(FieldHost);
    fixture.detectChanges();
    inputOf(fixture).value = '+14155550132';
    await settle(fixture);

    expect(fixture.componentInstance.model().phone).toBe('+14155550132');
    expect(fixture.componentInstance.f.phone().dirty()).toBe(true);
  });

  it('writes a value without echoing it back', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;
    const emitted: (string | null)[] = [];
    host.directive().value.subscribe((value) => emitted.push(value));

    host.model.set({ phone: '+1415' });
    await settle(fixture);
    expect(emitted).toEqual([]);
    expect(host.f.phone().errors()[0]).toMatchObject({ fault: { kind: 'TOO_SHORT' } });

    // The first key makes the written number partial, which the form hears as `null`.
    typeText(inputOf(fixture), '5550132');
    await settle(fixture);
    expect(emitted).toEqual([null, '+14155550132']);
  });

  it('takes a written number apart for a field that keeps the calling code out of its text', async () => {
    const fixture = await mount(PickerHost);
    const host = fixture.componentInstance;

    host.model.set({ phone: '+442071838750' });
    await settle(fixture);

    expect(host.directive().state()?.region).toBe('GB');
    expect(inputOf(fixture).value).toBe('20 7183 8750');
    expect(host.model().phone).toBe('+442071838750');
    expect(host.f.phone().valid()).toBe(true);
    expect(host.f.phone().dirty()).toBe(false);
  });

  it('refreshes an OnPush template on every change the field makes to its text', async () => {
    const fixture = await mount(OnPushHost);
    const host = fixture.componentInstance;

    host.model.set({ phone: '+14155550132' });
    await settle(fixture);
    expect(text(fixture, '#shown')).toBe('1 415-555-0132');

    typeText(inputOf(fixture), '9');
    await settle(fixture);
    expect(text(fixture, '#shown')).toBe('1 41555501329');
  });

  it('carries a valid number into a new widget when the options change', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    typeText(inputOf(fixture), '+14155550132');
    await settle(fixture);
    host.options.set({ mode: 'national', defaultRegion: 'US' });
    await settle(fixture);

    expect(inputOf(fixture).value).toBe('(415) 555-0132');
    expect(host.model().phone).toBe('+14155550132');
  });
});

describe('TelixonPhoneField: field state', () => {
  it('marks the field touched on blur', async () => {
    const fixture = await mount(FieldHost);
    expect(fixture.componentInstance.f.phone().touched()).toBe(false);

    inputOf(fixture).dispatchEvent(new Event('blur'));
    await settle(fixture);
    expect(fixture.componentInstance.f.phone().touched()).toBe(true);
  });

  it('follows disabled and readonly from the schema', async () => {
    const fixture = await mount(FieldHost);
    const host = fixture.componentInstance;

    host.locked.set(true);
    await settle(fixture);
    expect(inputOf(fixture).disabled).toBe(true);
    expect(host.directive().disabled()).toBe(true);

    host.locked.set(false);
    host.frozen.set(true);
    await settle(fixture);
    expect(inputOf(fixture).disabled).toBe(false);
    expect(inputOf(fixture).readOnly).toBe(true);
  });

  it('marks the input required from the schema', async () => {
    const fixture = await mount(FieldHost);
    expect(inputOf(fixture).required).toBe(true);
  });

  it('takes disabled, readonly, and required from bare attributes without a form', async () => {
    TestBed.overrideTemplate(TwoWayHost, `<input telixonPhoneField [(value)]="phone" disabled readonly required />`);
    const fixture = await mount(TwoWayHost);
    const input = inputOf(fixture);

    expect(input.disabled).toBe(true);
    expect(input.readOnly).toBe(true);
    expect(input.required).toBe(true);
  });

  it('moves focus into the field', async () => {
    const fixture = await mount(FieldHost);
    fixture.componentInstance.directive().focus();
    expect(document.activeElement).toBe(inputOf(fixture));
  });
});

describe('TelixonPhoneField: lifecycle', () => {
  it('releases the element when the directive is destroyed', async () => {
    const fixture = await mount(FieldHost);
    const input = inputOf(fixture);

    fixture.destroy();

    expect(() => createPhoneInput({ mode: 'international', input }).destroy()).not.toThrow();
  });

  // Angular skips render hooks wherever platform-server sets this flag.
  it('stays a plain input on the server', async () => {
    const scope = globalThis as { ngServerMode?: boolean };
    scope.ngServerMode = true;
    try {
      const fixture = await mount(SeededHost);

      expect(fixture.componentInstance.directive().phone()).toBe(null);
      expect(inputOf(fixture).value).toBe('+14155550132');
    } finally {
      delete scope.ngServerMode;
    }
  });
});

describe('TelixonPhoneField: region picker', () => {
  it('links a picker through [for], which hands a pick to the field', async () => {
    const fixture = await mount(PickerHost);
    const host = fixture.componentInstance;
    expect(host.picker().picker()).not.toBeNull();

    host.picker().picker()?.select('GB');
    await settle(fixture);
    typeText(inputOf(fixture), '2071838750');
    await settle(fixture);

    expect(host.model().phone).toBe('+442071838750');
    expect(host.directive().state()?.region).toBe('GB');
  });

  it('turns the picker inert while the schema disables the field', async () => {
    const fixture = await mount(PickerHost);
    const host = fixture.componentInstance;
    const picker: HTMLElement = fixture.nativeElement.querySelector('telixon-region-picker');
    const trigger: HTMLButtonElement = picker.querySelector('button')!;
    expect(picker.hasAttribute('data-disabled')).toBe(false);

    host.locked.set(true);
    await settle(fixture);
    expect(host.directive().disabled()).toBe(true);
    expect(trigger.disabled).toBe(true);
    expect(picker.hasAttribute('data-disabled')).toBe(true);

    host.locked.set(false);
    await settle(fixture);
    expect(trigger.disabled).toBe(false);
    expect(picker.hasAttribute('data-disabled')).toBe(false);
  });
});
