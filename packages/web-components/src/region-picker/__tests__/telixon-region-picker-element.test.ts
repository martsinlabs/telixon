import type { RegionOption } from '@telixon/web-sdk';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { userEvent } from 'vitest/browser';
import { defineTelixonElements } from '../../define';
import { TelixonPhoneFieldElement } from '../../phone-field';
import { TelixonRegionPickerElement } from '../telixon-region-picker-element';

beforeAll(() => defineTelixonElements());
afterEach(() => document.body.replaceChildren());

const FIELD = '<telixon-phone-field id="phone" default-region="US"><input type="tel" /></telixon-phone-field>';

function mount(html: string): HTMLElement {
  const host: HTMLElement = document.createElement('div');
  host.innerHTML = html;
  document.body.append(host);
  return host;
}

function pickerOf(root: ParentNode): TelixonRegionPickerElement {
  const picker: Element | null = root.querySelector('telixon-region-picker');
  if (!(picker instanceof TelixonRegionPickerElement)) throw new Error('No picker.');
  return picker;
}

function fieldOf(root: ParentNode): TelixonPhoneFieldElement {
  const field: Element | null = root.querySelector('telixon-phone-field');
  if (!(field instanceof TelixonPhoneFieldElement)) throw new Error('No field.');
  return field;
}

function shadowOf(picker: TelixonRegionPickerElement): ShadowRoot {
  if (picker.shadowRoot === null) throw new Error('No shadow root.');
  return picker.shadowRoot;
}

function triggerOf(picker: TelixonRegionPickerElement): HTMLButtonElement {
  const trigger: HTMLButtonElement | null = shadowOf(picker).querySelector('.tlx-region-picker__trigger');
  if (trigger === null) throw new Error('No trigger.');
  return trigger;
}

function rowOf(picker: TelixonRegionPickerElement, region: string): HTMLElement {
  const row: HTMLElement | null = shadowOf(picker).querySelector(`[data-region="${region}"]`);
  if (row === null) throw new Error(`No row for ${region}.`);
  return row;
}

async function live(picker: TelixonRegionPickerElement): Promise<void> {
  await vi.waitFor(() => expect(picker.picker).not.toBeNull());
}

describe('telixon-region-picker', () => {
  it('builds its markup, shows the default region, and waits for the field', async () => {
    const host = mount(`<telixon-region-picker for="phone"></telixon-region-picker>${FIELD}`);
    const picker = pickerOf(host);
    const trigger = triggerOf(picker);

    expect(trigger.getAttribute('type')).toBe('button');
    expect(shadowOf(picker).querySelector('.tlx-region-picker__popup')?.getAttribute('popover')).toBe('manual');
    expect(triggerOf(picker).getAttribute('part')).toBe('trigger');
    expect(trigger.querySelector('telixon-flag')?.getAttribute('region')).toBe('US');
    await live(picker);
    expect(trigger.disabled).toBe(false);
  });

  it('hands a picked region to the field and follows a typed number', async () => {
    const host = mount(`<telixon-region-picker for="phone"></telixon-region-picker>${FIELD}`);
    const picker = pickerOf(host);
    const field = fieldOf(host);
    await live(picker);

    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() => expect(picker.state?.open).toBe(true));
    await userEvent.click(rowOf(picker, 'GB'));
    await vi.waitFor(() => expect(field.state?.region).toBe('GB'));
    expect(picker.state?.open).toBe(false);
    expect(triggerOf(picker).querySelector('telixon-flag')?.getAttribute('region')).toBe('GB');
    expect(triggerOf(picker).getAttribute('aria-label')).toBe('Select region, United Kingdom');

    const input: HTMLInputElement | null = field.inputElement;
    if (input === null) throw new Error('No input.');
    input.value = '';
    await userEvent.type(input, '+1 415');
    await vi.waitFor(() => expect(triggerOf(picker).querySelector('telixon-flag')?.getAttribute('region')).toBe('US'));
  });

  it('narrows the list by the search and picks with the keyboard', async () => {
    const host = mount(`<telixon-region-picker for="phone"></telixon-region-picker>${FIELD}`);
    const picker = pickerOf(host);
    const field = fieldOf(host);
    await live(picker);

    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() =>
      expect(shadowOf(picker).activeElement?.classList.contains('tlx-region-picker__search')).toBe(true),
    );
    await userEvent.keyboard('Germany');
    await vi.waitFor(() => expect(shadowOf(picker).querySelectorAll('[data-region]')).toHaveLength(1));
    await userEvent.keyboard('{Enter}');
    await vi.waitFor(() => expect(field.state?.region).toBe('DE'));
  });

  it('renders rows from a template and names regions in the closest lang', async () => {
    const host = mount(
      `<div lang="de"><telixon-region-picker for="phone"><template slot="option"><b data-field="display-name"></b></template></telixon-region-picker>${FIELD}</div>`,
    );
    const picker = pickerOf(host);
    await live(picker);

    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() => expect(picker.state?.open).toBe(true));
    expect(rowOf(picker, 'DE').querySelector('b')?.textContent).toBe('Deutschland');
  });

  it('follows the field through its filters and its disabled state', async () => {
    const host = mount(`<fieldset><telixon-region-picker for="phone"></telixon-region-picker>${FIELD}</fieldset>`);
    const picker = pickerOf(host);
    const field = fieldOf(host);
    await live(picker);

    field.setAttribute('region-filter', 'US, CA');
    await vi.waitFor(() => expect(picker.state?.options.map((option) => option.region)).toEqual(['CA', 'US']));

    host.querySelector('fieldset')?.setAttribute('disabled', '');
    await vi.waitFor(() => expect(picker.hasAttribute('data-disabled')).toBe(true));
    expect(triggerOf(picker).disabled).toBe(true);
  });

  it('takes the field as an element', async () => {
    const host = mount(`<telixon-region-picker></telixon-region-picker>${FIELD}`);
    const picker = pickerOf(host);
    picker.forElement = fieldOf(host);
    await live(picker);
  });
});

describe('telixon-region-picker: a field that arrives later', () => {
  it('connects once the field is in the page', async () => {
    const host = mount('<telixon-region-picker for="phone"></telixon-region-picker>');
    const picker = pickerOf(host);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(picker.picker).toBeNull();

    host.insertAdjacentHTML('beforeend', FIELD);
    await live(picker);
  });
});

describe('telixon-region-picker: the field it belongs to', () => {
  it('goes inert while the field is read-only and comes back', async () => {
    const host = mount(`<telixon-region-picker for="phone"></telixon-region-picker>${FIELD}`);
    const picker = pickerOf(host);
    const field = fieldOf(host);
    await live(picker);

    field.readOnly = true;
    await vi.waitFor(() => expect(triggerOf(picker).disabled).toBe(true));
    expect(picker.hasAttribute('data-disabled')).toBe(true);
    field.readOnly = false;
    await vi.waitFor(() => expect(triggerOf(picker).disabled).toBe(false));
  });

  it('opens again after a move while the list was open', async () => {
    const host = mount(
      `<div id="a"><telixon-region-picker for="phone"></telixon-region-picker>${FIELD}</div><div id="b"></div>`,
    );
    const picker = pickerOf(host);
    await live(picker);
    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() => expect(picker.state?.open).toBe(true));

    host.querySelector('#b')?.append(picker);
    await live(picker);
    expect(picker.state?.open).toBe(false);
    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() => expect(picker.state?.open).toBe(true));
    const popup: HTMLElement | null = shadowOf(picker).querySelector('.tlx-region-picker__popup');
    expect(popup?.matches(':popover-open')).toBe(true);
  });

  it('takes the anchor as a selector or an element and rejects a broken selector', async () => {
    const host = mount(
      `<div class="box" style="width: 320px; display: flex"><telixon-region-picker for="phone"></telixon-region-picker>${FIELD}</div>`,
    );
    const picker = pickerOf(host);
    await live(picker);

    picker.anchor = '.box';
    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() => expect(picker.state?.open).toBe(true));
    const popup: HTMLElement | null = shadowOf(picker).querySelector('.tlx-region-picker__popup');
    expect(Math.round(popup?.getBoundingClientRect().width ?? 0)).toBe(320);
    expect(() => {
      picker.anchor = '.box[';
    }).toThrow(TypeError);
  });

  it('lets clicks inside it reach the page', async () => {
    const host = mount(`<telixon-region-picker for="phone"></telixon-region-picker>${FIELD}`);
    const picker = pickerOf(host);
    await live(picker);
    let reached: number = 0;
    const count = (): void => {
      reached++;
    };
    document.addEventListener('click', count);
    await userEvent.click(triggerOf(picker));
    document.removeEventListener('click', count);
    expect(reached).toBe(1);
  });
});

describe('telixon-region-picker inside its field', () => {
  it('belongs to the field around it without a for attribute', async () => {
    const host = mount(
      '<telixon-phone-field default-region="US"><telixon-region-picker></telixon-region-picker><input type="tel" /></telixon-phone-field>',
    );
    const picker = pickerOf(host);
    const field = fieldOf(host);
    await live(picker);
    expect(field.inputElement?.tagName).toBe('INPUT');

    await userEvent.click(triggerOf(picker));
    await userEvent.click(rowOf(picker, 'GB'));
    await vi.waitFor(() => expect(field.state?.region).toBe('GB'));
    expect(field.matches(':state(user-invalid)')).toBe(false);
  });
});

describe('telixon-region-picker: changes that reach it without a widget', () => {
  const NESTED =
    '<telixon-phone-field default-region="US"><telixon-region-picker></telixon-region-picker><input type="tel" /></telixon-phone-field>';

  function flagOf(picker: TelixonRegionPickerElement): string | null {
    return triggerOf(picker).querySelector('telixon-flag')?.getAttribute('region') ?? null;
  }

  it('shows a default region changed while the engine still loads', async () => {
    const host = mount(NESTED);
    const picker = pickerOf(host);
    expect(flagOf(picker)).toBe('US');

    fieldOf(host).setAttribute('default-region', 'GB');
    expect(picker.picker).toBeNull();
    expect(flagOf(picker)).toBe('GB');
    await live(picker);
    expect(flagOf(picker)).toBe('GB');
  });

  it('takes templates that arrive after it connected', async () => {
    const host = mount(NESTED);
    const picker = pickerOf(host);
    await live(picker);
    expect(triggerOf(picker).querySelector('i')).toBeNull();

    const triggerTemplate: HTMLTemplateElement = document.createElement('template');
    triggerTemplate.setAttribute('slot', 'trigger');
    triggerTemplate.innerHTML = '<i data-field="display-name"></i>';
    const optionTemplate: HTMLTemplateElement = document.createElement('template');
    optionTemplate.setAttribute('slot', 'option');
    optionTemplate.innerHTML = '<b data-field="display-name"></b>';
    picker.append(triggerTemplate, optionTemplate);

    await vi.waitFor(() => expect(triggerOf(picker).querySelector('i')?.textContent).toBe('United States'));
    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() => expect(picker.state?.open).toBe(true));
    expect(rowOf(picker, 'DE').querySelector('b')?.textContent).toBe('Germany');
  });

  it('exposes every flag inside as the flag part, which the page styles', async () => {
    const host = mount(NESTED);
    const picker = pickerOf(host);
    await live(picker);
    const flagImage = (flag: Element | null): string => {
      if (flag === null) throw new Error('No flag.');
      return getComputedStyle(flag, '::before').backgroundImage;
    };
    const style: HTMLStyleElement = document.createElement('style');
    style.textContent = 'telixon-region-picker::part(flag)::before { background-image: url("/sprite.png"); }';
    document.head.append(style);

    expect(flagImage(triggerOf(picker).querySelector('telixon-flag'))).toContain('sprite.png');
    picker.renderOption = (option: RegionOption): HTMLElement => {
      const row: HTMLElement = document.createElement('li');
      const flag: HTMLElement = document.createElement('telixon-flag');
      flag.setAttribute('region', option.region);
      row.append(flag);
      return row;
    };
    await userEvent.click(triggerOf(picker));
    await vi.waitFor(() => expect(picker.state?.open).toBe(true));
    expect(flagImage(rowOf(picker, 'DE').querySelector('telixon-flag'))).toContain('sprite.png');
    style.remove();
  });
});
