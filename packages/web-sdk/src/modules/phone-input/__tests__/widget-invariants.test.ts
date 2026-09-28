// @vitest-environment happy-dom

import { getCallingCodeForRegion, getPlaceholders, parsePhoneNumber } from '@telixon/core';
import { describe, expect, it } from 'vitest';
import { createRegionList } from '../../region-list';
import { createRegionPicker } from '../../region-picker';
import type {
  InternationalPhoneInputOptions,
  NationalPhoneInputOptions,
  PhoneInput,
  PhoneInputOptions,
  PhoneInputState,
} from '../models';
import { createPhoneInput } from '../phone-input';

const problems: string[] = [];
let checks = 0;
const fail = (message: string): void => {
  if (problems.length < 25) problems.push(message);
};

function attach(): { input: HTMLInputElement; cleanup: () => void } {
  const input = document.createElement('input');
  input.type = 'tel';
  document.body.appendChild(input);
  return { input, cleanup: (): void => input.remove() };
}

function beforeInput(input: HTMLInputElement, inputType: string, data: string | null = null): void {
  input.dispatchEvent(new InputEvent('beforeinput', { inputType, data, bubbles: true, cancelable: true }));
}

const example = (region: string): string => {
  const placeholder = getPlaceholders(region as never, 'MOBILE') ?? getPlaceholders(region as never, 'FIXED_LINE');
  return (placeholder?.international ?? '').replace(/\D/g, '');
};

// Everything the widget promises, checked after every single event.
function invariants(where: string, phone: PhoneInput, input: HTMLInputElement, emits: PhoneInputState[]): void {
  checks++;
  const state = phone.getState();
  if (input.value !== state.value)
    fail(`${where}: element ${JSON.stringify(input.value)} != state ${JSON.stringify(state.value)}`);
  if (input.selectionStart !== state.selectionStart || input.selectionEnd !== state.selectionEnd) {
    fail(
      `${where}: element caret ${input.selectionStart}..${input.selectionEnd} != state ${state.selectionStart}..${state.selectionEnd}`,
    );
  }
  if (state.selectionStart < 0 || state.selectionEnd > state.value.length) fail(`${where}: caret outside the value`);
  const number = phone.getPhoneNumber();
  if (state.validationError?.kind !== number.getValidationError()?.kind) {
    fail(`${where}: state fault ${state.validationError?.kind} != number ${number.getValidationError()?.kind}`);
  }
  if (state.region !== phone.getState().region) fail(`${where}: region not stable between reads`);
  const last: PhoneInputState | undefined = emits[emits.length - 1];
  if (last !== undefined && last.value !== state.value)
    fail(`${where}: last emit ${JSON.stringify(last.value)} != state`);
}

const REGIONS = ['US', 'GB', 'DE', 'FR', 'BR', 'JP', 'AR', 'SE', 'CA', 'IN'];

type WidgetOptions = Omit<InternationalPhoneInputOptions, 'input'> | Omit<NationalPhoneInputOptions, 'input'>;

function configurations(region: string): { name: string; options: WidgetOptions }[] {
  return [
    { name: `inside ${region}`, options: { mode: 'international', defaultRegion: region as never } },
    {
      name: `inside ${region} fixed plus`,
      options: {
        mode: 'international',
        defaultRegion: region as never,
        display: { callingCodeInInput: true, plusPrefix: 'fixed' },
      },
    },
    {
      name: `inside ${region} erasable plus`,
      options: {
        mode: 'international',
        defaultRegion: region as never,
        display: { callingCodeInInput: true, plusPrefix: 'erasable' },
      },
    },
    {
      name: `outside ${region}`,
      options: { mode: 'international', defaultRegion: region as never, display: { callingCodeInInput: false } },
    },
    { name: `national ${region}`, options: { mode: 'national', defaultRegion: region as never } },
  ];
}

// Every configuration of a field, driven through every event the widget covers, with the element,
// the state, the caret and the number checked against each other after each one.
describe('web-sdk widget invariants', () => {
  it('holds through every covered event in every configuration', () => {
    for (const region of REGIONS) {
      const digits = example(region);
      if (digits === '') continue;
      const code = getCallingCodeForRegion(region as never);

      for (const config of configurations(region)) {
        const { input, cleanup } = attach();
        const emits: PhoneInputState[] = [];
        const phone = createPhoneInput({ input, ...config.options } as PhoneInputOptions);
        phone.subscribe((state) => emits.push(state));
        invariants(`${config.name} attach`, phone, input, emits);

        // 1. Type the number one digit at a time.
        for (const digit of digits) {
          input.setSelectionRange(input.value.length, input.value.length);
          beforeInput(input, 'insertText', digit);
          invariants(`${config.name} type ${digit}`, phone, input, emits);
        }

        // 2. Every delete the widget covers.
        for (const inputType of [
          'deleteContentBackward',
          'deleteContentForward',
          'deleteWordBackward',
          'deleteWordForward',
          'deleteByCut',
          'deleteByDrag',
          'deleteSoftLineBackward',
          'deleteHardLineForward',
          'deleteEntireSoftLine',
        ]) {
          const caret = Math.floor(input.value.length / 2);
          input.setSelectionRange(caret, caret);
          beforeInput(input, inputType);
          invariants(`${config.name} ${inputType}`, phone, input, emits);
        }

        // 3. Paste, drop and yank of a whole number.
        for (const inputType of ['insertFromPaste', 'insertFromDrop', 'insertFromYank']) {
          input.setSelectionRange(0, input.value.length);
          beforeInput(input, inputType, `+${code} ${digits}`);
          invariants(`${config.name} ${inputType}`, phone, input, emits);
        }

        // 4. Undo and redo, through the event and through the shortcut.
        beforeInput(input, 'historyUndo');
        invariants(`${config.name} historyUndo`, phone, input, emits);
        beforeInput(input, 'historyRedo');
        invariants(`${config.name} historyRedo`, phone, input, emits);
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', metaKey: true, bubbles: true, cancelable: true }));
        invariants(`${config.name} meta z`, phone, input, emits);

        // 5. A composition, committed the way a browser commits it.
        const composed = input.value + digits.slice(0, 2);
        input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
        input.value = composed;
        input.setSelectionRange(composed.length, composed.length);
        input.dispatchEvent(new CompositionEvent('compositionend', { data: digits.slice(0, 2), bubbles: true }));
        invariants(`${config.name} compositionend`, phone, input, emits);

        // 6. A value written into the element from outside.
        input.value = `+${code}${digits}`;
        input.dispatchEvent(new InputEvent('input', { inputType: 'insertReplacementText' }));
        invariants(`${config.name} external write`, phone, input, emits);
        if (phone.getPhoneNumber().formatE164() !== parsePhoneNumber(`+${code}${digits}`).formatE164()) {
          fail(`${config.name}: an external write of the region's own number did not resolve`);
        }

        // 7. The API surface.
        phone.setValue(`+${code}${digits}`);
        invariants(`${config.name} setValue`, phone, input, emits);
        phone.setRegion('GB');
        invariants(`${config.name} setRegion`, phone, input, emits);
        phone.setRegionFilter(['GB', region as never]);
        invariants(`${config.name} setRegionFilter`, phone, input, emits);
        phone.setRegionFilter(null);
        phone.setNumberTypeFilter(['MOBILE']);
        invariants(`${config.name} setNumberTypeFilter`, phone, input, emits);
        phone.setNumberTypeFilter(null);
        phone.clearHistory();
        invariants(`${config.name} clearHistory`, phone, input, emits);

        // 8. Destroy hands the element back: no listener of the widget may touch or cancel an event.
        const before = input.value;
        const emitCount = emits.length;
        phone.destroy();
        const afterDestroy = new InputEvent('beforeinput', {
          inputType: 'insertText',
          data: '5',
          bubbles: true,
          cancelable: true,
        });
        input.dispatchEvent(afterDestroy);
        if (afterDestroy.defaultPrevented) fail(`${config.name}: a destroyed widget still cancels an edit`);
        if (input.value !== before) fail(`${config.name}: an event after destroy changed the element`);
        input.value = 'typed by the page';
        input.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
        if (input.value !== 'typed by the page') fail(`${config.name}: a destroyed widget still rewrites the element`);
        const undoAfterDestroy = new KeyboardEvent('keydown', {
          key: 'z',
          metaKey: true,
          bubbles: true,
          cancelable: true,
        });
        input.dispatchEvent(undoAfterDestroy);
        if (undoAfterDestroy.defaultPrevented) fail(`${config.name}: a destroyed widget still takes the undo shortcut`);
        if (input.value !== 'typed by the page')
          fail(`${config.name}: a destroyed widget still answers the undo shortcut`);
        if (emits.length !== emitCount) fail(`${config.name}: an event after destroy emitted`);
        cleanup();
      }
    }

    // 9. The picker bound to a phone follows it, and the phone follows the picker.
    for (const region of REGIONS) {
      const { input, cleanup } = attach();
      const phone = createPhoneInput({
        input,
        mode: 'international',
        defaultRegion: region as never,
        display: { callingCodeInInput: false },
      });
      const regions = createRegionList({ prioritize: ['US', 'GB'] });
      const picker = createRegionPicker({ regions, phone });
      checks++;

      if (picker.getState().selected?.region !== phone.getState().region) {
        fail(
          `${region}: the picker opened on ${picker.getState().selected?.region} for a field on ${phone.getState().region}`,
        );
      }
      picker.select('GB');
      if (phone.getState().region !== 'GB') fail(`${region}: a pick left the field on ${phone.getState().region}`);
      if (picker.getState().selected?.region !== 'GB') fail(`${region}: the picker did not follow its own pick`);

      phone.setRegion('DE');
      if (picker.getState().selected?.region !== 'DE') fail(`${region}: the picker did not follow the field`);

      picker.open();
      const open = picker.getState();
      if (!open.open) fail(`${region}: open did not open`);
      if (open.active === null) fail(`${region}: an open list has no cursor`);
      if (!open.options.some((option) => option.region === open.active)) fail(`${region}: the cursor is on no row`);
      picker.search('united');
      for (const option of picker.getState().options) {
        const text = `${option.displayName} ${option.region} ${option.callingCode}`.toLowerCase();
        if (!text.includes('united')) fail(`${region}: the search kept ${option.region}`);
      }
      picker.search('');
      picker.close();
      if (picker.getState().active !== null) fail(`${region}: a closed list keeps a cursor`);

      picker.destroy();
      regions.destroy();
      phone.destroy();
      cleanup();
    }

    // 10. Attach over text the element already carries, and over an element of every allowed type.
    for (const type of ['tel', 'text']) {
      const { input, cleanup } = attach();
      input.type = type;
      input.value = '+44 20 7183 8750';
      const phone = createPhoneInput({ input, mode: 'international', defaultRegion: 'US' });
      checks++;
      if (input.value !== phone.getState().value) fail(`attach over ${type}: element and state differ`);
      if (phone.getPhoneNumber().formatE164() !== '+442071838750') {
        fail(`attach over ${type}: took ${phone.getPhoneNumber().formatE164()} from the element`);
      }
      phone.destroy();
      cleanup();
    }

    // An element the widget cannot drive says so instead of attaching.
    const { input: wrongElement, cleanup: cleanupWrong } = attach();
    wrongElement.type = 'number';
    checks++;
    try {
      createPhoneInput({ input: wrongElement, mode: 'national', defaultRegion: 'US' });
      fail('an input of type number attached without a word');
    } catch {
      // The widget names the element type it needs.
    }
    cleanupWrong();

    // 11. The region list's own surface.
    const list = createRegionList({ prioritize: ['GB', 'US'], sort: 'callingCode', locale: 'de' });
    checks++;
    const listState = list.getState();
    if (listState.options[0]?.region !== 'GB' || listState.options[1]?.region !== 'US') {
      fail(
        `the pinned regions came back as ${listState.options
          .slice(0, 2)
          .map((option) => option.region)
          .join()}`,
      );
    }
    if (list.getOption('DE')?.displayName !== new Intl.DisplayNames(['de'], { type: 'region' }).of('DE')) {
      fail(`the German name of DE came back as ${list.getOption('DE')?.displayName}`);
    }
    if (list.getOption('ZZ' as never) !== undefined) fail('an unknown region returned an option');
    list.setRegionFilter(['DE', 'FR']);
    if (list.getState().options.length !== 2)
      fail(`a filter of two regions left ${list.getState().options.length} rows`);
    list.setRegionFilter(null);
    if (list.getState().options.length !== listState.options.length) fail('clearing the filter changed the row count');
    list.destroy();

    expect(problems).toEqual([]);
    expect(checks).toBeGreaterThan(1500);
  }, 120_000);
});
