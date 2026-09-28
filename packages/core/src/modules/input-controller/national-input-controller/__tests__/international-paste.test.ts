import type { RegionCode } from '@telixon/core/engine';
import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { createNationalInputController } from '..';

const GB_MOBILE = getExampleNumber('GB', 'MOBILE');
const US_MOBILE = getExampleNumber('US', 'MOBILE');

describe('NationalInputController pasted international numbers', () => {
  it('shows a pasted number of its own region in the national format', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });
    const state = controller.insert('', '+44 ' + GB_MOBILE, 0, 0);

    expect(state.value).toBe('07400 123456');
    expect(state.region).toBe('GB');
    expect(controller.getPhoneNumber().getValidationError()).toBeNull();
  });

  it('drops a trunk prefix written after the calling code', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });
    const state = controller.insert('', '+44 (0)' + GB_MOBILE, 0, 0);

    expect(state.value).toBe('07400 123456');
    expect(controller.getPhoneNumber().formatE164()).toBe('+44' + GB_MOBILE);
  });

  it('applies the paste rule to setValue', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const state = controller.setValue('+1 ' + US_MOBILE);

    expect(state.value).toBe('(201) 555-0123');
  });

  it('replaces typed digits with the pasted number', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const typed = controller.setValue('415');
    const state = controller.insert(typed.value, '+1 ' + US_MOBILE, 0, typed.value.length);

    expect(state.value).toBe('(201) 555-0123');
  });

  it('reads a paste under another calling code literally', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });
    const state = controller.insert('', '+1 ' + US_MOBILE, 0, 0);

    expect(state.value).toBe('12015550123');
    expect(state.region).toBe('GB');
    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('takes a number of another region under the same calling code', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const state = controller.insert('', '+1 416 555 0132', 0, 0);

    expect(state.value).toBe('(416) 555-0132');
    expect(controller.getPhoneNumber().formatE164()).toBe('+14165550132');
  });

  it('leaves a calling code without a national part to the edit path', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    const typed = controller.setValue('415');
    const state = controller.insert(typed.value, '+1', typed.value.length, typed.value.length);

    expect(state.value).toBe('(415) 1');
  });

  it('undo restores the value before the paste', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });
    const typed = controller.setValue('020');
    controller.insert(typed.value, '+44 ' + GB_MOBILE, typed.value.length, typed.value.length);
    const state = controller.undo();

    expect(state.value).toBe(typed.value);
  });
});

describe('NationalInputController pasted numbers under strict', () => {
  it('takes a number of its own region', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB', strict: true });
    const state = controller.insert('', '+44 ' + GB_MOBILE, 0, 0);

    expect(state.value).toBe('07400 123456');
    expect(controller.getPhoneNumber().isValid()).toBe(true);
  });

  it('takes a number under its calling code and reports it invalid for the pinned region', () => {
    const controller = createNationalInputController({ defaultRegion: 'CA', strict: true });
    const state = controller.insert('', '+1 ' + US_MOBILE, 0, 0);

    expect(state.value).toBe('(201) 555-0123');
    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });

  it('reads a paste under another calling code literally', () => {
    const controller = createNationalInputController({ defaultRegion: 'CA', strict: true });
    const state = controller.insert('', '+44 ' + GB_MOBILE, 0, 0);

    expect(state.value).toBe('447400123456');
    expect(controller.getPhoneNumber().isValid()).toBe(false);
  });
});

describe('NationalInputController setRegion with an unknown region', () => {
  it('keeps the field and its region', () => {
    const controller = createNationalInputController({ defaultRegion: 'GB' });
    const typed = controller.setValue('02071838750');
    const state = controller.setRegion('ZZ' as RegionCode);

    expect(state.value).toBe(typed.value);
    expect(state.region).toBe('GB');
    expect(controller.getPhoneNumber().formatE164()).toBe('+442071838750');
  });
});
