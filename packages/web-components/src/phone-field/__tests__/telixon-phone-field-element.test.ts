import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { defineTelixonElements } from '../../define';
import { CHANGE_EVENT } from '../constants/events';
import type { TelixonPhoneChangeDetail } from '../models';
import { TelixonPhoneFieldElement } from '../telixon-phone-field-element';

beforeAll(() => defineTelixonElements());
afterEach(() => document.body.replaceChildren());

function mount(html: string): HTMLFormElement {
  const form: HTMLFormElement = document.createElement('form');
  form.innerHTML = html;
  document.body.append(form);
  return form;
}

function fieldOf(root: ParentNode): TelixonPhoneFieldElement {
  const field: Element | null = root.querySelector('telixon-phone-field');
  if (!(field instanceof TelixonPhoneFieldElement)) throw new Error('No phone field.');
  return field;
}

function inputOf(field: TelixonPhoneFieldElement): HTMLInputElement {
  const input: HTMLInputElement | null = field.inputElement;
  if (input === null) throw new Error('No input.');
  return input;
}

async function live(field: TelixonPhoneFieldElement): Promise<void> {
  await vi.waitFor(() => expect(field.phone).not.toBeNull());
}

function changes(field: TelixonPhoneFieldElement): (string | null)[] {
  const values: (string | null)[] = [];
  field.addEventListener(CHANGE_EVENT, (event: Event): void => {
    if (event instanceof CustomEvent) values.push((event.detail as TelixonPhoneChangeDetail).value);
  });
  return values;
}

describe('telixon-phone-field: the input inside it', () => {
  it('attaches to an input that arrives after the element', async () => {
    const field: TelixonPhoneFieldElement = document.createElement('telixon-phone-field');
    field.setAttribute('default-region', 'US');
    document.body.append(field);
    await new Promise((resolve) => setTimeout(resolve));
    expect(field.phone).toBeNull();

    field.append(document.createElement('input'));
    await live(field);
    expect(field.inputElement).toBe(field.querySelector('input'));
  });

  it('follows an input a framework replaces', async () => {
    const form = mount('<telixon-phone-field default-region="US"><input type="tel" /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    const first: HTMLInputElement = inputOf(field);

    const second: HTMLInputElement = document.createElement('input');
    first.replaceWith(second);
    await vi.waitFor(() => expect(field.inputElement).toBe(second));
    await userEvent.type(second, '4155550132');
    expect(field.value).toBe('+14155550132');
  });

  it('formats what the user types and reports the number in E.164 once', async () => {
    const form = mount(
      '<telixon-phone-field name="phone" default-region="US"><input type="tel" /></telixon-phone-field>',
    );
    const field = fieldOf(form);
    await live(field);
    const values = changes(field);

    await userEvent.type(inputOf(field), '4155550132');
    expect(field.value).toBe('+14155550132');
    expect(inputOf(field).value).toContain('415');
    expect(values).toEqual(['+14155550132']);
  });

  it('seeds the input from a value set before it is live', async () => {
    const field: TelixonPhoneFieldElement = document.createElement('telixon-phone-field');
    field.setAttribute('default-region', 'US');
    field.value = '+14155550132';
    field.append(document.createElement('input'));
    document.body.append(field);
    await live(field);
    expect(field.value).toBe('+14155550132');
    expect(inputOf(field).value).toContain('415');
  });

  it('fills the placeholder when asked', async () => {
    const form = mount('<telixon-phone-field default-region="US" auto-placeholder><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    expect(inputOf(field).placeholder).not.toBe('');
  });
});

describe('telixon-phone-field: options', () => {
  it('reads the option attributes', async () => {
    const form = mount(
      '<telixon-phone-field mode="international" default-region="GB" calling-code-in-input="false" region-filter="GB, IE"><input /></telixon-phone-field>',
    );
    const field = fieldOf(form);
    await live(field);
    expect(field.options).toEqual({
      mode: 'international',
      defaultRegion: 'GB',
      display: { callingCodeInInput: false },
      regionFilter: ['GB', 'IE'],
    });
  });

  it('lets the options property replace the attributes as a whole', async () => {
    const form = mount('<telixon-phone-field default-region="US"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);

    field.options = { mode: 'international', defaultRegion: 'GB' };
    expect(field.options.defaultRegion).toBe('GB');
    field.setAttribute('default-region', 'CA');
    expect(field.options.defaultRegion).toBe('GB');

    field.options = null;
    expect(field.options.defaultRegion).toBe('CA');
  });

  it('carries a valid number into new options', async () => {
    const form = mount('<telixon-phone-field default-region="US"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    await userEvent.type(inputOf(field), '4155550132');
    const values = changes(field);

    field.setAttribute('region-filter', 'GB');
    await vi.waitFor(() => expect(field.value).toBeNull());
    expect(values).toEqual([null]);
  });
});

describe('telixon-phone-field: the form', () => {
  it('submits the number in E.164 under its name', async () => {
    const form = mount('<telixon-phone-field name="phone" default-region="US"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    await userEvent.type(inputOf(field), '4155550132');
    expect(new FormData(form).get('phone')).toBe('+14155550132');
    expect(field.form).toBe(form);
  });

  it('blocks submission with a message for a fault', async () => {
    const form = mount('<telixon-phone-field name="phone"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    await userEvent.type(inputOf(field), '+1415');

    expect(field.fault?.kind).toBe('TOO_SHORT');
    expect(field.validity.customError).toBe(true);
    expect(form.checkValidity()).toBe(false);
    expect(field.validationMessage).toBe('This number is too short.');
    expect(new FormData(form).get('phone')).toBeNull();

    field.setAttribute('error-message', 'Enter a phone number.');
    expect(field.validationMessage).toBe('Enter a phone number.');
    field.errorMessage = (fault) => fault.kind;
    expect(field.validationMessage).toBe('TOO_SHORT');
  });

  it('reports a required field without digits as missing, calling code or not', async () => {
    const form = mount(
      '<telixon-phone-field name="phone" default-region="US" required><input /></telixon-phone-field>',
    );
    const field = fieldOf(form);
    await live(field);
    expect(inputOf(field).value).not.toBe('');
    expect(field.fault).toBeNull();
    expect(field.validity.valueMissing).toBe(true);
    expect(field.validationMessage).toBe('This number is too short.');
    expect(form.checkValidity()).toBe(false);

    await userEvent.type(inputOf(field), '4155550132');
    expect(field.validity.valid).toBe(true);
    expect(form.checkValidity()).toBe(true);

    field.removeAttribute('required');
    inputOf(field).value = '';
    field.value = '';
    expect(field.validity.valueMissing).toBe(false);
  });

  it('marks the field as touched after focus leaves it', async () => {
    const form = mount('<telixon-phone-field name="phone"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    await userEvent.type(inputOf(field), '+1415');
    expect(field.matches(':state(invalid)')).toBe(true);
    expect(field.matches(':state(user-invalid)')).toBe(false);

    inputOf(field).blur();
    expect(field.matches(':state(user-invalid)')).toBe(true);
  });

  it('goes back to the initial value on reset', async () => {
    const form = mount('<telixon-phone-field name="phone" default-region="US"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    await userEvent.type(inputOf(field), '+1415');

    form.reset();
    expect(field.fault).toBeNull();
    expect(field.value).toBeNull();
    expect(inputOf(field).value).toBe('');
  });

  it('follows a disabled fieldset', async () => {
    const form = mount(
      '<fieldset disabled><telixon-phone-field name="phone"><input /></telixon-phone-field></fieldset>',
    );
    const field = fieldOf(form);
    await live(field);
    expect(inputOf(field).disabled).toBe(true);
    expect(field.disabled).toBe(true);

    form.querySelector('fieldset')?.removeAttribute('disabled');
    await vi.waitFor(() => expect(inputOf(field).disabled).toBe(false));
  });

  it('mirrors readonly onto the input', async () => {
    const form = mount('<telixon-phone-field readonly><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    expect(inputOf(field).readOnly).toBe(true);
  });
});

describe('telixon-phone-field: properties a framework sets', () => {
  it('reflects name, required, readOnly, and disabled to attributes', async () => {
    const form = mount('<telixon-phone-field default-region="US"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);

    field.name = 'phone';
    field.required = true;
    field.readOnly = true;
    expect(field.getAttribute('name')).toBe('phone');
    expect(field.validity.valueMissing).toBe(true);
    expect(inputOf(field).readOnly).toBe(true);
    await userEvent.type(inputOf(field), '4155550132');
    expect(new FormData(form).get('phone')).toBeNull();

    field.readOnly = false;
    await userEvent.type(inputOf(field), '4155550132');
    expect(new FormData(form).get('phone')).toBe('+14155550132');

    field.disabled = true;
    await vi.waitFor(() => expect(inputOf(field).disabled).toBe(true));
    expect(field.disabled).toBe(true);
    expect(new FormData(form).get('phone')).toBeNull();
    field.disabled = false;
    await vi.waitFor(() => expect(inputOf(field).disabled).toBe(false));
  });
});

describe('telixon-phone-field: the input it runs on', () => {
  it('is the first text or tel input, which lets other inputs sit inside the field', async () => {
    const form = mount(
      '<telixon-phone-field default-region="US"><input type="checkbox" /><input type="hidden" name="consent" /><input type="tel" /></telixon-phone-field>',
    );
    const field = fieldOf(form);
    await live(field);
    expect(field.inputElement).toBe(form.querySelector('input[type="tel"]'));
  });
});

describe('telixon-phone-field: an options object no option accepts', () => {
  it('throws instead of running with it', async () => {
    const form = mount('<telixon-phone-field default-region="US"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    const before = field.options;

    expect(() => {
      field.options = JSON.parse('{"mode":"national","defaultRegion":"XX"}');
    }).toThrow(TypeError);
    expect(() => {
      field.options = JSON.parse('{"mode":"international","regionFilter":["US","ZZ"]}');
    }).toThrow(/regionFilter/);
    expect(() => {
      field.options = JSON.parse('{"mode":"national"}');
    }).toThrow(/needs defaultRegion/);
    expect(() => {
      field.options = JSON.parse('{"mode":"international","display":{"callingCodeInInput":false}}');
    }).toThrow(/needs defaultRegion/);
    expect(() => {
      field.options = JSON.parse('{"mode":"international","display":{"callingCodeInInput":true,"plusPrefix":"soft"}}');
    }).toThrow(/plusPrefix/);
    expect(field.options).toEqual(before);
  });
});

describe('telixon-phone-field: writes and messages', () => {
  it('leaves the field alone when the written value is the one it reports', async () => {
    const form = mount('<telixon-phone-field default-region="US"><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    await userEvent.type(inputOf(field), '415555013');
    const partial: string = inputOf(field).value;
    expect(field.value).toBeNull();

    const reported: string | null = field.value;
    field.value = reported;
    expect(inputOf(field).value).toBe(partial);
    field.value = '';
    expect(inputOf(field).value).toBe('');
  });

  it('reports the value set before the field is live and seeds the input with it', async () => {
    const field: TelixonPhoneFieldElement = document.createElement('telixon-phone-field');
    field.setAttribute('default-region', 'US');
    field.setAttribute('value', '+12015550123');
    field.value = '+14155550132';
    expect(field.value).toBe('+14155550132');
    field.append(document.createElement('input'));
    document.body.append(field);
    await live(field);
    expect(field.value).toBe('+14155550132');
  });

  it('falls back to the default text for an empty message', async () => {
    const form = mount('<telixon-phone-field error-message=""><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    field.errorMessage = () => '';
    await userEvent.type(inputOf(field), '+1415');
    expect(field.validationMessage).toBe('This number is too short.');
  });

  it('counts a blocked submission as a touch', async () => {
    const form = mount('<telixon-phone-field><input /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    await userEvent.type(inputOf(field), '+1415');
    expect(field.matches(':state(user-invalid)')).toBe(false);
    expect(form.reportValidity()).toBe(false);
    expect(field.matches(':state(user-invalid)')).toBe(true);
  });

  it('keeps the flags the page put on the input itself', async () => {
    const form = mount('<telixon-phone-field><input readonly /></telixon-phone-field>');
    const field = fieldOf(form);
    await live(field);
    expect(inputOf(field).readOnly).toBe(true);
    field.readOnly = true;
    field.readOnly = false;
    expect(inputOf(field).readOnly).toBe(true);
  });
});
