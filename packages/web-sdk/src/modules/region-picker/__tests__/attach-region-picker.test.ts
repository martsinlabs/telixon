// @vitest-environment happy-dom

import type { RegionCode } from '@telixon/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RegionList, RegionOption } from '../../region-list/models';
import { createRegionList } from '../../region-list/region-list';
import { attachRegionPicker } from '../attach-region-picker';
import type { RegionPicker, RegionPickerAttachment } from '../models';
import { createRegionPicker } from '../region-picker';

interface Widget {
  readonly picker: RegionPicker;
  readonly list: RegionList;
  readonly trigger: HTMLButtonElement;
  readonly popup: HTMLElement;
  readonly search: HTMLInputElement;
  readonly listbox: HTMLElement;
  readonly outside: HTMLInputElement;
  readonly attachment: RegionPickerAttachment;
  readonly rows: () => HTMLElement[];
  readonly regions: () => string[];
  readonly destroy: () => void;
}

const widgets: Widget[] = [];

function build(
  overrides: {
    search?: boolean;
    renderTrigger?: (selected: RegionOption | null) => void;
    popupInBody?: boolean;
    autoFocus?: boolean;
  } = {},
): Widget {
  const root = document.createElement('div');
  const form = document.createElement('form');
  const trigger = document.createElement('button');
  const popup = document.createElement('div');
  const search = document.createElement('input');
  const listbox = document.createElement('ul');
  const outside = document.createElement('input');
  popup.append(...(overrides.search === false ? [] : [search]), listbox);
  form.append(trigger);
  if (overrides.popupInBody) document.body.append(popup);
  else form.append(popup);
  root.append(form, outside);
  document.body.append(root);

  const regions = createRegionList();
  const picker = createRegionPicker({ regions });
  const attachment = attachRegionPicker({
    picker,
    trigger,
    popup,
    listbox,
    ...(overrides.search === false ? {} : { search }),
    ...(overrides.renderTrigger === undefined ? {} : { renderTrigger: overrides.renderTrigger }),
    ...(overrides.autoFocus === undefined ? {} : { autoFocus: overrides.autoFocus }),
    renderOption: (option) => {
      const row = document.createElement('li');
      row.textContent = option.displayName;
      return row;
    },
    renderEmpty: () => {
      const row = document.createElement('li');
      row.className = 'empty';
      row.textContent = 'No matches';
      return row;
    },
  });

  const widget: Widget = {
    picker,
    list: regions,
    trigger,
    popup,
    search,
    listbox,
    outside,
    attachment,
    rows: () => [...listbox.querySelectorAll<HTMLElement>('[role="option"]')],
    regions: () => widget.rows().map((row) => row.dataset.region!),
    destroy: () => {
      attachment.destroy();
      picker.destroy();
      regions.destroy();
      root.remove();
      popup.remove();
    },
  };
  widgets.push(widget);
  return widget;
}

afterEach(() => {
  for (const widget of widgets.splice(0)) widget.destroy();
});

function key(target: EventTarget, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function press(target: EventTarget): void {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
}

describe('attachRegionPicker: attributes', () => {
  it('sets the combobox and listbox roles and keeps a button out of form submission', () => {
    const { trigger, search, listbox, popup } = build();

    expect(trigger.type).toBe('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(search.getAttribute('role')).toBe('combobox');
    expect(search.getAttribute('aria-autocomplete')).toBe('list');
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('tabindex')).toBe('-1');
    expect(popup.hidden).toBe(true);
  });

  it('leaves an explicit trigger type alone', () => {
    const trigger = document.createElement('button');
    trigger.type = 'submit';
    const popup = document.createElement('div');
    const listbox = document.createElement('ul');
    popup.append(listbox);
    document.body.append(trigger, popup);
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    const attachment = attachRegionPicker({
      picker,
      trigger,
      popup,
      listbox,
      renderOption: () => document.createElement('li'),
    });

    expect(trigger.type).toBe('submit');

    attachment.destroy();
    picker.destroy();
    regions.destroy();
    trigger.remove();
    popup.remove();
  });

  it('renders every row with an option id and marks the selected one', () => {
    const { picker, rows, regions } = build();

    expect(regions().length).toBe(picker.getState().options.length);
    expect(rows()[0]!.getAttribute('role')).toBe('option');
    expect(rows()[0]!.id).toMatch(/^tlx-region-option-\d+-[A-Z]{2}$/);

    picker.select('US');

    expect(
      rows()
        .filter((row) => row.getAttribute('aria-selected') === 'true')
        .map((row) => row.dataset.region),
    ).toEqual(['US']);
  });

  it('gives two attachments distinct row ids', () => {
    const first = build();
    const second = build();

    expect(first.rows()[0]!.id).not.toBe(second.rows()[0]!.id);
  });
});

describe('attachRegionPicker: opening and closing', () => {
  it('toggles on the trigger and focuses the search field', () => {
    const { trigger, popup, search, picker } = build();

    trigger.click();
    expect(picker.getState().open).toBe(true);
    expect(popup.hidden).toBe(false);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(document.activeElement).toBe(search);

    trigger.click();
    expect(picker.getState().open).toBe(false);
    expect(popup.hidden).toBe(true);
  });

  it('leaves focus alone when autoFocus is off', () => {
    const { trigger, search } = build({ autoFocus: false });

    trigger.click();

    expect(document.activeElement).not.toBe(search);
  });

  it('opens on an arrow key from the closed trigger', () => {
    const { trigger, search, picker } = build();

    const event = key(trigger, 'ArrowDown');

    expect(picker.getState().open).toBe(true);
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(search);
  });

  it('closes on Escape and returns focus to the trigger', () => {
    const { trigger, search, picker } = build();
    trigger.click();

    key(search, 'Escape');

    expect(picker.getState().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('returns focus to the trigger on a closing click that left it in the search field', () => {
    const { trigger, search, picker } = build();
    trigger.click();
    expect(document.activeElement).toBe(search);

    trigger.click();

    expect(picker.getState().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on an outside press whose own handler stops propagation', () => {
    const { trigger, outside, picker } = build();
    trigger.click();
    outside.addEventListener('pointerdown', (event) => event.stopPropagation());

    press(outside);

    expect(picker.getState().open).toBe(false);
  });

  it('closes on a press outside the trigger and the popup, including a popup living in the body', () => {
    const { trigger, outside, picker, search } = build({ popupInBody: true });
    trigger.click();

    press(search);
    expect(picker.getState().open).toBe(true);
    press(outside);
    expect(picker.getState().open).toBe(false);
  });

  it('closes when focus leaves for an element outside, and stays open for a null relatedTarget', () => {
    const { trigger, search, outside, picker } = build();
    trigger.click();

    search.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(picker.getState().open).toBe(true);
    search.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));
    expect(picker.getState().open).toBe(false);
  });
});

describe('attachRegionPicker: search and cursor', () => {
  it('searches on input and points aria-activedescendant at the first row', () => {
    const { trigger, search, picker, regions } = build();
    trigger.click();

    search.value = 'united';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(regions()).toEqual(['AE', 'GB', 'US']);
    expect(picker.getState().active).toBe('AE');
    expect(search.getAttribute('aria-activedescendant')).toMatch(/-AE$/);
  });

  it('moves the cursor with the arrow keys and marks the active row', () => {
    const { trigger, search, picker, rows } = build();
    trigger.click();
    search.value = 'united';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    key(search, 'ArrowDown');

    expect(picker.getState().active).toBe('GB');
    expect(rows().find((row) => row.dataset.active === 'true')?.dataset.region).toBe('GB');
    expect(search.getAttribute('aria-activedescendant')).toMatch(/-GB$/);
  });

  it('moves the cursor under a moving pointer', () => {
    const { trigger, picker, rows } = build();
    trigger.click();

    rows()[3]!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    expect(picker.getState().active).toBe(rows()[3]!.dataset.region);
  });

  it('shows the empty element when nothing matches', () => {
    const { trigger, search, listbox, rows } = build();
    trigger.click();

    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(rows()).toEqual([]);
    expect(listbox.querySelector('.empty')?.textContent).toBe('No matches');
  });

  it('reuses row elements across searches and renders new ones after localize', () => {
    const { trigger, search, rows, list, picker } = build();
    trigger.click();
    picker.select('US');
    const before = rows().find((row) => row.dataset.region === 'US')!;

    search.value = 'united';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rows().find((row) => row.dataset.region === 'US')).toBe(before);

    picker.search('');
    list.localize('de');
    const after = rows().find((row) => row.dataset.region === 'US')!;
    expect(after).not.toBe(before);
    expect(after.getAttribute('aria-selected')).toBe('true');
    const first = picker.getState().options[0]!.region;
    expect(picker.getState().active).toBe(first);
    expect(rows().find((row) => row.dataset.active === 'true')?.dataset.region).toBe(first);
  });

  it('marks a selected row that is rendered after the selection changed', () => {
    const { trigger, search, rows, picker } = build();
    trigger.click();
    search.value = 'can';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rows().map((row) => row.dataset.region)).not.toContain('DE');

    picker.select('DE');
    picker.search('');

    expect(
      rows()
        .find((row) => row.dataset.region === 'DE')
        ?.getAttribute('aria-selected'),
    ).toBe('true');
  });

  it('syncs the search field with a query set on the picker', () => {
    const { trigger, search, picker } = build();
    trigger.click();

    picker.search('can');

    expect(search.value).toBe('can');
  });
});

describe('attachRegionPicker: picking', () => {
  it('picks the active row on Enter, closes, prevents the form submit, and returns focus', () => {
    const { trigger, search, picker } = build();
    trigger.click();
    search.value = 'united';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    const event = key(search, 'Enter');

    expect(event.defaultPrevented).toBe(true);
    expect(picker.getState().selected?.region).toBe('AE');
    expect(picker.getState().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('ignores Enter during IME composition', () => {
    const { trigger, search, picker } = build();
    trigger.click();

    key(search, 'Enter', { isComposing: true });

    expect(picker.getState().selected).toBe(null);
    expect(picker.getState().open).toBe(true);
  });

  it('picks a clicked row and keeps focus on the search field through the press', () => {
    const { trigger, search, picker, rows } = build();
    trigger.click();
    const row = rows().find((row) => row.dataset.region === 'DE')!;

    const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    row.dispatchEvent(mousedown);
    expect(mousedown.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(search);

    row.click();

    expect(picker.getState().selected?.region).toBe('DE');
    expect(picker.getState().open).toBe(false);
  });

  it('calls renderTrigger on attach and on every change of the selection', () => {
    const renderTrigger = vi.fn();
    const { picker } = build({ renderTrigger });

    expect(renderTrigger).toHaveBeenCalledTimes(1);
    expect(renderTrigger).toHaveBeenLastCalledWith(null);

    picker.select('FR');

    expect(renderTrigger).toHaveBeenCalledTimes(2);
    expect(renderTrigger.mock.lastCall![0].region).toBe('FR');
  });
});

describe('attachRegionPicker: without a search field', () => {
  it('keeps the keyboard and the active descendant on the trigger', () => {
    const { trigger, picker } = build({ search: false });

    expect(trigger.getAttribute('role')).toBe('combobox');
    key(trigger, 'ArrowDown');
    expect(picker.getState().open).toBe(true);
    key(trigger, 'ArrowDown');
    expect(trigger.getAttribute('aria-activedescendant')).toMatch(/-A[A-Z]$/);

    const region = picker.getState().active as RegionCode;
    key(trigger, 'Enter');
    expect(picker.getState().selected?.region).toBe(region);
  });
});

describe('attachRegionPicker: destroy', () => {
  it('removes every listener and stops reacting to the picker', () => {
    const { trigger, attachment, picker, popup, outside } = build();

    attachment.destroy();
    trigger.click();
    expect(picker.getState().open).toBe(false);

    picker.open();
    expect(popup.hidden).toBe(true);
    press(outside);
    expect(picker.getState().open).toBe(true);
  });
});
