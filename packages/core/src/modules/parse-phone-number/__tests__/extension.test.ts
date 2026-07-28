import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '..';
import { createNationalInputController } from '../../input-controller/national-input-controller';

const US_BASE = '415 555 0132';
const US_E164 = '+14155550132';

describe('parsePhoneNumber: extension capture (libphonenumber maybeStripExtension)', () => {
  // One case per notation branch of the extension pattern, all verified against Google.
  const NOTATIONS: readonly (readonly [string, string])[] = [
    [`+1 ${US_BASE} ext. 22`, '22'],
    [`+1 ${US_BASE} ext 22`, '22'],
    [`+1 ${US_BASE} extension 22`, '22'],
    [`+1 ${US_BASE} x22`, '22'],
    [`+1 ${US_BASE} X22`, '22'],
    [`+1 ${US_BASE} #22`, '22'],
    [`+1 ${US_BASE} int. 22`, '22'],
    [`+1 ${US_BASE} \u0434\u043E\u0431. 22`, '22'],
    [`${US_BASE};ext=22`, '22'],
    [`${US_BASE},22`, '22'],
    [`${US_BASE},,22`, '22'],
    [`${US_BASE}~22`, '22'],
    [`${US_BASE} - 503#`, '503'],
  ];

  it.each(NOTATIONS)('captures %s', (input, extension) => {
    const number = parsePhoneNumber(input, { defaultRegion: 'US' });

    expect(number.getExtension()).toBe(extension);
    expect(number.isValid()).toBe(true);
    expect(number.formatE164()).toBe(US_E164);
  });

  it('returns null when no extension is present', () => {
    expect(parsePhoneNumber(US_E164).getExtension()).toBeNull();
  });

  it('leaves the validation error null for a valid base with an extension', () => {
    expect(parsePhoneNumber(`+1 ${US_BASE} ext. 22`).getValidationError()).toBeNull();
  });

  it('keeps extension digits as typed, including non-ASCII digits', () => {
    expect(parsePhoneNumber(`${US_BASE} ext. ２２`, { defaultRegion: 'US' }).getExtension()).toBe('２２');
  });

  it('drops a trailing # after the extension digits', () => {
    expect(parsePhoneNumber(`${US_BASE} ext. 22#`, { defaultRegion: 'US' }).getExtension()).toBe('22');
  });

  it('caps explicit-label extensions at twenty digits', () => {
    const twenty = '1'.repeat(20);

    expect(parsePhoneNumber(`+1 ${US_BASE} ext. ${twenty}`).getExtension()).toBe(twenty);
  });

  it('does not capture without an extension label', () => {
    const number = parsePhoneNumber(`+1 ${US_BASE}`);

    expect(number.getExtension()).toBeNull();
    expect(number.isValid()).toBe(true);
  });

  it('does not capture when no base number precedes the label', () => {
    const number = parsePhoneNumber('ext. 22', { defaultRegion: 'US' });

    expect(number.getExtension()).toBeNull();
    expect(number.isValid()).toBe(false);
  });

  it('ignores a label with no digits after it', () => {
    const number = parsePhoneNumber(`${US_BASE} ext.`, { defaultRegion: 'US' });

    expect(number.getExtension()).toBeNull();
    expect(number.isValid()).toBe(true);
  });

  it('parses a tel: URI and returns to it through formatRfc3966', () => {
    const number = parsePhoneNumber('tel:+1-415-555-0132;ext=22');

    expect(number.getExtension()).toBe('22');
    expect(number.formatRfc3966()).toBe('tel:+1-415-555-0132;ext=22');
  });

  it('round-trips its own formatRfc3966 output', () => {
    const uri = parsePhoneNumber(`+1 ${US_BASE} ext. 22`).formatRfc3966();

    expect(uri).toBe('tel:+1-415-555-0132;ext=22');
    expect(parsePhoneNumber(uri!).getExtension()).toBe('22');
    expect(parsePhoneNumber(uri!).isValid()).toBe(true);
  });

  it('keeps the extension out of formatE164 and the digit queries', () => {
    const number = parsePhoneNumber(`+1 ${US_BASE} ext. 22`);

    expect(number.formatE164()).toBe(US_E164);
    expect(number.getNationalNumber()).toBe('4155550132');
  });

  it('keeps a controller-produced number extension-free', () => {
    const controller = createNationalInputController({ defaultRegion: 'US' });
    controller.insert('', '4155550132', 0, 0);

    expect(controller.getPhoneNumber().getExtension()).toBeNull();
  });
});
