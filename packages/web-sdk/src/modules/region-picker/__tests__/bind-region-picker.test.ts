// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from 'vitest';
import type { RegionList } from '../../region-list/models';
import { createRegionList } from '../../region-list/region-list';
import { bindRegionPicker } from '../bind-region-picker';
import type { RegionPicker, RegionPickerBinding } from '../models';
import { createRegionPicker } from '../region-picker';

interface Widget {
  readonly picker: RegionPicker;
  readonly binding: RegionPickerBinding;
  readonly trigger: HTMLButtonElement;
  readonly popup: HTMLElement;
  readonly search: HTMLInputElement;
  readonly listbox: HTMLElement;
  readonly outside: HTMLInputElement;
  readonly rows: () => HTMLElement[];
  readonly regions: () => string[];
  readonly destroy: () => void;
}

const widgets: Widget[] = [];

// The caller renders the rows, as a framework's template would. Only `data-region` and the id
// come from the binding's contract.
function build(overrides: { search?: boolean } = {}): Widget {
  const root = document.createElement('div');
  const trigger = document.createElement('button');
  const popup = document.createElement('div');
  const search = document.createElement('input');
  const listbox = document.createElement('ul');
  const outside = document.createElement('input');
  popup.hidden = true;
  popup.append(...(overrides.search === false ? [] : [search]), listbox);
  root.append(trigger, popup, outside);
  document.body.append(root);

  const regions: RegionList = createRegionList();
  const picker = createRegionPicker({ regions });
  const binding = bindRegionPicker({
    picker,
    trigger,
    popup,
    listbox,
    ...(overrides.search === false ? {} : { search }),
  });

  function render(): void {
    listbox.replaceChildren(
      ...picker.getState().options.map((option) => {
        const row = document.createElement('li');
        row.id = binding.ids.option(option.region);
        row.dataset.region = option.region;
        row.textContent = option.displayName;
        return row;
      }),
    );
  }

  render();
  const unsubscribe = picker.subscribe(render);

  const widget: Widget = {
    picker,
    binding,
    trigger,
    popup,
    search,
    listbox,
    outside,
    rows: () => [...listbox.querySelectorAll<HTMLElement>('[data-region]')],
    regions: () => widget.rows().map((row) => row.dataset.region!),
    destroy: () => {
      unsubscribe();
      binding.destroy();
      picker.destroy();
      regions.destroy();
      root.remove();
    },
  };
  widgets.push(widget);
  return widget;
}

afterEach(() => {
  for (const widget of widgets.splice(0)) widget.destroy();
});

function key(target: EventTarget, name: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  return event;
}

function press(target: EventTarget): void {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
}

function rowOf(listbox: HTMLElement, region: string): HTMLElement {
  return listbox.querySelector<HTMLElement>(`[data-region="${region}"]`)!;
}

// happy-dom reports every box as empty, which the scroller reads as nothing to do.
function stubBox(element: HTMLElement, box: { top: number; bottom: number; height: number }): void {
  element.getBoundingClientRect = (): DOMRect =>
    ({ ...box, left: 0, right: 0, width: 0, x: 0, y: 0, toJSON: () => box }) as DOMRect;
}

describe('bindRegionPicker: attributes', () => {
  it('writes the roles, the listbox id, and aria-controls once', () => {
    const { trigger, search, listbox } = build();

    expect(trigger.type).toBe('button');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
    expect(search.getAttribute('role')).toBe('combobox');
    expect(search.getAttribute('aria-autocomplete')).toBe('list');
    expect(listbox.id).toMatch(/^tlx-region-listbox-\d+$/);
    expect(listbox.getAttribute('role')).toBe('listbox');
    expect(listbox.getAttribute('tabindex')).toBe('-1');
  });

  it('leaves the state attributes and the focus on open to the caller', () => {
    const { trigger, search, popup, listbox, rows, picker } = build();

    trigger.click();
    picker.setActive('US');
    picker.select('CA');

    expect(picker.getState().open).toBe(true);
    expect(popup.hidden).toBe(true);
    expect(trigger.hasAttribute('aria-expanded')).toBe(false);
    expect(search.hasAttribute('aria-expanded')).toBe(false);
    expect(search.hasAttribute('aria-activedescendant')).toBe(false);
    expect(search.value).toBe('');
    expect(document.activeElement).not.toBe(search);
    expect(listbox.querySelector('[aria-selected="true"]')).toBe(null);
    expect(rows().some((row) => row.dataset.active !== undefined)).toBe(false);
  });

  it('carries the combobox role on the trigger without a search field', () => {
    const { trigger, listbox } = build({ search: false });

    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-controls')).toBe(listbox.id);
  });

  it('keeps an id the listbox already carries', () => {
    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    const listbox = document.createElement('ul');
    listbox.id = 'regions-of-mine';
    popup.append(listbox);
    document.body.append(trigger, popup);
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    const binding = bindRegionPicker({ picker, trigger, popup, listbox });

    expect(listbox.id).toBe('regions-of-mine');
    expect(binding.ids.listbox).toBe('regions-of-mine');
    expect(trigger.getAttribute('aria-controls')).toBe('regions-of-mine');

    binding.destroy();
    picker.destroy();
    regions.destroy();
    trigger.remove();
    popup.remove();
  });

  it('gives two bindings distinct option ids', () => {
    const first = build();
    const second = build();

    expect(first.binding.ids.option('US')).not.toBe(second.binding.ids.option('US'));
  });
});

describe('bindRegionPicker: opening and closing', () => {
  it('toggles the picker on the trigger', () => {
    const { trigger, picker } = build();

    trigger.click();
    expect(picker.getState().open).toBe(true);

    trigger.click();
    expect(picker.getState().open).toBe(false);
  });

  it('drives the list from the trigger without a search field', () => {
    const { trigger, picker } = build({ search: false });

    key(trigger, 'ArrowDown');
    expect(picker.getState().open).toBe(true);

    const first = picker.getState().active;
    key(trigger, 'ArrowDown');
    const second = picker.getState().active;
    expect(second).not.toBe(first);

    key(trigger, 'Enter');

    expect(picker.getState().selected?.region).toBe(second);
    expect(picker.getState().open).toBe(false);
  });

  // Safari leaves focus on the body after a button click, which would strand every key handler.
  it('takes focus to the trigger when a click opens the list', () => {
    const { trigger, picker } = build();
    document.body.focus();

    trigger.click();

    expect(picker.getState().open).toBe(true);
    expect(document.activeElement).toBe(trigger);
    key(trigger, 'Escape');
    expect(picker.getState().open).toBe(false);
  });

  it('opens on an arrow key from the closed trigger', () => {
    const { trigger, picker } = build();

    const event = key(trigger, 'ArrowDown');

    expect(picker.getState().open).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('closes on Escape and takes focus back to the trigger', () => {
    const { trigger, search, picker } = build();

    trigger.click();
    search.focus();
    key(search, 'Escape');

    expect(picker.getState().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on an outside press and stays open on a press inside', () => {
    const { trigger, listbox, outside, picker } = build();

    trigger.click();
    press(listbox);
    expect(picker.getState().open).toBe(true);

    press(outside);
    expect(picker.getState().open).toBe(false);
  });

  // A press inside a shadow root reaches the document retargeted to the host.
  it('keeps the list open for a press inside a popup in a shadow root', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    const listbox = document.createElement('ul');
    popup.append(listbox);
    root.append(trigger, popup);
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    const binding = bindRegionPicker({ picker, trigger, popup, listbox });

    trigger.click();
    expect(picker.getState().open).toBe(true);

    listbox.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(picker.getState().open).toBe(true);

    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(picker.getState().open).toBe(false);

    binding.destroy();
    picker.destroy();
    regions.destroy();
    host.remove();
  });

  it('closes when focus leaves for an element outside', () => {
    const { trigger, search, outside, picker } = build();

    trigger.click();
    search.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }));

    expect(picker.getState().open).toBe(false);
  });

  it('stays open when focus leaves for nowhere', () => {
    const { trigger, search, picker } = build();

    trigger.click();
    search.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));

    expect(picker.getState().open).toBe(true);
  });
});

describe('bindRegionPicker: the cursor and picking', () => {
  it('moves the cursor with the arrow keys', () => {
    const { trigger, search, picker } = build();

    trigger.click();
    const first = picker.getState().active;
    key(search, 'ArrowDown');

    expect(picker.getState().active).not.toBe(first);

    key(search, 'ArrowUp');

    expect(picker.getState().active).toBe(first);
  });

  it('moves the cursor onto the row under the pointer', () => {
    const { trigger, rows, picker } = build();

    trigger.click();
    const row = rows()[4]!;
    row.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));

    expect(picker.getState().active).toBe(row.dataset.region);
  });

  it('picks the cursor row on Enter, moves focus, and closes', () => {
    const { trigger, search, picker } = build();

    trigger.click();
    picker.setActive('CA');
    const event = key(search, 'Enter');

    expect(picker.getState().selected?.region).toBe('CA');
    expect(picker.getState().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(event.defaultPrevented).toBe(true);
  });

  // Focus must leave the popup before it closes, which never strands it inside a hidden container.
  it('moves focus before the list closes on a pick', () => {
    const { trigger, search, picker } = build();
    let focusAtClose: Element | null = null;
    const unsubscribe = picker.subscribe((state) => {
      if (!state.open) focusAtClose = document.activeElement;
    });

    trigger.click();
    search.focus();
    picker.setActive('CA');
    key(search, 'Enter');

    expect(focusAtClose).toBe(trigger);
    unsubscribe();
  });

  it('moves focus before the list closes on Escape', () => {
    const { trigger, search, picker } = build();
    let focusAtClose: Element | null = null;
    const unsubscribe = picker.subscribe((state) => {
      if (!state.open) focusAtClose = document.activeElement;
    });

    trigger.click();
    search.focus();
    key(search, 'Escape');

    expect(focusAtClose).toBe(trigger);
    unsubscribe();
  });

  it('ignores Enter while a composition is running', () => {
    const { trigger, search, picker } = build();

    trigger.click();
    picker.setActive('CA');
    key(search, 'Enter', { isComposing: true });

    expect(picker.getState().selected).toBe(null);
    expect(picker.getState().open).toBe(true);
  });

  it('picks the row a click lands in and returns focus where asked', () => {
    const root = document.createElement('div');
    const trigger = document.createElement('button');
    const popup = document.createElement('div');
    const listbox = document.createElement('ul');
    const phone = document.createElement('input');
    popup.append(listbox);
    root.append(trigger, popup, phone);
    document.body.append(root);
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    const binding = bindRegionPicker({ picker, trigger, popup, listbox, returnFocusTo: phone });
    const row = document.createElement('li');
    row.dataset.region = 'GB';
    row.textContent = 'United Kingdom';
    listbox.append(row);

    trigger.click();
    row.click();

    expect(picker.getState().selected?.region).toBe('GB');
    expect(document.activeElement).toBe(phone);

    binding.destroy();
    picker.destroy();
    regions.destroy();
    root.remove();
  });

  it('ignores a click that matches a region above the listbox', () => {
    const { trigger, listbox, popup, picker } = build();
    // A wrapper marked with a region, as a styling hook, must never stand in for a row.
    popup.dataset.region = 'FR';

    trigger.click();
    // Replaced after the opening render, which leaves the listbox holding no row.
    const filler = document.createElement('div');
    listbox.replaceChildren(filler);
    filler.click();

    expect(picker.getState().selected).toBe(null);
    expect(picker.getState().open).toBe(true);
  });

  it('keeps focus where it is while a row is pressed', () => {
    const { trigger, rows } = build();

    trigger.click();
    const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
    rows()[0]!.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
  });

  it('finds a row rendered after the binding was made', () => {
    const { trigger, search, picker, regions } = build();

    trigger.click();
    search.value = 'united';
    search.dispatchEvent(new Event('input', { bubbles: true }));

    expect(regions()).toEqual(['AE', 'GB', 'US']);

    key(search, 'ArrowDown');

    expect(picker.getState().active).toBe('GB');
  });

  // Layout is out of reach here. The boxes are stated and the scrolling is measured against them.
  it('scrolls the cursor row into view', () => {
    const { trigger, listbox, binding, picker } = build();
    stubBox(listbox, { top: 0, bottom: 100, height: 100 });

    trigger.click();
    picker.setActive('CA');
    stubBox(rowOf(listbox, 'CA'), { top: 150, bottom: 180, height: 30 });
    binding.revealCursor();

    expect(listbox.scrollTop).toBe(80);
  });

  it('leaves the scroll alone without a cursor', () => {
    const { listbox, binding, picker } = build();
    stubBox(listbox, { top: 0, bottom: 100, height: 100 });

    expect(picker.getState().active).toBe(null);
    binding.revealCursor();

    expect(listbox.scrollTop).toBe(0);
  });
});

describe('bindRegionPicker: destroy', () => {
  it('stops listening and leaves the attributes in place', () => {
    const { trigger, binding, listbox, picker } = build();

    binding.destroy();
    binding.destroy();
    trigger.click();

    expect(picker.getState().open).toBe(false);
    expect(listbox.getAttribute('role')).toBe('listbox');
  });
});
