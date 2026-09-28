import { getExampleNumber } from '@telixon/core/testing';
import { describe, expect, it } from 'vitest';
import { readInternationalPaste } from '../read-international-paste';

const GB_MOBILE = getExampleNumber('GB', 'MOBILE');
const read = (text: string): string | null => readInternationalPaste(text, -1, null, null)?.text ?? null;

describe('readInternationalPaste', () => {
  it('reads the calling code and the national number of a complete number', () => {
    expect(read('+44 ' + GB_MOBILE)).toBe('+44' + GB_MOBILE);
  });

  it('drops a written trunk prefix', () => {
    expect(read('+44 (0)20 7183 8750')).toBe('+442071838750');
  });

  it('drops an extension in either notation', () => {
    expect(read('+44 20 7183 8750 ext. 123')).toBe('+442071838750');
    expect(read('+44 20 7183 8750;ext=123')).toBe('+442071838750');
  });

  it('reads a number that is still incomplete', () => {
    expect(read('+44 20')).toBe('+4420');
  });

  it('reads leading whitespace before the plus', () => {
    expect(read('  +44 ' + GB_MOBILE + '\n')).toBe('+44' + GB_MOBILE);
  });

  it('carries the snapshot of the number it read', () => {
    const pasted = readInternationalPaste('+44 ' + GB_MOBILE, -1, null, null);

    expect(pasted?.snapshot.callingCodeDigits).toBe('44');
    expect(pasted?.snapshot.nationalDigits).toBe(GB_MOBILE);
  });

  it('skips whatever a clipboard puts before the plus', () => {
    expect(read('tel:+44' + GB_MOBILE)).toBe('+44' + GB_MOBILE);
    expect(read('Phone: +44 ' + GB_MOBILE)).toBe('+44' + GB_MOBILE);
    expect(read('Call us at +44 ' + GB_MOBILE + ' today')).toBe('+44' + GB_MOBILE);
    expect(read('"+44 ' + GB_MOBILE + '"')).toBe('+44' + GB_MOBILE);
    expect(read('\u202b+44' + GB_MOBILE + '\u202c')).toBe('+44' + GB_MOBILE);
    expect(read('\ufeff+44' + GB_MOBILE)).toBe('+44' + GB_MOBILE);
  });

  it('reads the fullwidth plus', () => {
    expect(read('\uff0b44' + GB_MOBILE)).toBe('+44' + GB_MOBILE);
  });

  it('reads the digit scripts google/libphonenumber maps', () => {
    expect(read('+\uff14\uff14\uff17\uff14\uff10\uff10\uff11\uff12\uff13\uff14\uff15\uff16')).toBe('+447400123456');
    expect(read('+\u0664\u0664\u0667\u0664\u0660\u0660\u0661\u0662\u0663\u0664\u0665\u0666')).toBe('+447400123456');
    expect(read('+\u06f4\u06f4\u06f7\u06f4\u06f0\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6')).toBe('+447400123456');
  });

  it('leaves text whose first number character is a digit to the edit path', () => {
    expect(read('02071838750')).toBeNull();
    expect(read('Phone: 020 7183 8750')).toBeNull();
    expect(read('555-1234 or +44 20 7183 8750')).toBeNull();
  });

  it('leaves a calling code without a national part to the edit path', () => {
    expect(read('+1')).toBeNull();
    expect(read('+44')).toBeNull();
    expect(read('+')).toBeNull();
    expect(read('')).toBeNull();
  });

  it('leaves an unreachable calling code to the edit path', () => {
    expect(read('+999 123')).toBeNull();
    expect(read('+0 123')).toBeNull();
  });
});
