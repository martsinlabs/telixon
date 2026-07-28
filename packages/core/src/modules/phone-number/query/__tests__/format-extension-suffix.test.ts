import { describe, expect, it } from 'vitest';
import { parsePhoneNumber } from '../../../parse-phone-number';

describe('extension rendering (libphonenumber maybeAppendFormattedExtension)', () => {
  // The five territories carrying preferredExtnPrefix at the pinned commit, plus the default.
  const RENDERINGS: readonly (readonly [string, string, string])[] = [
    ['+1 415 555 0132 ext. 22', '(415) 555-0132 ext. 22', '+1 415-555-0132 ext. 22'],
    ['+44 20 7183 8750 ext. 22', '020 7183 8750 x22', '+44 20 7183 8750 x22'],
    ['+51 1 3123 4567 ext. 9', '131234567 Anexo 9', '+51 131234567 Anexo 9'],
    ['+40 21 312 3456 ext. 3', '021 312 3456 int 3', '+40 21 312 3456 int 3'],
    ['+886 2 2123 4567 ext. 8', '02 2123 4567#8', '+886 2 2123 4567#8'],
    ['+598 2 123 4567 ext. 4', '2123 4567 int. 4', '+598 2123 4567 int. 4'],
  ];

  it.each(RENDERINGS)('%s', (input, national, international) => {
    const number = parsePhoneNumber(input);

    expect(number.formatNational()).toBe(national);
    expect(number.formatInternational()).toBe(international);
  });

  it('uses the calling code main region prefix for a shared calling code', () => {
    // Guernsey shares +44; the prefix comes from GB, the calling code's main region.
    expect(parsePhoneNumber('+44 1481 256789 ext. 5').formatNational()).toBe('01481 256789 x5');
  });

  it('keeps the RFC 3966 parameter form regardless of the territory prefix', () => {
    expect(parsePhoneNumber('+44 20 7183 8750 ext. 22').formatRfc3966()).toBe('tel:+44-20-7183-8750;ext=22');
  });

  it('renders nothing extra without an extension', () => {
    expect(parsePhoneNumber('+44 20 7183 8750').formatNational()).toBe('020 7183 8750');
  });
});
