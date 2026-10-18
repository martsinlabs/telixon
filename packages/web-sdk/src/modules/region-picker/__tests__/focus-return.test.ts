// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { createRegionList } from '../../region-list';
import { bindRegionPicker } from '../bind-region-picker';
import { createRegionPicker } from '../region-picker';

function element<K extends keyof HTMLElementTagNameMap>(tag: K): HTMLElementTagNameMap[K] {
  const node: HTMLElementTagNameMap[K] = document.createElement(tag);
  document.body.appendChild(node);
  return node;
}

describe('bindRegionPicker and focus moving to the return target', () => {
  it('keeps the list open while focus moves to the element a pick returns it to', () => {
    const trigger: HTMLButtonElement = element('button');
    const popup: HTMLDivElement = element('div');
    const listbox: HTMLUListElement = element('ul');
    const field: HTMLInputElement = element('input');
    const other: HTMLInputElement = element('input');
    const picker = createRegionPicker({ regions: createRegionList() });
    const binding = bindRegionPicker({ picker, trigger, popup, listbox, returnFocusTo: field });

    picker.open();
    trigger.dispatchEvent(new FocusEvent('focusout', { relatedTarget: field, bubbles: true }));
    expect(picker.getState().open).toBe(true);

    trigger.dispatchEvent(new FocusEvent('focusout', { relatedTarget: other, bubbles: true }));
    expect(picker.getState().open).toBe(false);

    binding.destroy();
    picker.destroy();
  });
});
