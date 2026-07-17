import { RegionCode } from '@telixon/core/engine';
import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { getCallingCodeForRegion } from '../../calling-code-for-region';
import { parsePhoneNumber } from '../../parse-phone-number';
import { PhoneNumber } from '../../phone-number';
import { createInternationalInputController } from '../international-input-controller';
import { InputController } from '../models';
import { createNationalInputController } from '../national-input-controller';

// PhoneNumber self-coherence across controller modes and filters; only national mode may pair a valid number with the NATIONAL_PREFIX_MISSING advisory.

type ControllerMode = 'national' | 'international' | 'selector';

const QUERY_METHODS = [
  'isValid',
  'isPossible',
  'isPossibleWithReason',
  'getValidationError',
  'getRegion',
  'getNumberType',
  'getCallingCode',
  'getNationalNumber',
  'formatE164',
  'formatNational',
  'formatInternational',
  'formatRfc3966',
] as const;

const UA_MOBILE = getExampleNumber('UA', 'MOBILE');
const CA_NUMBER = getExampleNumber('CA', 'FIXED_LINE');
const US_TOLL_FREE = getExampleNumber('US', 'TOLL_FREE');
const BY_MOBILE = getExampleNumber('BY', 'MOBILE');
const AU_MOBILE = getExampleNumber('AU', 'MOBILE');
const GG_MOBILE = getExampleNumber('GG', 'MOBILE');

function queryAnswers(phoneNumber: PhoneNumber): Record<string, unknown> {
  const answers: Record<string, unknown> = {};
  for (const method of QUERY_METHODS) {
    answers[method] = (phoneNumber as unknown as Record<string, () => unknown>)[method]!();
  }
  return answers;
}

function expectCoherent(
  phoneNumber: PhoneNumber,
  mode: ControllerMode,
  allowedRegions: readonly RegionCode[] | null = null,
): void {
  const validationError = phoneNumber.getValidationError();

  if (phoneNumber.isValid()) {
    expect(phoneNumber.isPossible()).toBe(true);
    expect(phoneNumber.getRegion()).not.toBeNull();
    if (mode === 'national' && validationError !== null) {
      expect(validationError.kind).toBe('NATIONAL_PREFIX_MISSING');
    }
    if (mode !== 'national') {
      expect(validationError).toBeNull();
    }
  } else {
    expect(validationError).not.toBeNull();
  }

  if (validationError?.kind === 'INVALID_LENGTH') {
    expect(validationError.possibleLengths.length).toBeGreaterThan(0);
  }
  if (validationError?.kind === 'NATIONAL_PREFIX_PRESENT') {
    expect(phoneNumber.isValid()).toBe(false);
    expect(mode).toBe('selector');
  }
  if (validationError?.kind === 'TOO_SHORT') {
    expect(validationError.minLength).toBeGreaterThan(phoneNumber.getNationalNumber().length);
  }
  if (validationError?.kind === 'TOO_LONG') {
    expect(validationError.maxLength).toBeLessThan(phoneNumber.getNationalNumber().length);
  }

  expect(phoneNumber.formatE164() !== null).toBe(phoneNumber.isPossible());

  const region = phoneNumber.getRegion();
  if (allowedRegions !== null && region !== null) {
    expect(allowedRegions).toContain(region);
  }
}

function createSelectorController(region: RegionCode): InputController {
  return createInternationalInputController({ defaultRegion: region, display: { callingCodeInInput: false } });
}

describe('Selector mode resolves the field as an international significant number', () => {
  it('accepts the national significant number without a trunk prefix', () => {
    const controller = createSelectorController('UA');
    controller.setValue(UA_MOBILE);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.isValid()).toBe(true);
    expect(phoneNumber.getValidationError()).toBeNull();
    expect(phoneNumber.formatE164()).toBe(`+380${UA_MOBILE}`);
  });

  it('rejects the same number typed with the trunk prefix', () => {
    const controller = createSelectorController('UA');
    controller.setValue(`0${UA_MOBILE}`);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.isValid()).toBe(false);
    expect(phoneNumber.getValidationError()).toEqual({ kind: 'NATIONAL_PREFIX_PRESENT', prefix: '0' });
  });

  it('rejects a NANP number typed with the redundant leading 1', () => {
    const controller = createSelectorController('CA');
    controller.setValue(`1${CA_NUMBER}`);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.isValid()).toBe(false);
    expect(phoneNumber.getValidationError()).toEqual({ kind: 'NATIONAL_PREFIX_PRESENT', prefix: '1' });
  });

  it('reports the exact dropped chunk for a compound national prefix', () => {
    const controller = createSelectorController('BY');
    controller.setValue(`80${BY_MOBILE}`);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.getValidationError()).toEqual({ kind: 'NATIONAL_PREFIX_PRESENT', prefix: '80' });
  });

  it('reports the exact dropped chunk for a typed carrier code', () => {
    const controller = createSelectorController('AU');
    controller.setValue(`1831${AU_MOBILE}`);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.getValidationError()).toEqual({ kind: 'NATIONAL_PREFIX_PRESENT', prefix: '1831' });
  });

  it('keeps digit-rewriting local dialing forms out of the prefix error', () => {
    const controller = createSelectorController('AR');
    controller.setValue('0111523456789');
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.getValidationError()?.kind).toBe('TOO_LONG');
  });

  it('keeps TOO_SHORT while a trunk-prefixed number is still incomplete', () => {
    const controller = createSelectorController('UA');
    controller.setValue('0');
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.getValidationError()?.kind).toBe('TOO_SHORT');
  });

  it('reports TOO_SHORT for the empty field', () => {
    const controller = createSelectorController('UA');
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector');
    expect(phoneNumber.getValidationError()?.kind).toBe('TOO_SHORT');
  });

  it('answers every query exactly like parsePhoneNumber of the calling code plus the displayed value', () => {
    const inputs: ReadonlyArray<readonly [RegionCode, string]> = [
      ['UA', UA_MOBILE],
      ['CA', CA_NUMBER],
    ];

    for (const [region, input] of inputs) {
      const controller = createSelectorController(region);
      const { value } = controller.setValue(input);
      const callingCode: string = getCallingCodeForRegion(region);

      expect(queryAnswers(controller.getPhoneNumber())).toEqual(
        queryAnswers(parsePhoneNumber(`+${callingCode}${value}`)),
      );
    }
  });
});

describe('Region filters keep every query coherent', () => {
  it('keeps a number valid when the filter allows its region', () => {
    const selector = createSelectorController('CA');
    selector.setValue(CA_NUMBER);

    const international = createInternationalInputController({});
    international.setValue(`+1${CA_NUMBER}`);

    const national = createNationalInputController({ defaultRegion: 'US' });
    national.setValue(CA_NUMBER);

    const controllers: ReadonlyArray<readonly [InputController, ControllerMode]> = [
      [selector, 'selector'],
      [international, 'international'],
      [national, 'national'],
    ];

    for (const [controller, mode] of controllers) {
      controller.setRegionFilter(['CA']);
      const phoneNumber = controller.getPhoneNumber();

      expectCoherent(phoneNumber, mode, ['CA']);
      expect(phoneNumber.isValid()).toBe(true);
      expect(phoneNumber.getValidationError()).toBeNull();
      expect(phoneNumber.getRegion()).toBe('CA');
      expect(phoneNumber.formatE164()).toBe(`+1${CA_NUMBER}`);
    }
  });

  it('rejects a number whose region the filter excludes with PATTERN_MISMATCH', () => {
    const controller = createInternationalInputController({});
    controller.setValue(`+1${CA_NUMBER}`);
    controller.setRegionFilter(['US']);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'international', ['US']);
    expect(phoneNumber.isValid()).toBe(false);
    expect(phoneNumber.getValidationError()?.kind).toBe('PATTERN_MISMATCH');
    expect(phoneNumber.getRegion()).toBeNull();
  });

  it('resolves a shared-pattern number to the allowed region', () => {
    const controller = createInternationalInputController({});
    controller.setValue(`+1${US_TOLL_FREE}`);
    controller.setRegionFilter(['CA']);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'international', ['CA']);
    expect(phoneNumber.isValid()).toBe(true);
    expect(phoneNumber.getRegion()).toBe('CA');
    expect(phoneNumber.getNumberType()).toBe('TOLL_FREE');
  });

  it('reports TOO_SHORT while the number is incomplete under a filter', () => {
    const controller = createSelectorController('CA');
    controller.setValue(CA_NUMBER.slice(0, 6));
    controller.setRegionFilter(['CA']);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'selector', ['CA']);
    expect(phoneNumber.getValidationError()?.kind).toBe('TOO_SHORT');
  });

  it('bounds the length verdicts by the allowed regions of the calling code', () => {
    // Christmas Island has no 5-digit numbers; Australia does.
    const australia = createSelectorController('AU');
    australia.setValue(AU_MOBILE.slice(0, 5));
    australia.setRegionFilter(['CX']);
    const shortNumber = australia.getPhoneNumber();

    expectCoherent(shortNumber, 'selector', ['CX']);
    expect(shortNumber.getValidationError()).toEqual({ kind: 'TOO_SHORT', minLength: 6 });

    // Guernsey has a length gap at 8 digits; Great Britain does not.
    const britain = createSelectorController('GB');
    britain.setValue(GG_MOBILE.slice(0, 8));
    britain.setRegionFilter(['GG']);
    const gapNumber = britain.getPhoneNumber();

    expectCoherent(gapNumber, 'selector', ['GG']);
    expect(gapNumber.getValidationError()).toEqual({ kind: 'INVALID_LENGTH', possibleLengths: [7, 9, 10] });
  });

  it('reports INVALID_CALLING_CODE when the filter excludes every region of the calling code', () => {
    const selector = createSelectorController('UA');
    selector.setValue(UA_MOBILE);

    const international = createInternationalInputController({});
    international.setValue(`+380${UA_MOBILE}`);

    const controllers: ReadonlyArray<readonly [InputController, ControllerMode]> = [
      [selector, 'selector'],
      [international, 'international'],
    ];

    for (const [controller, mode] of controllers) {
      controller.setRegionFilter(['US']);
      const phoneNumber = controller.getPhoneNumber();

      expectCoherent(phoneNumber, mode, ['US']);
      expect(phoneNumber.isValid()).toBe(false);
      expect(phoneNumber.getValidationError()?.kind).toBe('INVALID_CALLING_CODE');
      expect(phoneNumber.formatE164()).toBeNull();
    }
  });
});

describe('Number type filters keep every query coherent', () => {
  it('rejects an excluded type with PATTERN_MISMATCH', () => {
    const controller = createNationalInputController({ defaultRegion: 'UA' });
    controller.setValue(`0${UA_MOBILE}`);
    controller.setNumberTypeFilter(['FIXED_LINE']);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'national');
    expect(phoneNumber.isValid()).toBe(false);
    expect(phoneNumber.getValidationError()?.kind).toBe('PATTERN_MISMATCH');
  });

  it('reports INVALID_CALLING_CODE when the region has none of the allowed types', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.setValue(CA_NUMBER);
    controller.setNumberTypeFilter(['SHARED_COST']);
    const phoneNumber = controller.getPhoneNumber();

    expectCoherent(phoneNumber, 'national');
    expect(phoneNumber.isValid()).toBe(false);
    expect(phoneNumber.getValidationError()?.kind).toBe('INVALID_CALLING_CODE');
  });
});
