// @vitest-environment happy-dom

import type { RegionCode } from '@telixon/core';
import { describe, expect, it, vi } from 'vitest';
import type { PhoneInput, PhoneInputListener, PhoneInputState } from '../../phone-input/models';
import { createPhoneInput } from '../../phone-input/phone-input';
import { createRegionList } from '../../region-list/region-list';
import { createRegionPicker } from '../region-picker';

function regionsOf(state: { readonly options: readonly { readonly region: RegionCode }[] }): RegionCode[] {
  return state.options.map((option) => option.region);
}

// A phone stand-in that emits whatever state a test hands it.
function phoneStub(
  initial: Partial<PhoneInputState> = {},
): PhoneInput & { push(state: Partial<PhoneInputState>): void } {
  const listeners = new Set<PhoneInputListener>();
  let state: PhoneInputState = {
    value: '',
    region: 'US',
    selectionStart: 0,
    selectionEnd: 0,
    regionFilter: null,
    numberTypeFilter: null,
    placeholder: null,
    validationError: null,
    ...initial,
  };
  const emit = (): void => {
    for (const listener of listeners) listener(state);
  };
  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getState: () => state,
    setRegion: (region) => {
      state = { ...state, region };
      emit();
    },
    push: (patch) => {
      state = { ...state, ...patch };
      emit();
    },
    setValue: vi.fn(),
    canUndo: () => false,
    canRedo: () => false,
    undo: vi.fn(),
    redo: vi.fn(),
    clearHistory: vi.fn(),
    getPhoneNumber: () => {
      throw new Error('not used');
    },
    setRegionFilter: vi.fn(),
    setNumberTypeFilter: vi.fn(),
    destroy: vi.fn(),
  };
}

describe('createRegionPicker: on its own', () => {
  it('starts closed, with nothing selected, and the rows of the list', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    const state = picker.getState();

    expect(state.open).toBe(false);
    expect(state.selected).toBe(null);
    expect(state.active).toBe(null);
    expect(state.options).toBe(regions.getState().options);
    expect(state.searchQuery).toBe('');

    picker.destroy();
    regions.destroy();
  });

  it('selects a region and keeps its option, leaving the open state alone', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    picker.open();

    picker.select('GB');

    expect(picker.getState().selected).toBe(regions.getOption('GB'));
    expect(picker.getState().open).toBe(true);

    picker.destroy();
    regions.destroy();
  });

  it('ignores a region the list does not know', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    picker.select('US');

    picker.select('ZZ' as RegionCode);

    expect(picker.getState().selected).toBe(regions.getOption('US'));

    picker.destroy();
    regions.destroy();
  });
});

describe('createRegionPicker: open, close, cursor', () => {
  it('opens with an empty query and the cursor on the selected row', () => {
    const regions = createRegionList({ searchQuery: 'united' });
    const picker = createRegionPicker({ regions });
    picker.select('GB');

    picker.open();
    const state = picker.getState();

    expect(state.open).toBe(true);
    expect(state.searchQuery).toBe('');
    expect(state.active).toBe('GB');

    picker.destroy();
    regions.destroy();
  });

  it('closes with a cleared cursor, and toggle flips both ways', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });

    picker.toggle();
    expect(picker.getState().open).toBe(true);
    picker.toggle();
    expect(picker.getState().open).toBe(false);
    expect(picker.getState().active).toBe(null);

    picker.destroy();
    regions.destroy();
  });

  it('moves the cursor to the first row when the query changes', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    picker.open();

    picker.search('united');

    const state = picker.getState();
    expect(regionsOf(state)).toEqual(['AE', 'GB', 'US']);
    expect(state.active).toBe('AE');

    picker.destroy();
    regions.destroy();
  });

  it('walks the cursor with wrapping at both ends', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    picker.open();
    picker.search('united');

    picker.moveActive(1);
    expect(picker.getState().active).toBe('GB');
    picker.moveActive(1);
    picker.moveActive(1);
    expect(picker.getState().active).toBe('AE');
    picker.moveActive(-1);
    expect(picker.getState().active).toBe('US');

    picker.setActive(null);
    picker.moveActive(-1);
    expect(picker.getState().active).toBe('US');
    picker.setActive(null);
    picker.moveActive(1);
    expect(picker.getState().active).toBe('AE');

    picker.destroy();
    regions.destroy();
  });

  it('clears the cursor for a region outside the rows', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    picker.open();
    picker.search('united');

    picker.setActive('DE');

    expect(picker.getState().active).toBe(null);

    picker.destroy();
    regions.destroy();
  });
});

describe('createRegionPicker: bound to a phone input', () => {
  it('takes the selected region from the phone and follows its resolved region', () => {
    const input = document.createElement('input');
    input.type = 'tel';
    const phone = createPhoneInput({
      mode: 'international',
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
      input,
    });
    const regions = createRegionList();
    const picker = createRegionPicker({ regions, phone });

    expect(picker.getState().selected?.region).toBe('US');

    picker.select('CA');
    expect(phone.getState().region).toBe('CA');
    expect(picker.getState().selected).toBe(regions.getOption('CA'));

    // 604 belongs to Canada on the shared calling code; the phone resolves it and the picker follows.
    picker.select('US');
    phone.setValue('6045550132');
    expect(phone.getState().region).toBe('CA');
    expect(picker.getState().selected?.region).toBe('CA');

    picker.destroy();
    regions.destroy();
    phone.destroy();
  });

  it('keeps the last region while the phone reports none', () => {
    const phone = phoneStub({ region: 'GB' });
    const regions = createRegionList();
    const picker = createRegionPicker({ regions, phone });

    phone.push({ region: null });

    expect(picker.getState().selected?.region).toBe('GB');

    picker.destroy();
    regions.destroy();
  });

  it('writes to the phone once per select and never from a subscription', () => {
    const phone = phoneStub({ region: 'US' });
    const setRegion = vi.spyOn(phone, 'setRegion');
    const regions = createRegionList();
    const listListener = vi.fn();
    regions.subscribe(listListener);
    const picker = createRegionPicker({ regions, phone });
    const pickerListener = vi.fn();
    picker.subscribe(pickerListener);

    picker.select('DE');
    phone.push({ region: 'FR', regionFilter: ['FR', 'DE'] });

    expect(setRegion).toHaveBeenCalledTimes(1);
    expect(listListener).not.toHaveBeenCalled();
    expect(pickerListener).toHaveBeenCalledTimes(2);
    expect(picker.getState().selected?.region).toBe('FR');

    picker.destroy();
    regions.destroy();
  });

  it('emits once for a select that round-trips through the phone', () => {
    const phone = phoneStub({ region: 'US' });
    const regions = createRegionList();
    const picker = createRegionPicker({ regions, phone });
    picker.open();
    const listener = vi.fn();
    picker.subscribe(listener);

    picker.select('DE');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0]![0].selected?.region).toBe('DE');
    expect(listener.mock.calls[0]![0].open).toBe(true);

    picker.destroy();
    regions.destroy();
  });
});

describe('createRegionPicker: emission and lifetime', () => {
  it('works with detached methods', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    const { toggle, search, moveActive, select } = picker;

    toggle();
    search('united');
    moveActive(1);
    select('GB');

    expect(picker.getState().open).toBe(true);
    expect(picker.getState().active).toBe('GB');
    expect(picker.getState().selected?.region).toBe('GB');

    picker.destroy();
    regions.destroy();
  });

  it('emits only on a change', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    picker.select('US');
    const listener = vi.fn();
    picker.subscribe(listener);

    picker.close();
    picker.setActive(null);
    picker.search('');
    picker.select('US');

    expect(listener).not.toHaveBeenCalled();

    picker.destroy();
    regions.destroy();
  });

  it('follows a localized list with the recomputed selected option', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    picker.select('US');

    regions.localize('fr');

    expect(picker.getState().selected).toBe(regions.getOption('US'));
    expect(picker.getState().selected?.displayName).toBe(new Intl.DisplayNames(['fr'], { type: 'region' }).of('US'));

    picker.destroy();
    regions.destroy();
  });

  it('stops emitting after destroy and leaves the list alive', () => {
    const regions = createRegionList();
    const picker = createRegionPicker({ regions });
    const listener = vi.fn();
    picker.subscribe(listener);

    picker.destroy();
    picker.open();
    regions.search('united');

    expect(listener).not.toHaveBeenCalled();
    expect(regionsOf(regions.getState())).toEqual(['AE', 'GB', 'US']);

    regions.destroy();
  });
});
