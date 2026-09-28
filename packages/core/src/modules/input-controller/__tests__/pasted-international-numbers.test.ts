import { MetadataNumberType, RegionCode } from '@telixon/core/engine';
import { getResourceProvider } from '@telixon/core/resource-provider';
import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { getCallingCodeForRegion } from '../../calling-code-for-region';
import { parsePhoneNumber } from '../../parse-phone-number';
import { PhoneNumber } from '../../phone-number';
import { createInternationalInputController } from '../international-input-controller';
import { InputController } from '../models';
import { createNationalInputController } from '../national-input-controller';

// Every region's example number pasted in international form lands in every field mode as the
// same number parsePhoneNumber reads from that text.

type Example = {
  readonly region: RegionCode;
  readonly text: string;
  readonly parsed: PhoneNumber;
};

function exampleOf(region: RegionCode): string | null {
  for (const type of ['MOBILE', 'FIXED_LINE'] as const satisfies readonly MetadataNumberType[]) {
    try {
      return getExampleNumber(region, type);
    } catch {
      continue;
    }
  }
  return null;
}

function collectDigits(value: string): string {
  return value.replace(/\D/g, '');
}

const examples: Example[] = [];
for (const region of getResourceProvider().regionIds) {
  const national: string | null = exampleOf(region);
  if (national === null) continue;
  const text: string = `+${getCallingCodeForRegion(region)} ${national}`;
  const parsed: PhoneNumber = parsePhoneNumber(text);
  if (!parsed.isValid()) continue;
  examples.push({ region, text, parsed });
}

function otherRegion(region: RegionCode): RegionCode {
  return region === 'US' ? 'GB' : 'US';
}

function expectSameNumber(controller: InputController, parsed: PhoneNumber): void {
  const phoneNumber: PhoneNumber = controller.getPhoneNumber();
  expect(phoneNumber.isValid()).toBe(true);
  expect(phoneNumber.formatE164()).toBe(parsed.formatE164());
}

describe('Pasted international numbers across every region', () => {
  it('covers the geographic regions', () => {
    expect(examples.length).toBeGreaterThan(200);
  });

  it('move a field with the calling code outside to the number', () => {
    for (const { region, text, parsed } of examples) {
      const controller = createInternationalInputController({
        defaultRegion: otherRegion(region),
        display: { callingCodeInInput: false },
      });
      const state = controller.insert('', text, 0, 0);

      expect(state.region, text).toBe(parsed.getRegion());
      expectSameNumber(controller, parsed);
    }
  });

  it('replace the seeded calling code of a field with the calling code inside', () => {
    for (const { region, text, parsed } of examples) {
      const controller = createInternationalInputController({ defaultRegion: otherRegion(region) });
      const seeded = controller.currentState;
      const state = controller.insert(seeded.value, text, seeded.value.length, seeded.value.length);

      expect(state.region, text).toBe(parsed.getRegion());
      expectSameNumber(controller, parsed);
    }
  });

  it("enter a national field of the number's region in its national format", () => {
    for (const { text, parsed } of examples) {
      const region: RegionCode | null = parsed.getRegion();
      if (region === null) continue;
      const controller = createNationalInputController({ defaultRegion: region });
      const state = controller.insert('', text, 0, 0);

      expect(collectDigits(state.value), text).toBe(collectDigits(parsed.formatNational() ?? ''));
      expectSameNumber(controller, parsed);
    }
  });
});

describe('Digits a clipboard carries in another script', () => {
  const GB_DIGITS = '447400123456';
  const inScript = (digits: string, zero: number): string =>
    [...digits].map((digit) => String.fromCharCode(zero + Number(digit))).join('');

  it.each([
    ['fullwidth', 0xff10],
    ['arabic-indic', 0x0660],
    ['extended arabic-indic', 0x06f0],
  ])('pastes a number written in %s digits', (_name, zero) => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', `+${inScript(GB_DIGITS, zero)}`, 0, 0);

    expect(state.region).toBe('GB');
    expect(state.value).toBe('7400 123456');
    expect(controller.getPhoneNumber().formatE164()).toBe('+447400123456');
  });

  it('types a fullwidth digit the way an input method sends it', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    let state = controller.currentState;
    for (const digit of inScript('2015550123', 0xff10)) {
      state = controller.insert(state.value, digit, state.selectionStart, state.selectionEnd);
    }

    expect(state.value).toBe('(201) 555-0123');
    expect(controller.getPhoneNumber().formatE164()).toBe('+12015550123');
  });

  it('leaves a script google/libphonenumber does not map unread', () => {
    const controller = createInternationalInputController({
      defaultRegion: 'US',
      display: { callingCodeInInput: false },
    });
    const state = controller.insert('', `+${inScript(GB_DIGITS, 0x0966)}`, 0, 0);

    expect(state.value).toBe('');
  });
});
